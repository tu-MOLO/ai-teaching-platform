import ipaddress
import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from urllib.parse import urlparse

from app.models.ai_config import AIConfig
from app.schemas.ai_config import AIConfigResponse, AIConfigUpdate, AIConfigTestRequest, AIConfigTestResponse
from app.core.config import settings
from app.core.security import encrypt_api_key, decrypt_api_key, mask_api_key
from app.core.logging import get_logger
from app.core.exceptions import BadRequestException

logger = get_logger(__name__)

ALLOWED_API_DOMAINS = {
    "open.bigmodel.cn", "api.openai.com", "api.deepseek.com",
    "api.moonshot.cn", "dashscope.aliyuncs.com",
}


def _validate_api_base_url(api_base: str) -> None:
    parsed = urlparse(api_base)
    hostname = parsed.hostname
    if not hostname:
        raise BadRequestException("API地址格式无效")
    if hostname in ALLOWED_API_DOMAINS:
        return
    try:
        resolved = ipaddress.ip_address(hostname)
        if resolved.is_private or resolved.is_loopback or resolved.is_link_local or resolved.is_reserved:
            raise BadRequestException("API地址不允许指向内部网络")
    except ValueError:
        pass
    if hostname in ("localhost", "127.0.0.1", "0.0.0.0", "::1"):
        raise BadRequestException("API地址不允许指向本地主机")

PROVIDER_DEFAULTS = {
    "zhipu": {
        "name": "智谱 AI (Zhipu)",
        "api_base": "https://open.bigmodel.cn/api/paas/v4",
        "models": ["glm-4.7-flash", "glm-4.7-flashx", "glm-4.5-air", "glm-4.5-flash"],
    },
    "openai": {
        "name": "OpenAI",
        "api_base": "https://api.openai.com/v1",
        "models": ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
    },
    "deepseek": {
        "name": "DeepSeek",
        "api_base": "https://api.deepseek.com/v1",
        "models": ["deepseek-chat", "deepseek-coder"],
    },
    "moonshot": {
        "name": "Moonshot (月之暗面)",
        "api_base": "https://api.moonshot.cn/v1",
        "models": ["moonshot-v1-8k", "moonshot-v1-32k", "moonshot-v1-128k"],
    },
    "qwen": {
        "name": "通义千问 (阿里云)",
        "api_base": "https://dashscope.aliyuncs.com/compatible-mode/v1",
        "models": ["qwen-turbo", "qwen-plus", "qwen-max"],
    },
    "custom": {
        "name": "自定义服务商",
        "api_base": "",
        "models": [],
    },
}


class AIConfigService:

    @staticmethod
    async def get_user_config(db: AsyncSession, user_id: str) -> AIConfigResponse:
        result = await db.execute(select(AIConfig).where(AIConfig.user_id == user_id))
        config = result.scalar_one_or_none()

        if config:
            decrypted_key = decrypt_api_key(
                config.api_key_encrypted) if config.api_key_encrypted else None
            return AIConfigResponse(
                provider=config.provider,
                provider_name=config.provider_name,
                api_base=config.api_base,
                model=config.model,
                api_key=mask_api_key(decrypted_key) if decrypted_key else None,
                is_active=config.is_active,
                is_user_configured=True,
            )

        return AIConfigResponse(
            provider="zhipu",
            provider_name=None,
            api_base=settings.BIGMODEL_API_BASE,
            model=settings.BIGMODEL_MODEL,
            api_key=mask_api_key(settings.BIGMODEL_API_KEY) if settings.BIGMODEL_API_KEY else None,
            is_active=True,
            is_user_configured=False,
        )

    @staticmethod
    async def save_config(
    db: AsyncSession,
    user_id: str,
     config_update: AIConfigUpdate) -> AIConfigResponse:
        result = await db.execute(select(AIConfig).where(AIConfig.user_id == user_id))
        config = result.scalar_one_or_none()

        if not config:
            config = AIConfig(
                user_id=user_id,
                provider=config_update.provider or "zhipu",
                provider_name=config_update.provider_name,
                api_base=config_update.api_base or settings.BIGMODEL_API_BASE,
                model=config_update.model or settings.BIGMODEL_MODEL,
            )
            db.add(config)

        if config_update.provider is not None:
            config.provider = config_update.provider
        if config_update.provider_name is not None:
            config.provider_name = config_update.provider_name
        if config_update.api_base is not None:
            config.api_base = config_update.api_base
        if config_update.model is not None:
            config.model = config_update.model
        if config_update.api_key is not None:
            if config_update.api_key == "":
                config.api_key_encrypted = None
            else:
                config.api_key_encrypted = encrypt_api_key(config_update.api_key)

        await db.commit()
        await db.refresh(config)

        return await AIConfigService.get_user_config(db, user_id)

    @staticmethod
    async def reset_config(db: AsyncSession, user_id: str) -> AIConfigResponse:
        result = await db.execute(select(AIConfig).where(AIConfig.user_id == user_id))
        config = result.scalar_one_or_none()
        if config:
            await db.delete(config)
            await db.commit()
        return await AIConfigService.get_user_config(db, user_id)

    @staticmethod
    async def test_connection(
    db: AsyncSession,
    user_id: str,
     test_request: AIConfigTestRequest = None) -> AIConfigTestResponse:
        if test_request and test_request.api_key:
            api_key = test_request.api_key
            api_base = test_request.api_base or settings.BIGMODEL_API_BASE
            model = test_request.model or settings.BIGMODEL_MODEL
        else:
            effective = await AIConfigService.get_effective_config(db, user_id)
            if not effective:
                return AIConfigTestResponse(success=False, message="未配置API密钥，请先在设置中配置API密钥")
            api_key = effective["api_key"]
            api_base = effective["api_base"]
            model = effective["model"]

        try:
            _validate_api_base_url(api_base)
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(
                    f"{api_base}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": model,
                        "messages": [{"role": "user", "content": "Hi"}],
                        "max_tokens": 5,
                        "stream": False,
                    },
                )
                if response.status_code == 200:
                    return AIConfigTestResponse(success=True, message="连接成功，API密钥有效")
                elif response.status_code == 429:
                    return AIConfigTestResponse(success=True, message="连接成功（API返回速率限制，密钥有效，请稍后再试）")
                elif response.status_code == 401:
                    return AIConfigTestResponse(success=False, message="认证失败，请检查API密钥是否正确")
                else:
                    error_data = response.json() if response.headers.get(
                        "content-type", "").startswith("application/json") else {}
                    error_msg = error_data.get("error", {}).get(
                        "message", f"HTTP {response.status_code}")
                    return AIConfigTestResponse(success=False, message=f"连接失败: {error_msg}")
        except httpx.TimeoutException:
            return AIConfigTestResponse(success=False, message="连接超时，请检查网络或API地址")
        except Exception as e:
            logger.error(f"API connection test failed: {e}")
            return AIConfigTestResponse(success=False, message=f"连接失败: {str(e)[:100]}")

    @staticmethod
    async def get_effective_config(db: AsyncSession, user_id: str) -> dict | None:
        result = await db.execute(select(AIConfig).where(AIConfig.user_id == user_id))
        config = result.scalar_one_or_none()

        if config and config.api_key_encrypted:
            api_key = decrypt_api_key(config.api_key_encrypted)
            return {
                "api_key": api_key,
                "api_base": config.api_base,
                "model": config.model,
            }

        if settings.BIGMODEL_API_KEY:
            return {
                "api_key": settings.BIGMODEL_API_KEY,
                "api_base": settings.BIGMODEL_API_BASE,
                "model": settings.BIGMODEL_MODEL,
            }

        return None

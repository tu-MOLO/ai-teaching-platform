import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ai_config import AIConfig
from app.schemas.ai_config import AIConfigResponse, AIConfigUpdate, AIConfigTestRequest, AIConfigTestResponse
from app.core.config import settings
from app.core.security import encrypt_api_key, decrypt_api_key, mask_api_key
from app.core.logging import get_logger

logger = get_logger(__name__)

PROVIDER_DEFAULTS = {
    "zhipu": {
        "api_base": "https://open.bigmodel.cn/api/paas/v4",
        "models": ["glm-4.7-flash", "glm-4.7-flashx", "glm-4.5-air", "glm-4.5-flash"],
    },
}


class AIConfigService:

    @staticmethod
    async def get_user_config(db: AsyncSession, user_id: str) -> AIConfigResponse:
        result = await db.execute(select(AIConfig).where(AIConfig.user_id == user_id))
        config = result.scalar_one_or_none()

        if config:
            decrypted_key = decrypt_api_key(config.api_key_encrypted) if config.api_key_encrypted else None
            return AIConfigResponse(
                provider=config.provider,
                api_base=config.api_base,
                model=config.model,
                api_key=mask_api_key(decrypted_key) if decrypted_key else None,
                is_active=config.is_active,
                is_user_configured=True,
            )

        return AIConfigResponse(
            provider="zhipu",
            api_base=settings.BIGMODEL_API_BASE,
            model=settings.BIGMODEL_MODEL,
            api_key=mask_api_key(settings.BIGMODEL_API_KEY) if settings.BIGMODEL_API_KEY else None,
            is_active=True,
            is_user_configured=False,
        )

    @staticmethod
    async def save_config(db: AsyncSession, user_id: str, config_update: AIConfigUpdate) -> AIConfigResponse:
        result = await db.execute(select(AIConfig).where(AIConfig.user_id == user_id))
        config = result.scalar_one_or_none()

        if not config:
            config = AIConfig(
                user_id=user_id,
                provider=config_update.provider or "zhipu",
                api_base=config_update.api_base or settings.BIGMODEL_API_BASE,
                model=config_update.model or settings.BIGMODEL_MODEL,
            )
            db.add(config)

        if config_update.provider is not None:
            config.provider = config_update.provider
        if config_update.api_base is not None:
            config.api_base = config_update.api_base
        if config_update.model is not None:
            config.model = config_update.model
        if config_update.api_key is not None:
            if config_update.api_key == "":
                config.api_key_encrypted = None
            else:
                config.api_key_encrypted = encrypt_api_key(config_update.api_key)

        await db.flush()
        await db.refresh(config)

        return await AIConfigService.get_user_config(db, user_id)

    @staticmethod
    async def reset_config(db: AsyncSession, user_id: str) -> AIConfigResponse:
        result = await db.execute(select(AIConfig).where(AIConfig.user_id == user_id))
        config = result.scalar_one_or_none()
        if config:
            await db.delete(config)
            await db.flush()
        return await AIConfigService.get_user_config(db, user_id)

    @staticmethod
    async def test_connection(db: AsyncSession, user_id: str, test_request: AIConfigTestRequest = None) -> AIConfigTestResponse:
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
                else:
                    error_data = response.json() if response.headers.get("content-type", "").startswith("application/json") else {}
                    error_msg = error_data.get("error", {}).get("message", f"HTTP {response.status_code}")
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

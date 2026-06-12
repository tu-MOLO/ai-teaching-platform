"""
配置验证模块
确保生产环境配置安全合规
"""
import re
import secrets
import string
from typing import List, Tuple

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class ConfigValidationError(Exception):
    """配置验证错误"""


class ConfigValidator:
    """配置验证器"""

    # 最小密钥长度
    MIN_SECRET_KEY_LENGTH = 32

    # 弱密钥模式（不应在生产环境使用）
    # 使用全词匹配，避免误判正常密钥中包含这些常见单词子串的情况
    WEAK_SECRET_PATTERNS = [
        r'^password$',
        r'^secret$',
        r'^123456$',
        r'^qwerty$',
        r'^admin$',
        r'^change$',
        r'^default$',
        r'^test$',
        r'^example$',
        r'^your-$',
        r'^min-32',
    ]

    @staticmethod
    def validate_secret_key(secret_key: str) -> Tuple[bool, List[str]]:
        """
        验证 SECRET_KEY 强度

        Args:
            secret_key: 密钥字符串

        Returns:
            (是否有效, 错误信息列表)
        """
        errors = []

        # 检查长度
        if len(secret_key) < ConfigValidator.MIN_SECRET_KEY_LENGTH:
            errors.append(
                f"SECRET_KEY 长度不足: 当前 {len(secret_key)} 字符, "
                f"需要至少 {ConfigValidator.MIN_SECRET_KEY_LENGTH} 字符"
            )

        # 检查是否包含弱密钥模式（全词匹配）
        secret_lower = secret_key.lower()
        for pattern in ConfigValidator.WEAK_SECRET_PATTERNS:
            if re.search(pattern, secret_lower):
                errors.append(f"SECRET_KEY 包含弱密钥模式: '{pattern}'")

        # 检查熵值（字符多样性）
        has_lower = any(c.islower() for c in secret_key)
        has_upper = any(c.isupper() for c in secret_key)
        has_digit = any(c.isdigit() for c in secret_key)
        has_special = any(c in string.punctuation for c in secret_key)

        entropy_score = sum([has_lower, has_upper, has_digit, has_special])
        if entropy_score < 3:
            errors.append(
                f"SECRET_KEY 复杂度不足: 需要包含大写字母、小写字母、数字和特殊字符中的至少3种"
            )

        return len(errors) == 0, errors

    @staticmethod
    def validate_database_url(database_url: str) -> Tuple[bool, List[str]]:
        """
        验证数据库 URL

        Args:
            database_url: 数据库连接字符串

        Returns:
            (是否有效, 错误信息列表)
        """
        errors = []

        # 检查是否使用弱密码
        weak_db_passwords = ['password', '123456', 'admin', 'postgres', 'changeme']
        url_lower = database_url.lower()

        for weak_pwd in weak_db_passwords:
            if weak_pwd in url_lower:
                errors.append(f"数据库密码过于简单，不应包含: '{weak_pwd}'")

        # 检查是否使用 SSL（生产环境建议）
        if 'sslmode' not in database_url and 'postgresql' in database_url:
            logger.warning("数据库连接未启用 SSL，生产环境建议使用 sslmode=require")

        return len(errors) == 0, errors

    @staticmethod
    def validate_production_settings() -> None:
        """
        验证生产环境配置

        Raises:
            ConfigValidationError: 配置验证失败时抛出
        """
        errors = []

        # 1. 检查 DEBUG 模式
        if settings.DEBUG:
            errors.append(
                "生产环境必须设置 DEBUG=false，"
                "当前 DEBUG=true 会导致安全风险（信息泄露、DEBUG 后门等）"
            )

        # 2. 验证 SECRET_KEY
        key_valid, key_errors = ConfigValidator.validate_secret_key(settings.SECRET_KEY)
        if not key_valid:
            errors.extend(key_errors)

        # 3. 验证数据库配置
        db_valid, db_errors = ConfigValidator.validate_database_url(settings.DATABASE_URL)
        if not db_valid:
            errors.extend(db_errors)

        # 4. 检查 MinIO 配置
        minio_weak_keys = ['minioadmin', 'password', '123456', 'admin']
        if settings.MINIO_ACCESS_KEY in minio_weak_keys:
            errors.append(f"MinIO Access Key 过于简单: {settings.MINIO_ACCESS_KEY}")
        if settings.MINIO_SECRET_KEY in minio_weak_keys:
            errors.append("MinIO Secret Key 过于简单")

        # 5. 检查 CORS 配置
        if not settings.BACKEND_CORS_ORIGINS:
            logger.warning("CORS 配置为空，可能导致前端无法访问 API")

        # 6. 检查 Token 过期时间
        if settings.ACCESS_TOKEN_EXPIRE_MINUTES > 1440:  # 24小时
            logger.warning(
                f"Access Token 过期时间过长: {settings.ACCESS_TOKEN_EXPIRE_MINUTES} 分钟，"
                "建议不超过 60 分钟"
            )

        if settings.REFRESH_TOKEN_EXPIRE_DAYS > 30:
            logger.warning(
                f"Refresh Token 过期时间过长: {settings.REFRESH_TOKEN_EXPIRE_DAYS} 天，"
                "建议不超过 7 天"
            )

        # 如果有错误，抛出异常
        if errors:
            error_message = "生产环境配置验证失败:\n" + "\n".join(f"  - {e}" for e in errors)
            logger.error(error_message)
            raise ConfigValidationError(error_message)

        logger.info("生产环境配置验证通过")

    @staticmethod
    def validate_development_settings() -> None:
        """验证开发环境配置（仅警告）"""
        warnings = []

        # 检查 SECRET_KEY
        key_valid, key_errors = ConfigValidator.validate_secret_key(settings.SECRET_KEY)
        if not key_valid:
            warnings.extend(key_errors)

        if warnings:
            warning_message = "开发环境配置警告:\n" + "\n".join(f"  - {w}" for w in warnings)
            logger.warning(warning_message)
            logger.warning("建议在开发环境也使用强密钥，避免配置泄露风险")

    @staticmethod
    def generate_secure_secret_key(length: int = 64) -> str:
        """
        生成安全的随机密钥

        Args:
            length: 密钥长度

        Returns:
            随机密钥字符串
        """
        # 使用 secrets 模块生成加密安全的随机字符串
        alphabet = string.ascii_letters + string.digits + string.punctuation
        return ''.join(secrets.choice(alphabet) for _ in range(length))


def validate_config_on_startup() -> None:
    """
    应用启动时执行配置验证

    根据环境自动选择验证级别：
    - 生产环境：严格验证，失败时阻止启动
    - 开发环境：宽松验证，仅输出警告
    """
    if not settings.DEBUG:
        # 生产环境：严格验证
        logger.info("运行生产环境配置验证...")
        ConfigValidator.validate_production_settings()
    else:
        # 开发环境：仅警告
        logger.info("运行开发环境配置验证...")
        ConfigValidator.validate_development_settings()


# 便捷函数
def generate_secret_key() -> str:
    """生成安全密钥"""
    return ConfigValidator.generate_secure_secret_key()


def check_config_security() -> Tuple[bool, List[str]]:
    """
    检查配置安全性（不抛出异常）

    Returns:
        (是否安全, 问题列表)
    """
    issues = []

    # 检查 DEBUG
    if settings.DEBUG:
        issues.append("DEBUG 模式已启用")

    # 检查 SECRET_KEY
    key_valid, key_errors = ConfigValidator.validate_secret_key(settings.SECRET_KEY)
    if not key_valid:
        issues.extend(key_errors)

    # 检查数据库
    db_valid, db_errors = ConfigValidator.validate_database_url(settings.DATABASE_URL)
    if not db_valid:
        issues.extend(db_errors)

    return len(issues) == 0, issues

"""
应用配置模块
包含数据库、MinIO、JWT等配置
"""
from typing import List, Optional, Union
from pydantic import field_validator, AnyHttpUrl
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """应用配置类"""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

    # 应用基础配置
    APP_NAME: str = "AI Teaching Platform"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # API配置
    API_V1_STR: str = "/api/v1"

    # CORS配置
    BACKEND_CORS_ORIGINS: List[AnyHttpUrl] = []

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        """解析CORS来源配置"""
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    # 数据库配置
    DATABASE_URL: str = "sqlite+aiosqlite:///./ai_teaching.db"
    DATABASE_POOL_SIZE: int = 10
    DATABASE_MAX_OVERFLOW: int = 5
    DATABASE_POOL_RECYCLE: int = 1800

    # JWT配置
    SECRET_KEY: str = ""
    ALGORITHM: str = "HS256"

    @field_validator("SECRET_KEY", mode="after")
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        """验证SECRET_KEY不为空且长度>=32"""
        if not v:
            raise ValueError(
                "SECRET_KEY 未设置！请在 .env 文件中设置 SECRET_KEY。\n"
                "生成方式：python -c \"import secrets; print(secrets.token_urlsafe(64))\""
            )
        if len(v) < 32:
            raise ValueError(f"SECRET_KEY 长度不足: 当前 {len(v)} 字符, 需要至少 32 字符")
        return v
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # MinIO配置
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = ""
    MINIO_SECRET_KEY: str = ""
    MINIO_BUCKET_NAME: str = "ai-teaching"
    MINIO_SECURE: bool = False
    MINIO_REGION: str = "us-east-1"

    # 文件上传配置
    MAX_UPLOAD_SIZE: int = 100 * 1024 * 1024  # 100MB
    ALLOWED_EXTENSIONS: List[str] = [".pdf", ".doc", ".docx", ".txt",
        ".md", ".jpg", ".jpeg", ".png", ".gif", ".mp4", ".mp3"]

    # Redis配置（可选，用于缓存和会话）
    REDIS_URL: Optional[str] = None

    # BigModel API配置
    BIGMODEL_API_KEY: str = ""
    BIGMODEL_API_BASE: str = "https://open.bigmodel.cn/api/paas/v4"
    BIGMODEL_MODEL: str = "glm-4.7-flash"
    AI_MAX_CONTEXT_MESSAGES: int = 20

    # 日志配置
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

    # 分页配置
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100

    @property
    def sync_database_url(self) -> str:
        """获取同步数据库URL（用于Alembic迁移）"""
        # 支持SQLite和PostgreSQL
        if "sqlite" in self.DATABASE_URL:
            return self.DATABASE_URL.replace("+aiosqlite", "")
        return self.DATABASE_URL.replace("+asyncpg", "+psycopg2")

    @property
    def minio_endpoint_url(self) -> str:
        """获取MinIO端点URL"""
        protocol = "https" if self.MINIO_SECURE else "http"
        return f"{protocol}://{self.MINIO_ENDPOINT}"


# 全局配置实例
settings = Settings()

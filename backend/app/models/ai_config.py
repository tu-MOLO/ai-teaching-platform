from typing import Optional

from sqlalchemy import Boolean, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.ai import AIModelBase


class AIConfig(AIModelBase):
    __tablename__ = "ai_configs"

    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    provider: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="zhipu",
    )

    provider_name: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )

    api_base: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
        default="https://open.bigmodel.cn/api/paas/v4",
    )

    model: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="glm-4.7-flash",
    )

    api_key_encrypted: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    __table_args__ = (Index("ix_ai_configs_user_id_unique", "user_id", unique=True),)

    def __repr__(self) -> str:
        return f"<AIConfig(id={self.id}, user_id={self.user_id}, provider={self.provider})>"

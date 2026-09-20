"""
验证码模型模块
定义邮箱验证码的数据模型
"""

from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import Boolean, DateTime, Enum, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDMixin


class VerificationCodeType(str, PyEnum):
    """验证码类型枚举"""

    REGISTER = "register"  # 注册
    RESET_PASSWORD = "reset_password"  # 重置密码


class VerificationCode(Base, UUIDMixin, TimestampMixin):
    """
    验证码模型
    存储邮箱验证码信息，不继承软删除和乐观锁
    """

    __tablename__ = "verification_codes"

    email: Mapped[str] = mapped_column(String(255), index=True, nullable=False, comment="邮箱地址")

    code: Mapped[str] = mapped_column(String(10), nullable=False, comment="验证码")

    type: Mapped[VerificationCodeType] = mapped_column(
        Enum(VerificationCodeType, native_enum=False),
        nullable=False,
        comment="验证码类型",
    )

    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, comment="过期时间"
    )

    used: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, comment="是否已使用")

    def __repr__(self) -> str:
        return (
            f"<VerificationCode(id={self.id}, email={self.email},"
            f" type={self.type}, used={self.used})>"
        )

    def is_expired(self) -> bool:
        """检查验证码是否过期"""
        from datetime import timezone

        now = datetime.now(timezone.utc)
        expires_at = self.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        return now > expires_at

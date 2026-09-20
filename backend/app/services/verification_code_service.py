"""
验证码服务模块
提供验证码的生成、发送和校验功能
"""

from datetime import datetime, timedelta, timezone

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import BadRequestException
from app.models.verification_code import VerificationCode, VerificationCodeType
from app.utils.email_utils import generate_verification_code, send_verification_email


class VerificationCodeService:
    """验证码服务"""

    @staticmethod
    async def create_and_send_code(
        db: AsyncSession,
        email: str,
        code_type: VerificationCodeType,
    ) -> None:
        """生成验证码，存储到数据库，并发送邮件"""
        # 清理同一邮箱+类型的旧未使用验证码
        await db.execute(
            update(VerificationCode)
            .where(
                VerificationCode.email == email,
                VerificationCode.type == code_type,
                VerificationCode.used == False,  # noqa: E712
            )
            .values(used=True)
        )

        # 生成验证码
        code = generate_verification_code()

        # 存储到数据库
        expires_at = datetime.now(timezone.utc) + timedelta(
            minutes=settings.VERIFICATION_CODE_EXPIRE_MINUTES
        )
        vc = VerificationCode(
            email=email,
            code=code,
            type=code_type,
            expires_at=expires_at,
            used=False,
        )
        db.add(vc)
        await db.commit()

        # 发送邮件
        await send_verification_email(email, code, code_type.value)

    @staticmethod
    async def verify_code(
        db: AsyncSession,
        email: str,
        code: str,
        code_type: VerificationCodeType,
    ) -> None:
        """校验验证码，通过后标记为已使用"""
        stmt = select(VerificationCode).where(
            VerificationCode.email == email,
            VerificationCode.code == code,
            VerificationCode.type == code_type,
            VerificationCode.used == False,  # noqa: E712
        ).order_by(VerificationCode.created_at.desc())

        result = await db.execute(stmt)
        vc = result.scalars().first()

        if not vc:
            raise BadRequestException("验证码错误")

        if vc.is_expired():
            raise BadRequestException("验证码已过期，请重新发送")

        # 标记为已使用
        vc.used = True
        await db.commit()

"""
用户服务
"""
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.schemas.user import UserUpdate


class UserService:
    """用户服务类"""

    @staticmethod
    async def get(db: AsyncSession, user_id: str) -> Optional[User]:
        """
        获取用户

        Args:
            db: 数据库会话
            user_id: 用户ID

        Returns:
            用户对象，如果不存在则返回None
        """
        stmt = select(User).where(User.id == user_id, User.is_deleted == False)  # noqa: E712
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def update(db: AsyncSession, user_id: str, user_data: UserUpdate) -> Optional[User]:
        """
        更新用户资料

        Args:
            db: 数据库会话
            user_id: 用户ID
            user_data: 用户更新数据

        Returns:
            更新后的用户对象，如果不存在则返回None
        """
        user = await UserService.get(db, user_id)
        if not user:
            return None

        payload = user_data.model_dump(exclude_unset=True)

        for field, value in payload.items():
            setattr(user, field, value)

        await db.commit()
        await db.refresh(user)
        return user

    @staticmethod
    async def verify_ownership(db: AsyncSession, user_id: str, target_user_id: str) -> bool:
        """
        验证用户是否有权操作目标用户资料（仅允许操作自己）
        Args:
            db: 数据库会话
            user_id: 当前登录用户ID
            target_user_id: 目标用户ID

        Returns:
            是否有权限操作
        """
        return user_id == target_user_id

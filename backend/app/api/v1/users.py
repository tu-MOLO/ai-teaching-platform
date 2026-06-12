"""
用户管理API模块
提供教师自助资料读取与更新
"""
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session
from app.core.exceptions import (
    AuthorizationException,
    AlreadyExistsException,
    NotFoundException,
)
from app.core.security import get_current_user_id_with_version_check
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdate

router = APIRouter()

DBSession = Annotated[AsyncSession, Depends(get_async_session)]


@router.get("/{user_id}", response_model=UserResponse, summary="获取用户详情")
async def get_user(
    user_id: str,
    db: DBSession,
    current_user_id: Annotated[str, Depends(get_current_user_id_with_version_check)]
) -> UserResponse:
    """获取当前教师自己的资料"""
    if current_user_id != user_id:
        raise AuthorizationException("仅可访问当前登录教师自己的资料")

    stmt = select(User).where(User.id == user_id, User.is_deleted == False)  # noqa: E712
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise NotFoundException("用户")

    return UserResponse.model_validate(user)


@router.put("/{user_id}", response_model=UserResponse, summary="更新用户")
async def update_user(
    user_id: str,
    user_data: UserUpdate,
    db: DBSession,
    current_user_id: Annotated[str, Depends(get_current_user_id_with_version_check)]
) -> UserResponse:
    """更新当前教师自己的资料"""
    if current_user_id != user_id:
        raise AuthorizationException("仅可修改当前登录教师自己的资料")

    stmt = select(User).where(User.id == user_id, User.is_deleted == False)  # noqa: E712
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise NotFoundException("用户")

    payload = user_data.model_dump(exclude_unset=True)

    if "username" in payload:
        stmt = select(User).where(
            User.username == payload["username"],
            User.id != user_id,
            User.is_deleted == False,  # noqa: E712
        )
        result = await db.execute(stmt)
        if result.scalar_one_or_none():
            raise AlreadyExistsException("用户", "用户名")

    if "email" in payload:
        stmt = select(User).where(
            User.email == payload["email"],
            User.id != user_id,
            User.is_deleted == False,  # noqa: E712
        )
        result = await db.execute(stmt)
        if result.scalar_one_or_none():
            raise AlreadyExistsException("用户", "邮箱")

    for field, value in payload.items():
        setattr(user, field, value)

    await db.commit()
    await db.refresh(user)

    return UserResponse.model_validate(user)

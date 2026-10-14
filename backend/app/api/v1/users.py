"""
用户管理API模块
提供教师自助资料读取与更新
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, UploadFile
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session
from app.core.exceptions import (
    AlreadyExistsException,
    AuthorizationException,
    BadRequestException,
    InternalException,
    NotFoundException,
)
from app.core.security import get_current_user_id_with_version_check
from app.models.user import User
from app.schemas.base import DataResponse
from app.schemas.user import UserResponse, UserUpdate
from app.services.storage import get_storage
from app.services.users import UserService

router = APIRouter()

DBSession = Annotated[AsyncSession, Depends(get_async_session)]

# 头像文件大小上限：2MB
AVATAR_MAX_SIZE = 2 * 1024 * 1024
# 前端裁剪后统一输出 PNG，后端仅校验 PNG 魔数（避免依赖额外图像库）
AVATAR_PNG_MAGIC = b"\x89PNG\r\n\x1a\n"


def _avatar_object_name(user_id: str) -> str:
    """头像在存储中的固定对象名（每个教师仅保留一张，重复上传即覆盖）"""
    return f"avatars/{user_id}/avatar.png"


@router.get("/{user_id}", response_model=UserResponse, summary="获取用户详情")
async def get_user(
    user_id: str,
    db: DBSession,
    current_user_id: Annotated[str, Depends(get_current_user_id_with_version_check)],
) -> UserResponse:
    """获取当前教师自己的资料"""
    if current_user_id != user_id:
        raise AuthorizationException("仅可访问当前登录教师自己的资料")

    user = await UserService.get_by_id_or_raise(db, user_id)
    return UserResponse.model_validate(user)


@router.put("/{user_id}", response_model=UserResponse, summary="更新用户")
async def update_user(
    user_id: str,
    user_data: UserUpdate,
    db: DBSession,
    current_user_id: Annotated[str, Depends(get_current_user_id_with_version_check)],
) -> UserResponse:
    """更新当前教师自己的资料"""
    if current_user_id != user_id:
        raise AuthorizationException("仅可修改当前登录教师自己的资料")

    user = await UserService.get_by_id_or_raise(db, user_id)

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


@router.post("/{user_id}/avatar", response_model=DataResponse[dict], summary="上传头像")
async def upload_avatar(
    user_id: str,
    current_user_id: Annotated[str, Depends(get_current_user_id_with_version_check)],
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_async_session),
) -> DataResponse[dict]:
    """上传当前教师自己的头像（前端已裁剪为正方形 PNG）"""
    if current_user_id != user_id:
        raise AuthorizationException("仅可修改当前登录教师自己的头像")

    content = await file.read()
    if len(content) > AVATAR_MAX_SIZE:
        raise BadRequestException("头像文件大小不能超过 2MB")
    if not content.startswith(AVATAR_PNG_MAGIC):
        raise BadRequestException("头像仅支持 PNG 图片")

    user = await UserService.get_by_id_or_raise(db, user_id)

    storage = get_storage()
    try:
        await storage.upload_file_async(
            content, _avatar_object_name(user_id), content_type="image/png"
        )
    except Exception as e:  # pragma: no cover - 存储异常统一转换为内部错误
        raise InternalException(f"头像上传失败：{e}")

    # 追加版本号，避免浏览器缓存旧头像
    user.avatar_url = f"/api/v1/users/{user_id}/avatar?v={uuid.uuid4().hex}"
    await db.commit()
    await db.refresh(user)

    return DataResponse(data={"avatar_url": user.avatar_url})


@router.get("/{user_id}/avatar", summary="获取用户头像")
async def get_avatar(user_id: str) -> Response:
    """按固定对象名读取头像文件；头像公开可读，便于 <img> 直接展示"""
    storage = get_storage()
    try:
        content = await storage.download_file_async(_avatar_object_name(user_id))
    except FileNotFoundError:
        raise NotFoundException("Avatar", user_id)
    if not isinstance(content, bytes):
        raise NotFoundException("Avatar", user_id)

    return Response(
        content=content,
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=86400"},
    )

"""
用户管理API模块
实现用户CRUD操作
"""
from typing import Annotated

from fastapi import APIRouter, Depends, status, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session
from app.core.exceptions import (
    AuthorizationException,
    AlreadyExistsException,
    NotFoundException,
)
from app.core.security import get_current_user_id_with_version_check, get_password_hash
from app.models.user import User, UserRole, UserStatus
from app.schemas.base import MessageResponse
from app.schemas.user import UserResponse, UserUpdate, UserListResponse

router = APIRouter()

DBSession = Annotated[AsyncSession, Depends(get_async_session)]


class UserCreateRequest(BaseModel):
    """创建用户请求模型"""
    email: str = Field(..., description="邮箱")
    username: str = Field(..., description="用户名")
    password: str = Field(..., description="密码")
    full_name: str = Field(default="", description="姓名")
    role: str = Field(default="teacher", description="角色")


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED, summary="创建用户")
async def create_user(
    user_data: UserCreateRequest,
    db: DBSession,
    current_user_id: Annotated[str, Depends(get_current_user_id_with_version_check)]
) -> UserResponse:
    """创建新用户（管理员功能）"""
    # 检查权限
    stmt = select(User).where(User.id == current_user_id, User.is_deleted == False)
    result = await db.execute(stmt)
    current_user = result.scalar_one_or_none()
    
    if not current_user or current_user.role != UserRole.ADMIN:
        raise AuthorizationException("无权创建用户")
    
    # 检查用户名是否已存在
    stmt = select(User).where(
        User.username == user_data.username,
        User.is_deleted == False
    )
    result = await db.execute(stmt)
    if result.scalar_one_or_none():
        raise AlreadyExistsException("用户", "用户名")
    
    # 检查邮箱是否已存在
    stmt = select(User).where(
        User.email == user_data.email,
        User.is_deleted == False
    )
    result = await db.execute(stmt)
    if result.scalar_one_or_none():
        raise AlreadyExistsException("用户", "邮箱")
    
    # 创建新用户
    import uuid
    new_user = User(
        id=str(uuid.uuid4()),
        email=user_data.email,
        username=user_data.username,
        hashed_password=get_password_hash(user_data.password),
        full_name=user_data.full_name,
        role=UserRole(user_data.role),
        status=UserStatus.ACTIVE,
        is_active=True,
        is_verified=True
    )
    
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    return UserResponse.model_validate(new_user)


@router.get("/{user_id}", response_model=UserResponse, summary="获取用户详情")
async def get_user(
    user_id: str,
    db: DBSession,
    current_user_id: Annotated[str, Depends(get_current_user_id_with_version_check)]
) -> UserResponse:
    """获取指定用户详情"""
    stmt = select(User).where(User.id == user_id, User.is_deleted == False)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user:
        raise NotFoundException("用户")
    
    return UserResponse.model_validate(user)


@router.get("", response_model=UserListResponse, summary="获取用户列表")
async def list_users(
    db: DBSession,
    current_user_id: Annotated[str, Depends(get_current_user_id_with_version_check)],
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    role: str = Query(None, description="按角色筛选"),
    status: str = Query(None, description="按状态筛选"),
    keyword: str = Query(None, description="搜索关键词")
) -> UserListResponse:
    """获取用户列表（支持分页、筛选、搜索）"""
    # 构建查询
    stmt = select(User).where(User.is_deleted == False)
    
    # 应用筛选
    if role:
        stmt = stmt.where(User.role == role)
    if status:
        stmt = stmt.where(User.status == status)
    if keyword:
        stmt = stmt.where(
            or_(
                User.username.contains(keyword),
                User.email.contains(keyword),
                User.full_name.contains(keyword)
            )
        )
    
    # 获取总数
    count_stmt = select(User).where(User.is_deleted == False)
    if role:
        count_stmt = count_stmt.where(User.role == role)
    if status:
        count_stmt = count_stmt.where(User.status == status)
    if keyword:
        count_stmt = count_stmt.where(
            or_(
                User.username.contains(keyword),
                User.email.contains(keyword),
                User.full_name.contains(keyword)
            )
        )
    
    from sqlalchemy import func
    total_result = await db.execute(select(func.count()).select_from(count_stmt.subquery()))
    total = total_result.scalar()
    
    # 分页
    stmt = stmt.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(stmt)
    users = result.scalars().all()
    
    return UserListResponse(
        data=[UserResponse.model_validate(u) for u in users],
        total=total,
        page=page,
        page_size=page_size,
        pages=(total + page_size - 1) // page_size
    )


@router.put("/{user_id}", response_model=UserResponse, summary="更新用户")
async def update_user(
    user_id: str,
    user_data: dict,
    db: DBSession,
    current_user_id: Annotated[str, Depends(get_current_user_id_with_version_check)]
) -> UserResponse:
    """更新用户信息"""
    stmt = select(User).where(User.id == user_id, User.is_deleted == False)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user:
        raise NotFoundException("用户")
    
    # 更新字段
    if "full_name" in user_data:
        user.full_name = user_data["full_name"]
    if "phone" in user_data:
        user.phone = user_data["phone"]
    if "bio" in user_data:
        user.bio = user_data["bio"]
    if "role" in user_data:
        user.role = UserRole(user_data["role"])
    if "status" in user_data:
        user.status = UserStatus(user_data["status"])
    if "is_active" in user_data:
        user.is_active = user_data["is_active"]
    
    await db.commit()
    await db.refresh(user)
    
    return UserResponse.model_validate(user)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT, summary="删除用户")
async def delete_user(
    user_id: str,
    db: DBSession,
    current_user_id: Annotated[str, Depends(get_current_user_id_with_version_check)]
):
    """软删除用户"""
    stmt = select(User).where(User.id == user_id, User.is_deleted == False)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user:
        raise NotFoundException("用户")
    
    # 软删除
    user.is_deleted = True
    await db.commit()
    
    return None

"""
权限管理API模块
提供权限相关的管理接口，包括角色管理、权限配置等
"""
from typing import Annotated, List

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field
from sqlalchemy import select, and_, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session
from app.core.exceptions import AuthorizationException, NotFoundException
from app.core.security import get_current_user_id
from app.models.permission import Permission, Role, RolePermission
from app.models.user import User
from app.schemas.base import DataResponse, ListResponse, MessageResponse
from app.services.permission import PermissionService

router = APIRouter(prefix="/permissions", tags=["权限管理"])

# 依赖注入类型
DBSession = Annotated[AsyncSession, Depends(get_async_session)]
CurrentUser = Annotated[str, Depends(get_current_user_id)]


class RoleResponse(BaseModel):
    """角色响应模型"""
    id: str = Field(..., description="角色ID")
    code: str = Field(..., description="角色代码")
    name: str = Field(..., description="角色名称")
    description: str | None = Field(None, description="角色描述")
    is_system: bool = Field(..., description="是否为系统角色")
    is_active: bool = Field(..., description="是否启用")
    permission_count: int = Field(0, description="权限数量")


class RolePermissionsUpdate(BaseModel):
    """角色权限更新请求"""
    permission_codes: List[str] = Field(..., description="权限代码列表")


async def check_superuser_permission(
    user_id: str,
    db: AsyncSession
) -> None:
    """
    检查用户是否为超级管理员
    
    Args:
        user_id: 用户ID
        db: 数据库会话
        
    Raises:
        HTTPException: 如果不是超级管理员则抛出403错误
    """
    stmt = select(User).where(
        and_(
            User.id == user_id,
            User.is_deleted == False
        )
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user or not user.is_superuser:
        raise AuthorizationException("无权限访问，仅超级管理员可执行此操作")


@router.get("/roles", response_model=ListResponse[RoleResponse], summary="获取角色列表")
async def get_roles(
    db: DBSession,
    current_user: CurrentUser
):
    """
    获取所有角色列表
    
    仅超级管理员可访问。
    """
    await check_superuser_permission(current_user, db)
    
    permission_service = PermissionService(db)
    roles = await permission_service.get_all_roles()
    
    role_list = []
    for role in roles:
        # 获取角色权限数量
        count_stmt = select(RolePermission).where(
            RolePermission.role_id == role.id
        )
        count_result = await db.execute(count_stmt)
        permission_count = len(count_result.scalars().all())
        
        role_list.append(RoleResponse(
            id=role.id,
            code=role.code,
            name=role.name,
            description=role.description,
            is_system=role.is_system,
            is_active=role.is_active,
            permission_count=permission_count
        ))
    
    return ListResponse(items=role_list, total=len(role_list))


@router.get("/roles/{role_code}/permissions", response_model=ListResponse[str], summary="获取角色权限")
async def get_role_permissions(
    role_code: str,
    db: DBSession,
    current_user: CurrentUser
):
    """
    获取指定角色的权限列表
    
    仅超级管理员可访问。
    """
    await check_superuser_permission(current_user, db)
    
    permission_service = PermissionService(db)
    permissions = await permission_service.get_permissions_by_role_code(role_code)
    
    return ListResponse(items=permissions, total=len(permissions))


@router.put("/roles/{role_code}/permissions", response_model=MessageResponse, summary="更新角色权限")
async def update_role_permissions(
    role_code: str,
    update_data: RolePermissionsUpdate,
    db: DBSession,
    current_user: CurrentUser
):
    """
    更新指定角色的权限列表
    
    仅超级管理员可访问。
    """
    await check_superuser_permission(current_user, db)
    
    success = await PermissionService(db).update_role_permissions(
        role_code,
        update_data.permission_codes
    )
    
    if not success:
        raise NotFoundException("角色")
    
    return MessageResponse(message="权限更新成功", code="success")


@router.get("/permissions", response_model=ListResponse[dict], summary="获取所有权限")
async def get_permissions(
    db: DBSession,
    current_user: CurrentUser
):
    """
    获取所有权限列表
    
    仅超级管理员可访问。
    """
    await check_superuser_permission(current_user, db)
    
    permission_service = PermissionService(db)
    permissions = await permission_service.get_all_permissions()
    
    permission_list = [
        {
            "id": p.id,
            "code": p.code,
            "name": p.name,
            "description": p.description,
            "resource": p.resource,
            "action": p.action,
            "is_active": p.is_active
        }
        for p in permissions
    ]
    
    return ListResponse(items=permission_list, total=len(permission_list))


@router.post("/initialize", response_model=MessageResponse, summary="初始化权限系统")
async def initialize_permissions(
    db: DBSession,
    current_user: CurrentUser
):
    """
    初始化权限系统和默认数据
    
    创建默认权限（约20个）和角色（教师、管理员），并建立关联关系。
    如果已存在则跳过，不会覆盖现有配置。
    
    仅超级管理员可访问。
    """
    await check_superuser_permission(current_user, db)
    
    permission_service = PermissionService(db)
    await permission_service.initialize_default_permissions()
    
    return MessageResponse(message="权限系统初始化成功", code="success")

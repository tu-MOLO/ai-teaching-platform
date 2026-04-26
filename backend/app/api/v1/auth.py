"""认证API模块
实现用户登录、注册、获取当前用户等认证相关接口
"""
import logging
import warnings
from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, Request, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_async_session
from app.core.exceptions import (
    AuthenticationException,
    AuthorizationException,
    BadRequestException,
    ConflictException,
    NotFoundException,
    ErrorCode
)
from app.core.security import (
    create_access_token,
    create_refresh_token,
    get_current_user_id,
    get_current_user_id_with_version_check,
    get_password_hash,
    security,
    verify_password,
    verify_token
)
from app.models.user import User, UserRole, UserStatus
from app.schemas.auth import (
    CurrentUserResponse,
    LoginRequest,
    LoginResponse,
    PasswordChangeRequest,
    RefreshTokenRequest,
    RegisterRequest,
    TokenData,
    UserAuthInfo
)
from app.schemas.base import MessageResponse
from app.services.permission import PermissionService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["认证"])


# 依赖注入类型
DBSession = Annotated[AsyncSession, Depends(get_async_session)]


@router.post("/login", response_model=LoginResponse, summary="用户登录")
async def login(
    request: Request,
    login_data: LoginRequest,
    db: DBSession
) -> LoginResponse:
    """
    用户登录接口
    
    支持使用用户名或邮箱登录
    """
    # 查询用户（支持用户名或邮箱登录）
    stmt = select(User).where(
        or_(
            User.username == login_data.username,
            User.email == login_data.username
        ),
        User.is_deleted == False
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    # 验证用户存在
    if not user:
        raise AuthenticationException(
            message="用户名或密码错误",
            error_code=ErrorCode.INVALID_CREDENTIALS
        )
    
    # 验证账户状态
    if not user.is_active:
        raise AuthorizationException(
            message="账户已被禁用",
            error_code=ErrorCode.ACCOUNT_DISABLED
        )
    
    if user.is_locked():
        raise AuthorizationException(
            message="账户已被锁定，请稍后再试",
            error_code=ErrorCode.ACCOUNT_LOCKED
        )
    
    # 验证密码
    if not verify_password(login_data.password, user.hashed_password):
        user.record_failed_login()
        await db.commit()
        raise AuthenticationException(
            message="用户名或密码错误",
            error_code=ErrorCode.INVALID_CREDENTIALS
        )
    
    # 更新登录信息
    client_ip = request.client.host if request.client else None
    user.record_login(ip_address=client_ip)
    await db.commit()
    
    # 生成令牌
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    if login_data.remember_me:
        access_token_expires = timedelta(days=7)
    
    access_token = create_access_token(
        subject=user.id,
        expires_delta=access_token_expires,
        token_version=str(user.token_version)
    )
    
    refresh_token = create_refresh_token(
        subject=user.id,
        expires_delta=timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    
    # 构建响应
    token_data = TokenData(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=int(access_token_expires.total_seconds()),
        refresh_expires_in=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600
    )
    
    user_info = UserAuthInfo.model_validate(user)
    
    return LoginResponse(token=token_data, user=user_info)


@router.post("/register", response_model=MessageResponse, status_code=status.HTTP_201_CREATED, summary="用户注册")
async def register(
    register_data: RegisterRequest,
    db: DBSession
) -> MessageResponse:
    """
    用户注册接口
    """
    # 检查用户名是否已存在
    stmt = select(User).where(
        User.username == register_data.username,
        User.is_deleted == False
    )
    result = await db.execute(stmt)
    if result.scalar_one_or_none():
        raise ConflictException("用户名", "已存在")
    
    # 检查邮箱是否已存在
    stmt = select(User).where(
        User.email == register_data.email,
        User.is_deleted == False
    )
    result = await db.execute(stmt)
    if result.scalar_one_or_none():
        raise ConflictException("邮箱", "已被注册")
    
    # 创建新用户
    new_user = User(
        email=str(register_data.email),
        username=register_data.username,
        hashed_password=get_password_hash(register_data.password),
        full_name=register_data.full_name,
        role=UserRole.TEACHER,
        status=UserStatus.PENDING,
        is_active=True,
        is_verified=False
    )
    
    db.add(new_user)
    await db.commit()
    
    # TODO: 发送验证邮件
    
    return MessageResponse(
        message="注册成功，请检查邮箱完成验证",
        code="success"
    )


@router.post("/refresh", response_model=TokenData, summary="刷新访问令牌")
async def refresh_token(
    refresh_data: RefreshTokenRequest,
    db: DBSession
) -> TokenData:
    """
    使用刷新令牌获取新的访问令牌
    """
    # 验证刷新令牌
    user_id = verify_token(refresh_data.refresh_token, token_type="refresh")
    
    if not user_id:
        raise AuthenticationException(
            message="无效的刷新令牌",
            error_code=ErrorCode.TOKEN_INVALID
        )
    
    # 查询用户
    stmt = select(User).where(
        User.id == user_id,
        User.is_deleted == False
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user or not user.is_active:
        raise AuthenticationException(
            message="用户不存在或已被禁用",
            error_code=ErrorCode.UNAUTHORIZED
        )
    
    # 生成新的令牌
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=user.id,
        expires_delta=access_token_expires,
        token_version=str(user.token_version)
    )
    
    new_refresh_token = create_refresh_token(
        subject=user.id,
        expires_delta=timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    
    return TokenData(
        access_token=access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        expires_in=int(access_token_expires.total_seconds()),
        refresh_expires_in=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600
    )


@router.get("/me", response_model=CurrentUserResponse, summary="获取当前用户信息")
async def get_current_user(
    user_id: Annotated[str, Depends(get_current_user_id_with_version_check)],
    db: DBSession
) -> CurrentUserResponse:
    """
    获取当前登录用户的信息
    """
    stmt = select(User).where(
        User.id == user_id,
        User.is_deleted == False
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user:
        raise NotFoundException("用户")
    
    # 根据角色获取权限列表（使用权限服务，支持动态配置）
    permissions = await get_permissions_by_role(user.role, db)
    
    return CurrentUserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        avatar_url=user.avatar_url,
        role=user.role,
        status=user.status.value if hasattr(user.status, 'value') else str(user.status),
        is_active=user.is_active,
        is_verified=user.is_verified,
        last_login_at=user.last_login_at,
        login_count=user.login_count,
        permissions=permissions
    )


@router.post("/logout", response_model=MessageResponse, summary="用户登出")
async def logout(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    user_id: Annotated[str, Depends(get_current_user_id_with_version_check)],
    db: DBSession
) -> MessageResponse:
    """
    用户登出接口
    
    增加token_version使当前令牌失效
    """
    stmt = select(User).where(
        User.id == user_id,
        User.is_deleted == False
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if user:
        # 增加token_version使当前所有令牌失效
        user.increment_token_version()
        await db.commit()
    
    return MessageResponse(
        message="登出成功",
        code="success"
    )


@router.post("/password/change", response_model=MessageResponse, summary="修改密码")
async def change_password(
    password_data: PasswordChangeRequest,
    user_id: Annotated[str, Depends(get_current_user_id_with_version_check)],
    db: DBSession
) -> MessageResponse:
    """
    修改当前用户密码
    """
    stmt = select(User).where(
        User.id == user_id,
        User.is_deleted == False
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user:
        raise NotFoundException("用户")
    
    # 验证当前密码
    if not verify_password(password_data.current_password, user.hashed_password):
        raise BadRequestException("当前密码错误")
    
    # 更新密码
    user.hashed_password = get_password_hash(password_data.new_password)
    # 增加token_version使旧令牌失效
    user.increment_token_version()
    await db.commit()
    
    return MessageResponse(
        message="密码修改成功，请重新登录",
        code="success"
    )

# ============================================================================
# ⚠️ DEPRECATED: 硬编码权限配置（向后兼容遗留代码）
# ============================================================================
#
# 警告：以下硬编码权限配置已废弃，仅用于向后兼容。
# 新代码应使用 PermissionService (app/core/permissions.py) 从数据库动态加载权限。
#
# 废弃原因：
# - 双重权限实现导致维护困难和潜在的不一致风险
# - 无法在运行时动态调整权限配置
# - 违反单一职责原则
#
# 迁移计划：
# - Phase 1 (当前): 标记为deprecated，引导新代码使用PermissionService ✅
# - Phase 2: 移除硬编码逻辑，完全依赖PermissionService
# - Phase 3: 添加数据库初始化脚本导入默认权限配置
#
# @deprecated since v1.1.0
# @see app.core.permissions.PermissionService
# @see app.models.permission.Permission, Role, RolePermission
# ============================================================================

# 硬编码权限配置（向后兼容，当数据库权限未初始化时使用）
BASE_PERMISSIONS = ["user:read", "user:update"]

LEGACY_ROLE_PERMISSIONS = {
    UserRole.TEACHER: [
        "course:create",
        "course:update",
        "course:delete",
        "course:read",
        "enrollment:read",
        "enrollment:update",
        "assignment:create",
        "assignment:update",
        "assignment:delete",
        "assignment:read",
        "quiz:create",
        "quiz:update",
        "quiz:delete",
        "quiz:read",
        "grade:create",
        "grade:update",
        "grade:read"
    ],
    UserRole.ADMIN: [
        "*"  # 管理员拥有所有权限
    ]
}


async def get_permissions_by_role(
    role: UserRole,
    db: AsyncSession
) -> list[str]:
    """
    根据角色获取权限列表

    .. deprecated::
        此函数已废弃，请使用 PermissionService.get_permissions_by_legacy_role()
        该方法会优先从数据库加载权限，仅在数据库未初始化时回退到硬编码逻辑。

    优先从数据库权限服务获取，如果失败则回退到硬编码逻辑（向后兼容）。

    Args:
        role: 用户角色
        db: 数据库会话

    Returns:
        权限列表

    Deprecated:
        使用 PermissionService 替代
    """
    try:
        # 尝试从权限服务获取权限
        permission_service = PermissionService(db)
        permissions = await permission_service.get_permissions_by_legacy_role(role)
        
        # 如果数据库中有权限配置，使用数据库配置
        if permissions:
            return permissions
    except Exception:
        # 数据库查询失败时，回退到硬编码逻辑
        pass

    # 向后兼容：使用硬编码权限配置（已废弃）
    warnings.warn(
        "Using hardcoded permissions is deprecated. "
        "Please migrate to PermissionService for dynamic permission management.",
        DeprecationWarning,
        stacklevel=2
    )
    logger.warning(
        "Falling back to hardcoded permissions for role %s. "
        "This is deprecated and will be removed in a future version. "
        "Please ensure database permissions are properly initialized.",
        role.value
    )

    return BASE_PERMISSIONS + LEGACY_ROLE_PERMISSIONS.get(role, [])

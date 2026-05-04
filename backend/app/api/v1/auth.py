"""认证API模块
实现用户登录、注册、获取当前用户等认证相关接口
"""
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
    PasswordResetRequest,
    RefreshTokenRequest,
    RegisterRequest,
    TokenData,
    UserAuthInfo
)
from app.schemas.base import MessageResponse
from app.services.permission import PermissionService

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
        status=UserStatus.ACTIVE,
        is_active=True
    )
    
    db.add(new_user)
    await db.commit()
    
    return MessageResponse(
        message="注册成功，请登录后完善个人资料",
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
    
    permissions = await PermissionService(db).get_permissions_by_user_id(user.id)
    
    return CurrentUserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        avatar_url=user.avatar_url,
        role=user.role,
        status=user.status.value if hasattr(user.status, 'value') else str(user.status),
        is_active=user.is_active,
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


@router.post("/password/reset", response_model=MessageResponse, summary="重置密码")
async def reset_password(
    reset_data: PasswordResetRequest,
    db: DBSession
) -> MessageResponse:
    """
    本地部署场景的密码重置接口。

    基于用户名或邮箱直接重置密码，不依赖邮件验证链路。
    """
    stmt = select(User).where(
        or_(
            User.username == reset_data.username,
            User.email == reset_data.username
        ),
        User.is_deleted == False
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise NotFoundException("用户")

    user.hashed_password = get_password_hash(reset_data.new_password)
    user.increment_token_version()
    user.record_failed_login()
    user.failed_login_attempts = 0
    user.locked_until = None
    await db.commit()

    return MessageResponse(
        message="密码已重置，请使用新密码登录",
        code="success"
    )

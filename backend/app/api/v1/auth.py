from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_async_session
from app.core.exceptions import (
    AuthenticationException,
    AuthorizationException,
    BadRequestException,
    ConflictException,
    ErrorCode,
    NotFoundException,
)
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user_id_with_version_check,
    get_password_hash,
    security,
    verify_password,
)
from app.models.user import User, UserRole, UserStatus
from app.schemas.auth import (
    CurrentUserResponse,
    LoginRequest,
    LoginResponse,
    PasswordChangeRequest,
    PasswordResetRequest,
    RegisterRequest,
    SecurityQuestionRequest,
    SecurityQuestionResponse,
    SECURITY_QUESTIONS,
    TokenData,
    UserAuthInfo,
)
from app.schemas.base import MessageResponse
from app.services.permission import PermissionService
from app.core.rate_limiter import rate_limit_dep

router = APIRouter(prefix="/auth", tags=["auth"])

DBSession = Annotated[AsyncSession, Depends(get_async_session)]


@router.post("/login", response_model=LoginResponse, summary="用户登录")
async def login(
    request: Request,
    login_data: LoginRequest,
    db: DBSession,
    response: Response,
    _: None = Depends(rate_limit_dep("login")),
) -> LoginResponse:
    stmt = select(User).where(
        or_(
            User.username == login_data.username,
            User.email == login_data.username,
        ),
        User.is_deleted == False,
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise AuthenticationException(
            message="用户名或密码错误",
            error_code=ErrorCode.INVALID_CREDENTIALS,
        )

    if not user.is_active:
        raise AuthorizationException("账户已被禁用")

    if user.is_locked():
        raise AuthorizationException("账户已被锁定，请稍后再试")

    if not verify_password(login_data.password, user.hashed_password):
        user.record_failed_login()
        await db.commit()
        raise AuthenticationException(
            message="用户名或密码错误",
            error_code=ErrorCode.INVALID_CREDENTIALS,
        )

    client_ip = request.client.host if request.client else None
    user.record_login(ip_address=client_ip)
    await db.commit()

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    if login_data.remember_me:
        refresh_token_expires = timedelta(days=7)
    else:
        refresh_token_expires = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    access_token = create_access_token(
        subject=user.id,
        expires_delta=access_token_expires,
        token_version=str(user.token_version),
    )
    refresh_token = create_refresh_token(
        subject=user.id,
        expires_delta=refresh_token_expires,
        token_version=str(user.token_version),
    )

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=int(refresh_token_expires.total_seconds()),
        path="/api/v1/auth",
    )

    return LoginResponse(
        token=TokenData(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=int(access_token_expires.total_seconds()),
            refresh_expires_in=int(refresh_token_expires.total_seconds()),
        ),
        user=UserAuthInfo.model_validate(user),
    )


@router.post(
    "/register",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="用户注册",
)
async def register(
    request: Request,
    register_data: RegisterRequest,
    db: DBSession,
    _: None = Depends(rate_limit_dep("register")),
) -> MessageResponse:
    username_stmt = select(User).where(
        User.username == register_data.username,
        User.is_deleted == False,
    )
    if (await db.execute(username_stmt)).scalar_one_or_none():
        raise ConflictException("用户名", "已存在")

    email_stmt = select(User).where(
        User.email == register_data.email,
        User.is_deleted == False,
    )
    if (await db.execute(email_stmt)).scalar_one_or_none():
        raise ConflictException("邮箱", "已被注册")

    new_user = User(
        email=str(register_data.email),
        username=register_data.username,
        hashed_password=get_password_hash(register_data.password),
        full_name=register_data.full_name,
        role=UserRole.TEACHER,
        status=UserStatus.ACTIVE,
        is_active=True,
        security_question=register_data.security_question,
        hashed_security_answer=get_password_hash(register_data.security_answer),
    )
    db.add(new_user)
    await db.commit()

    return MessageResponse(
        message="注册成功，请登录后完善个人资料",
        code="success",
    )


@router.post("/refresh", response_model=TokenData, summary="刷新访问令牌")
async def refresh_token(
    request: Request,
    response: Response,
    db: DBSession,
) -> TokenData:
    refresh_token_value = request.cookies.get("refresh_token")
    if not refresh_token_value:
        raise AuthenticationException(
            message="未提供刷新令牌",
            error_code=ErrorCode.TOKEN_INVALID,
        )

    payload = decode_token(refresh_token_value)
    if not payload or payload.type != "refresh":
        raise AuthenticationException(
            message="无效的刷新令牌",
            error_code=ErrorCode.TOKEN_INVALID,
        )
    if not payload.sub:
        raise AuthenticationException(
            message="无效的刷新令牌",
            error_code=ErrorCode.TOKEN_INVALID,
        )
    if payload.exp and datetime.now(timezone.utc) > payload.exp:
        raise AuthenticationException(
            message="刷新令牌已过期",
            error_code=ErrorCode.TOKEN_EXPIRED,
        )

    stmt = select(User).where(User.id == payload.sub, User.is_deleted == False)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise AuthenticationException(
            message="用户不存在或已被禁用",
            error_code=ErrorCode.UNAUTHORIZED,
        )

    if not payload.jti or str(user.token_version) != payload.jti:
        raise AuthenticationException(
            message="刷新令牌已失效，请重新登录",
            error_code=ErrorCode.TOKEN_REVOKED,
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=user.id,
        expires_delta=access_token_expires,
        token_version=str(user.token_version),
    )
    new_refresh_token = create_refresh_token(
        subject=user.id,
        expires_delta=timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        token_version=str(user.token_version),
    )

    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        path="/api/v1/auth",
    )

    return TokenData(
        access_token=access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        expires_in=int(access_token_expires.total_seconds()),
        refresh_expires_in=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
    )


@router.get("/me", response_model=CurrentUserResponse, summary="获取当前用户")
async def get_current_user(
    user_id: Annotated[str, Depends(get_current_user_id_with_version_check)],
    db: DBSession,
) -> CurrentUserResponse:
    stmt = select(User).where(User.id == user_id, User.is_deleted == False)
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
        status=user.status.value if hasattr(user.status, "value") else str(user.status),
        is_active=user.is_active,
        last_login_at=user.last_login_at,
        login_count=user.login_count,
        permissions=permissions,
    )


@router.post("/logout", response_model=MessageResponse, summary="用户退出")
async def logout(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    user_id: Annotated[str, Depends(get_current_user_id_with_version_check)],
    db: DBSession,
    response: Response,
) -> MessageResponse:
    stmt = select(User).where(User.id == user_id, User.is_deleted == False)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if user:
        user.increment_token_version()
        await db.commit()

    response.delete_cookie(
        key="refresh_token",
        path="/api/v1/auth",
        samesite="lax",
    )

    return MessageResponse(message="退出成功", code="success")


@router.post("/password/change", response_model=MessageResponse, summary="修改密码")
async def change_password(
    password_data: PasswordChangeRequest,
    user_id: Annotated[str, Depends(get_current_user_id_with_version_check)],
    db: DBSession,
) -> MessageResponse:
    stmt = select(User).where(User.id == user_id, User.is_deleted == False)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundException("用户")

    if not verify_password(password_data.current_password, user.hashed_password):
        raise BadRequestException("当前密码错误")

    user.hashed_password = get_password_hash(password_data.new_password)
    user.increment_token_version()
    await db.commit()

    return MessageResponse(message="密码修改成功，请重新登录", code="success")


@router.post("/password/reset/question", response_model=SecurityQuestionResponse, summary="获取密保问题")
async def get_security_question(
    request: Request,
    question_data: SecurityQuestionRequest,
    db: DBSession,
    _: None = Depends(rate_limit_dep("password_reset")),
) -> SecurityQuestionResponse:
    stmt = select(User).where(
        or_(
            User.username == question_data.username,
            User.email == question_data.username,
        ),
        User.is_deleted == False,
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if not user:
        raise BadRequestException("无法获取密保问题，请检查用户名或邮箱")

    return SecurityQuestionResponse(
        username=user.username,
        security_question=user.security_question,
        is_legacy=(user.security_question == "未设置密保问题"),
    )


@router.post("/password/reset", response_model=MessageResponse, summary="重置密码")
async def reset_password(
    request: Request,
    reset_data: PasswordResetRequest,
    db: DBSession,
    _: None = Depends(rate_limit_dep("password_reset")),
) -> MessageResponse:
    stmt = select(User).where(
        or_(
            User.username == reset_data.username,
            User.email == reset_data.username,
        ),
        User.is_deleted == False,
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundException("用户")

    if user.is_reset_locked():
        raise AuthorizationException("密码重置已被锁定，请稍后再试")

    if not user.verify_security_answer(reset_data.security_answer):
        user.record_failed_reset_attempt()
        await db.commit()
        raise BadRequestException("密保答案错误")

    user.reset_reset_lock()
    user.hashed_password = get_password_hash(reset_data.new_password)
    user.increment_token_version()
    user.failed_login_attempts = 0
    user.locked_until = None
    await db.commit()

    return MessageResponse(
        message="密码已重置，请使用新密码登录",
        code="success",
    )

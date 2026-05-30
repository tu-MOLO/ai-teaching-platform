"""
安全模块
包含密码哈希和JWT认证功能
"""
from datetime import datetime, timedelta, timezone
from typing import Any, Optional, Union

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from jwt.exceptions import InvalidTokenError as JWTError
import bcrypt
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_async_session as get_db


# HTTP Bearer认证
security = HTTPBearer(auto_error=False)


class TokenPayload(BaseModel):
    """JWT Token载荷"""
    model_config = {"populate_by_name": True}
    
    sub: Optional[str] = None  # 用户ID
    exp: Optional[datetime] = None  # 过期时间
    type: Optional[str] = None  # token类型：access/refresh
    jti: Optional[str] = None  # JWT ID/Token版本，用于token失效控制
    iat: Optional[datetime] = None  # 签发时间


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8")
    )


def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")


def create_access_token(
    subject: Union[str, Any],
    expires_delta: Optional[timedelta] = None,
    extra_claims: Optional[dict] = None,
    token_version: Optional[str] = None
) -> str:
    """
    创建访问令牌
    
    Args:
        subject: 令牌主题（通常是用户ID）
        expires_delta: 过期时间增量
        extra_claims: 额外声明
        token_version: 令牌版本号，用于失效控制
        
    Returns:
        JWT令牌字符串
    """
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    
    to_encode = {
        "exp": expire,
        "sub": str(subject),
        "type": "access",
        "iat": datetime.now(timezone.utc)  # 签发时间
    }
    
    # 添加令牌版本号（用于失效控制）
    if token_version:
        to_encode["jti"] = str(token_version)
    
    if extra_claims:
        to_encode.update(extra_claims)
    
    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )
    return encoded_jwt


def create_refresh_token(
    subject: Union[str, Any],
    expires_delta: Optional[timedelta] = None,
    token_version: Optional[str] = None
) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            days=settings.REFRESH_TOKEN_EXPIRE_DAYS
        )
    
    to_encode = {
        "exp": expire,
        "sub": str(subject),
        "type": "refresh",
        "iat": datetime.now(timezone.utc)
    }

    if token_version:
        to_encode["jti"] = str(token_version)
    
    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )
    return encoded_jwt


def decode_token(token: str) -> Optional[TokenPayload]:
    """
    解码JWT令牌
    
    Args:
        token: JWT令牌字符串
        
    Returns:
        TokenPayload对象，如果无效则返回None
    """
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        return TokenPayload(**payload)
    except jwt.exceptions.InvalidTokenError:
        return None


def verify_token(token: str, token_type: str = "access") -> Optional[str]:
    """
    验证JWT令牌
    
    Args:
        token: JWT令牌字符串
        token_type: 期望的令牌类型（access/refresh）
        
    Returns:
        用户ID（sub），如果无效则返回None
    """
    payload = decode_token(token)
    
    if not payload:
        return None
    
    if payload.type != token_type:
        return None
    
    if not payload.sub:
        return None
    
    # 检查是否过期
    if payload.exp and datetime.now(timezone.utc) > payload.exp:
        return None
    
    return payload.sub


async def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> str:
    """
    获取当前用户ID（FastAPI依赖）
    
    Args:
        credentials: HTTP认证凭证
        
    Returns:
        用户ID字符串
        
    Raises:
        HTTPException: 认证失败时抛出
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="未提供认证凭证",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = verify_token(credentials.credentials, token_type="access")
    
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的认证凭证或令牌已过期",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user_id


async def get_current_user_id_from_token_with_version_check(
    token: str,
    db: AsyncSession
) -> str:
    """
    直接根据Token字符串获取当前用户ID并校验Token版本

    Args:
        token: JWT token字符串
        db: 数据库会话

    Returns:
        用户ID
    """
    from app.models.user import User

    payload = decode_token(token)

    if not payload or payload.type != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的认证凭证",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.sub
    token_version = payload.jti

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的认证凭证",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if payload.exp and datetime.now(timezone.utc) > payload.exp:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="认证凭证已过期",
            headers={"WWW-Authenticate": "Bearer"},
        )

    stmt = select(User).where(User.id == user_id, User.is_deleted == False)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户不存在",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="账户已被禁用"
        )

    if token_version and str(user.token_version) != token_version:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="认证凭证已失效，请重新登录",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user_id


async def get_current_user_id_with_version_check(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> str:
    """
    获取当前用户ID并校验Token版本（FastAPI依赖）
    
    此依赖会检查Token中的版本号是否与数据库中一致，
    用于确保用户登出或修改密码后Token立即失效。
    
    Args:
        credentials: HTTP认证凭证
        db: 数据库会话
        
    Returns:
        用户ID字符串
        
    Raises:
        HTTPException: 认证失败或Token版本不匹配时抛出
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="未提供认证凭证",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return await get_current_user_id_from_token_with_version_check(credentials.credentials, db)


from cryptography.fernet import Fernet
import base64
import hashlib


def _get_encryption_key() -> bytes:
    key = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
    return base64.urlsafe_b64encode(key)


def encrypt_api_key(key: str) -> str:
    if not key:
        return ""
    f = Fernet(_get_encryption_key())
    return f.encrypt(key.encode()).decode()


def decrypt_api_key(encrypted: str) -> str:
    if not encrypted:
        return ""
    f = Fernet(_get_encryption_key())
    return f.decrypt(encrypted.encode()).decode()


def mask_api_key(key: str) -> str:
    if not key or len(key) <= 8:
        return "****"
    return key[:4] + "****" + key[-4:]

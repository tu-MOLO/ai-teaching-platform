"""
认证相关Schemas模块
定义认证相关的Pydantic模型
"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models.user import UserRole
from app.schemas.base import BaseSchema


SECURITY_QUESTIONS = [
    "您的母校名称是什么？",
    "您母亲的姓名是什么？",
    "您第一只宠物的名字是什么？",
    "您出生的城市是哪里？",
    "您最喜欢的书是什么？",
]


def validate_password_strength(value: str) -> str:
    """统一认证相关密码强度规则。"""
    if len(value) < 8:
        raise ValueError("密码长度至少8位")
    if not any(ch.isalpha() for ch in value):
        raise ValueError("密码必须至少包含一个字母")
    if not any(ch.isdigit() for ch in value):
        raise ValueError("密码必须至少包含一个数字")
    return value


# ============== 认证请求 ==============

class LoginRequest(BaseSchema):
    """登录请求"""
    username: str = Field(..., description="用户名或邮箱")
    password: str = Field(..., description="密码")
    remember_me: bool = Field(default=False, description="记住我（延长令牌有效期）")


class RefreshTokenRequest(BaseSchema):
    """刷新令牌请求"""
    refresh_token: str = Field(..., description="刷新令牌")


class RegisterRequest(BaseSchema):
    email: EmailStr = Field(..., description="邮箱地址")
    username: str = Field(..., min_length=3, max_length=50, description="用户名")
    password: str = Field(..., min_length=8, max_length=100, description="密码")
    full_name: Optional[str] = Field(default=None, max_length=100, description="真实姓名")
    security_question: str = Field(..., description="密保问题")
    security_answer: str = Field(..., min_length=1, max_length=100, description="密保答案")

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        return validate_password_strength(value)


# ============== 认证响应 ==============

class TokenData(BaseSchema):
    """令牌数据"""
    access_token: str = Field(..., description="访问令牌")
    refresh_token: str = Field(..., description="刷新令牌")
    token_type: str = Field(default="bearer", description="令牌类型")
    expires_in: int = Field(..., description="访问令牌有效期（秒）")
    refresh_expires_in: int = Field(..., description="刷新令牌有效期（秒）")


class LoginResponse(BaseSchema):
    """登录响应"""
    token: TokenData = Field(..., description="令牌信息")
    user: "UserAuthInfo" = Field(..., description="用户信息")


class UserAuthInfo(BaseSchema):
    """认证用户信息"""
    model_config = ConfigDict(from_attributes=True)
    
    id: str = Field(..., description="用户ID")
    email: EmailStr = Field(..., description="邮箱地址")
    username: str = Field(..., description="用户名")
    full_name: Optional[str] = Field(default=None, description="真实姓名")
    avatar_url: Optional[str] = Field(default=None, description="头像URL")
    role: UserRole = Field(..., description="用户角色")
    is_active: bool = Field(..., description="是否激活")


# ============== 密码相关 ==============

class PasswordChangeRequest(BaseSchema):
    """密码修改请求"""
    current_password: str = Field(..., description="当前密码")
    new_password: str = Field(..., min_length=8, max_length=100, description="新密码")

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, value: str) -> str:
        return validate_password_strength(value)


class SecurityQuestionRequest(BaseSchema):
    username: str = Field(..., description="用户名或邮箱")


class SecurityQuestionResponse(BaseSchema):
    username: str = Field(..., description="用户名")
    security_question: str = Field(..., description="密保问题")
    is_legacy: bool = Field(False, description="是否为未设置密保问题的旧用户")


class PasswordResetRequest(BaseSchema):
    username: str = Field(..., description="用户名或邮箱")
    new_password: str = Field(..., min_length=8, max_length=100, description="新密码")
    security_answer: str = Field(..., min_length=1, max_length=100, description="密保答案")

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, value: str) -> str:
        return validate_password_strength(value)


# ============== 当前用户信息 ==============

class CurrentUserResponse(BaseSchema):
    """当前用户信息响应"""
    model_config = ConfigDict(from_attributes=True)
    
    id: str = Field(..., description="用户ID")
    email: EmailStr = Field(..., description="邮箱地址")
    username: str = Field(..., description="用户名")
    full_name: Optional[str] = Field(default=None, description="真实姓名")
    avatar_url: Optional[str] = Field(default=None, description="头像URL")
    role: UserRole = Field(..., description="用户角色")
    status: str = Field(..., description="用户状态")
    is_active: bool = Field(..., description="是否激活")
    last_login_at: Optional[datetime] = Field(default=None, description="最后登录时间")
    login_count: int = Field(default=0, description="登录次数")
    permissions: list[str] = Field(default_factory=list, description="权限列表")


# ============== 令牌载荷（内部使用） ==============

class TokenPayload(BaseSchema):
    """JWT令牌载荷"""
    sub: str = Field(..., description="用户ID")
    exp: datetime = Field(..., description="过期时间")
    type: str = Field(..., description="令牌类型")
    iat: datetime = Field(..., description="签发时间")
    jti: Optional[str] = Field(default=None, description="JWT ID")
    token_version: Optional[int] = Field(default=None, description="令牌版本")


# 解决前向引用
LoginResponse.model_rebuild()

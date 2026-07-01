"""
用户相关Schemas模块
定义用户数据的Pydantic模型
"""

from datetime import datetime
from typing import Optional

from pydantic import ConfigDict, EmailStr, Field, field_validator

from app.models.user import UserRole, UserStatus
from app.schemas.base import AuditSchema, BaseSchema

# ============== 基础字段 ==============


class UserBase(BaseSchema):
    """用户基础信息"""

    email: EmailStr = Field(..., description="邮箱地址")
    username: str = Field(..., min_length=3, max_length=50, description="用户名")
    full_name: Optional[str] = Field(default=None, max_length=100, description="真实姓名")
    phone: Optional[str] = Field(default=None, max_length=20, description="手机号码")
    bio: Optional[str] = Field(default=None, max_length=500, description="个人简介")
    avatar_url: Optional[str] = Field(default=None, max_length=500, description="头像URL")


# ============== 创建请求 ==============


class UserCreate(UserBase):
    """用户创建请求"""

    password: str = Field(..., min_length=8, max_length=100, description="密码")

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        """验证密码强度"""
        if len(v) < 8:
            raise ValueError("密码长度至少8位")
        if not any(c.isupper() for c in v):
            raise ValueError("密码必须包含至少一个大写字母")
        if not any(c.islower() for c in v):
            raise ValueError("密码必须包含至少一个小写字母")
        if not any(c.isdigit() for c in v):
            raise ValueError("密码必须包含至少一个数字")
        return v


# ============== 更新请求 ==============


class UserUpdate(BaseSchema):
    """用户更新请求"""

    email: Optional[EmailStr] = Field(default=None, description="邮箱地址")
    username: Optional[str] = Field(default=None, min_length=3, max_length=50, description="用户名")
    full_name: Optional[str] = Field(default=None, max_length=100, description="真实姓名")
    phone: Optional[str] = Field(default=None, max_length=20, description="手机号码")
    bio: Optional[str] = Field(default=None, max_length=500, description="个人简介")
    avatar_url: Optional[str] = Field(default=None, max_length=500, description="头像URL")


class UserPasswordUpdate(BaseSchema):
    """用户密码更新请求"""

    current_password: str = Field(..., description="当前密码")
    new_password: str = Field(..., min_length=8, max_length=100, description="新密码")

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        """验证新密码强度"""
        if len(v) < 8:
            raise ValueError("密码长度至少8位")
        if not any(c.isupper() for c in v):
            raise ValueError("密码必须包含至少一个大写字母")
        if not any(c.islower() for c in v):
            raise ValueError("密码必须包含至少一个小写字母")
        if not any(c.isdigit() for c in v):
            raise ValueError("密码必须包含至少一个数字")
        return v


# ============== 响应模型 ==============


class UserInDB(AuditSchema):
    """数据库中的用户（包含敏感信息）"""

    model_config = ConfigDict(from_attributes=True)

    id: str = Field(..., description="用户ID")
    email: EmailStr = Field(..., description="邮箱地址")
    username: str = Field(..., description="用户名")
    hashed_password: str = Field(..., description="哈希后的密码")
    full_name: Optional[str] = Field(default=None, description="真实姓名")
    phone: Optional[str] = Field(default=None, description="手机号码")
    bio: Optional[str] = Field(default=None, description="个人简介")
    avatar_url: Optional[str] = Field(default=None, description="头像URL")
    role: UserRole = Field(..., description="用户角色")
    status: UserStatus = Field(..., description="用户状态")
    is_active: bool = Field(..., description="是否激活")
    last_login_at: Optional[datetime] = Field(default=None, description="最后登录时间")
    last_login_ip: Optional[str] = Field(default=None, description="最后登录IP")
    login_count: int = Field(default=0, description="登录次数")
    token_version: int = Field(default=1, description="令牌版本")


class UserResponse(AuditSchema):
    """用户响应模型（公开信息）"""

    model_config = ConfigDict(from_attributes=True)

    id: str = Field(..., description="用户ID")
    email: EmailStr = Field(..., description="邮箱地址")
    username: str = Field(..., description="用户名")
    full_name: Optional[str] = Field(default=None, description="真实姓名")
    phone: Optional[str] = Field(default=None, description="手机号码")
    bio: Optional[str] = Field(default=None, description="个人简介")
    avatar_url: Optional[str] = Field(default=None, description="头像URL")
    role: UserRole = Field(..., description="用户角色")
    status: UserStatus = Field(..., description="用户状态")
    is_active: bool = Field(..., description="是否激活")
    last_login_at: Optional[datetime] = Field(default=None, description="最后登录时间")


class UserProfileResponse(UserResponse):
    """用户个人资料响应（包含更多个人信息）"""

    login_count: int = Field(default=0, description="登录次数")


class UserListResponse(BaseSchema):
    """用户列表响应"""

    data: list[UserResponse] = Field(default=[], description="用户列表")
    total: int = Field(default=0, description="总数量")
    page: int = Field(default=1, description="当前页码")
    page_size: int = Field(default=20, description="每页数量")
    pages: int = Field(default=1, description="总页数")


# ============== 其他 ==============


class UserAvatarUpdate(BaseSchema):
    """用户头像更新"""

    avatar_url: str = Field(..., description="头像URL")


class UserPasswordReset(BaseSchema):
    """用户密码重置请求"""

    username: str = Field(..., description="用户名或邮箱")
    new_password: str = Field(..., min_length=8, max_length=100, description="新密码")

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("密码长度至少8位")
        if not any(c.isupper() for c in v):
            raise ValueError("密码必须包含至少一个大写字母")
        if not any(c.islower() for c in v):
            raise ValueError("密码必须包含至少一个小写字母")
        if not any(c.isdigit() for c in v):
            raise ValueError("密码必须包含至少一个数字")
        return v

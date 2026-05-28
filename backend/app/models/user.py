"""
用户模型模块
定义用户相关的数据模型
"""
from datetime import datetime, timezone
from enum import Enum as PyEnum
from typing import List, Optional

from sqlalchemy import Boolean, DateTime, Enum, Integer, String, Text, Index, text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel


class UserRole(str, PyEnum):
    """用户角色枚举"""
    ADMIN = "admin"          # 管理员
    TEACHER = "teacher"      # 教师


class UserStatus(str, PyEnum):
    """用户状态枚举"""
    ACTIVE = "active"        # 活跃
    INACTIVE = "inactive"    # 未激活
    SUSPENDED = "suspended"  # 已暂停


class User(BaseModel):
    """
    用户模型
    存储用户基本信息
    """
    __tablename__ = "users"
    
    # 基本信息
    email: Mapped[str] = mapped_column(
        String(255),
        index=True,
        nullable=False,
        comment="邮箱地址"
    )
    
    username: Mapped[str] = mapped_column(
        String(50),
        index=True,
        nullable=False,
        comment="用户名"
    )
    
    hashed_password: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        comment="哈希后的密码"
    )
    
    full_name: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        comment="真实姓名"
    )
    
    avatar_url: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
        comment="头像URL"
    )
    
    phone: Mapped[Optional[str]] = mapped_column(
        String(20),
        nullable=True,
        comment="手机号码"
    )
    
    bio: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="个人简介"
    )
    
    # 角色和状态
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, native_enum=False),
        default=UserRole.TEACHER,
        nullable=False,
        comment="用户角色"
    )
    
    status: Mapped[UserStatus] = mapped_column(
        Enum(UserStatus, native_enum=False),
        default=UserStatus.ACTIVE,
        nullable=False,
        comment="用户状态"
    )
    
    # 账户安全
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        comment="账户是否激活"
    )
    
    # 登录相关
    last_login_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="最后登录时间"
    )
    
    last_login_ip: Mapped[Optional[str]] = mapped_column(
        String(45),
        nullable=True,
        comment="最后登录IP"
    )
    
    login_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        comment="登录次数"
    )
    
    failed_login_attempts: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        comment="连续登录失败次数"
    )
    
    locked_until: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="账户锁定截止时间"
    )
    
    security_question: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
        comment="密保问题"
    )
    
    hashed_security_answer: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        comment="哈希后的密保答案"
    )
    
    failed_reset_attempts: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        comment="密码重置连续失败次数"
    )
    
    reset_locked_until: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="密码重置锁定截止时间"
    )
    
    # 令牌相关（用于实现单点登录或令牌黑名单）
    token_version: Mapped[int] = mapped_column(
        Integer,
        default=1,
        nullable=False,
        comment="令牌版本号"
    )
    
    __table_args__ = (
        Index('ix_users_email_unique', 'email', unique=True, postgresql_where=text('is_deleted = false')),
        Index('ix_users_username_unique', 'username', unique=True, postgresql_where=text('is_deleted = false')),
    )
    
    def __repr__(self) -> str:
        return f"<User(id={self.id}, username={self.username}, email={self.email}, role={self.role})>"
    
    def is_locked(self) -> bool:
        """检查账户是否被锁定"""
        if self.locked_until:
            now = datetime.now(timezone.utc)
            # 确保 locked_until 是 offset-aware
            locked_until = self.locked_until
            if locked_until.tzinfo is None:
                locked_until = locked_until.replace(tzinfo=timezone.utc)
            if locked_until > now:
                return True
        return False
    
    def record_login(self, ip_address: Optional[str] = None) -> None:
        """记录登录信息"""
        self.last_login_at = datetime.now(timezone.utc)
        self.last_login_ip = ip_address
        self.login_count += 1
        self.failed_login_attempts = 0
        self.locked_until = None
    
    def record_failed_login(self) -> None:
        """记录登录失败"""
        self.failed_login_attempts += 1
        # 连续失败5次锁定30分钟
        if self.failed_login_attempts >= 5:
            from datetime import timedelta
            self.locked_until = datetime.now(timezone.utc) + timedelta(minutes=30)
    
    def increment_token_version(self) -> None:
        """增加令牌版本（用于强制重新登录）"""
        self.token_version += 1
    
    def has_role(self, role: UserRole) -> bool:
        """检查是否具有指定角色"""
        return self.role == role
    
    def has_any_role(self, roles: List[UserRole]) -> bool:
        """检查是否具有任一指定角色"""
        return self.role in roles

    def verify_security_answer(self, answer: str) -> bool:
        from app.core.security import pwd_context
        return pwd_context.verify(answer, self.hashed_security_answer)

    def is_reset_locked(self) -> bool:
        if self.reset_locked_until:
            now = datetime.now(timezone.utc)
            reset_locked_until = self.reset_locked_until
            if reset_locked_until.tzinfo is None:
                reset_locked_until = reset_locked_until.replace(tzinfo=timezone.utc)
            if reset_locked_until > now:
                return True
        return False

    def record_failed_reset_attempt(self) -> None:
        self.failed_reset_attempts += 1
        if self.failed_reset_attempts >= 5:
            from datetime import timedelta
            self.reset_locked_until = datetime.now(timezone.utc) + timedelta(minutes=30)

    def reset_reset_lock(self) -> None:
        self.failed_reset_attempts = 0
        self.reset_locked_until = None

"""
权限相关数据模型
定义权限、角色及其关联关系
"""
from sqlalchemy import Boolean, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel


class Permission(BaseModel):
    """权限模型
    
    存储系统中所有可用的权限项，每个权限对应一个具体的操作。
    权限代码格式为：资源:操作，如 course:create, user:read 等。
    """
    __tablename__ = "permissions"
    
    # 权限标识（如 course:create）
    code: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        index=True,
        nullable=False,
        comment="权限代码"
    )
    
    # 权限名称
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="权限名称"
    )
    
    # 权限描述
    description: Mapped[str] = mapped_column(
        Text,
        nullable=True,
        comment="权限描述"
    )
    
    # 资源类型（如 course, assignment, quiz）
    resource: Mapped[str] = mapped_column(
        String(50),
        index=True,
        nullable=False,
        comment="资源类型"
    )
    
    # 操作类型（如 create, read, update, delete）
    action: Mapped[str] = mapped_column(
        String(50),
        index=True,
        nullable=False,
        comment="操作类型"
    )
    
    # 是否启用
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        comment="是否启用"
    )
    
    def __repr__(self) -> str:
        return f"<Permission(code={self.code}, name={self.name})>"


class Role(BaseModel):
    """角色模型
    
    存储系统中的角色定义，每个角色可以拥有一组权限。
    支持系统角色（不可删除）和自定义角色。
    """
    __tablename__ = "roles"
    
    # 角色代码（如 teacher）
    code: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        index=True,
        nullable=False,
        comment="角色代码"
    )
    
    # 角色名称
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="角色名称"
    )
    
    # 角色描述
    description: Mapped[str] = mapped_column(
        Text,
        nullable=True,
        comment="角色描述"
    )
    
    # 是否启用
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        comment="是否启用"
    )
    
    # 是否为系统角色（不可删除）
    is_system: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        comment="是否为系统角色"
    )
    
    def __repr__(self) -> str:
        return f"<Role(code={self.code}, name={self.name})>"


class RolePermission(BaseModel):
    """角色权限关联模型
    
    实现角色和权限的多对多关联关系。
    """
    __tablename__ = "role_permissions"
    
    # 角色ID
    role_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("roles.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
        comment="角色ID"
    )
    
    # 权限ID
    permission_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("permissions.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
        comment="权限ID"
    )

    __table_args__ = (
        UniqueConstraint('role_id', 'permission_id', name='uq_role_permission'),
    )

    def __repr__(self) -> str:
        return f"<RolePermission(role_id={self.role_id}, permission_id={self.permission_id})>"

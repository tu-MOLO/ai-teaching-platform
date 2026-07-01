"""
审计日志模型
记录关键业务操作和数据变更
"""

from enum import Enum as PyEnum
from typing import Any, Dict, Optional

from sqlalchemy import ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel


class AuditAction(str, PyEnum):
    """审计操作类型"""

    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    SOFT_DELETE = "soft_delete"
    RESTORE = "restore"
    LOGIN = "login"
    LOGOUT = "logout"
    EXPORT = "export"
    IMPORT = "import"
    VIEW = "view"


class AuditLog(BaseModel):
    """
    审计日志模型
    记录所有关键业务操作
    """

    __tablename__ = "audit_logs"

    # 操作人信息
    user_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="操作用户ID",
    )

    username: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True, comment="操作用户名（冗余存储，防止用户删除后无法追溯）"
    )

    # 操作信息
    action: Mapped[AuditAction] = mapped_column(nullable=False, index=True, comment="操作类型")

    resource_type: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True, comment="资源类型（如：student, course, user）"
    )

    resource_id: Mapped[Optional[str]] = mapped_column(
        String(36), nullable=True, index=True, comment="资源ID"
    )

    # 操作详情
    description: Mapped[str] = mapped_column(Text, nullable=False, comment="操作描述")

    old_values: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True, comment="变更前的值（JSON格式）"
    )

    new_values: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True, comment="变更后的值（JSON格式）"
    )

    changed_fields: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True, comment="变更的字段列表（JSON数组）"
    )

    # 请求信息
    ip_address: Mapped[Optional[str]] = mapped_column(
        String(45), nullable=True, comment="客户端IP地址"
    )

    user_agent: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True, comment="客户端User-Agent"
    )

    request_path: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True, comment="请求路径"
    )

    request_method: Mapped[Optional[str]] = mapped_column(
        String(10), nullable=True, comment="请求方法"
    )

    # 执行结果
    success: Mapped[bool] = mapped_column(default=True, nullable=False, comment="操作是否成功")

    error_message: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True, comment="错误信息（失败时记录）"
    )

    # 执行时间（毫秒）
    execution_time: Mapped[Optional[int]] = mapped_column(nullable=True, comment="执行时间（毫秒）")

    # 索引优化
    __table_args__ = (
        Index("ix_audit_logs_created_at", "created_at"),
        Index("ix_audit_logs_user_action", "user_id", "action"),
        Index("ix_audit_logs_resource", "resource_type", "resource_id"),
    )

    def __repr__(self) -> str:
        return (
            f"<AuditLog(id={self.id}, action={self.action},"
            f" resource={self.resource_type}, user={self.username})>"
        )


class AuditLogBuilder:
    """
    审计日志构建器
    简化审计日志的创建
    """

    def __init__(self):
        self._data: Dict[str, Any] = {}

    def user(self, user_id: str, username: str) -> "AuditLogBuilder":
        """设置操作用户"""
        self._data["user_id"] = user_id
        self._data["username"] = username
        return self

    def action(self, action: AuditAction) -> "AuditLogBuilder":
        """设置操作类型"""
        self._data["action"] = action
        return self

    def resource(self, resource_type: str, resource_id: Optional[str] = None) -> "AuditLogBuilder":
        """设置资源信息"""
        self._data["resource_type"] = resource_type
        self._data["resource_id"] = resource_id
        return self

    def description(self, description: str) -> "AuditLogBuilder":
        """设置操作描述"""
        self._data["description"] = description
        return self

    def changes(
        self,
        old_values: Optional[Dict] = None,
        new_values: Optional[Dict] = None,
        changed_fields: Optional[list] = None,
    ) -> "AuditLogBuilder":
        """设置变更内容"""
        import json

        if old_values:
            self._data["old_values"] = json.dumps(old_values, ensure_ascii=False, default=str)
        if new_values:
            self._data["new_values"] = json.dumps(new_values, ensure_ascii=False, default=str)
        if changed_fields:
            self._data["changed_fields"] = json.dumps(changed_fields, ensure_ascii=False)
        return self

    def request_info(
        self,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        path: Optional[str] = None,
        method: Optional[str] = None,
    ) -> "AuditLogBuilder":
        """设置请求信息"""
        self._data["ip_address"] = ip_address
        self._data["user_agent"] = user_agent
        self._data["request_path"] = path
        self._data["request_method"] = method
        return self

    def result(
        self,
        success: bool = True,
        error_message: Optional[str] = None,
        execution_time: Optional[int] = None,
    ) -> "AuditLogBuilder":
        """设置执行结果"""
        self._data["success"] = success
        self._data["error_message"] = error_message
        self._data["execution_time"] = execution_time
        return self

    def build(self) -> AuditLog:
        """构建审计日志对象"""
        return AuditLog(**self._data)


def log_audit_action(
    db_session,
    action: AuditAction,
    resource_type: str,
    description: str,
    user_id: Optional[str] = None,
    username: Optional[str] = None,
    resource_id: Optional[str] = None,
    old_values: Optional[Dict] = None,
    new_values: Optional[Dict] = None,
    changed_fields: Optional[list] = None,
    request=None,
    success: bool = True,
    error_message: Optional[str] = None,
    execution_time: Optional[int] = None,
) -> AuditLog:
    """
    记录审计日志的便捷函数

    Args:
        db_session: 数据库会话
        action: 操作类型
        resource_type: 资源类型
        description: 操作描述
        user_id: 操作用户ID
        username: 操作用户名
        resource_id: 资源ID
        old_values: 变更前的值
        new_values: 变更后的值
        changed_fields: 变更的字段列表
        request: HTTP请求对象
        success: 是否成功
        error_message: 错误信息
        execution_time: 执行时间（毫秒）

    Returns:
        创建的审计日志对象
    """
    builder = AuditLogBuilder()

    if user_id and username:
        builder.user(user_id, username)

    builder.action(action).resource(resource_type, resource_id).description(description)

    if old_values or new_values or changed_fields:
        builder.changes(old_values, new_values, changed_fields)

    if request:
        ip = None
        user_agent = None
        path = str(request.url.path) if hasattr(request, "url") else None
        method = request.method if hasattr(request, "method") else None

        if hasattr(request, "client") and request.client:
            ip = request.client.host

        if hasattr(request, "headers"):
            user_agent = request.headers.get("user-agent")
            forwarded_for = request.headers.get("x-forwarded-for")
            if forwarded_for:
                ip = forwarded_for.split(",")[0].strip()

        builder.request_info(ip, user_agent, path, method)

    builder.result(success, error_message, execution_time)

    log = builder.build()
    db_session.add(log)

    return log

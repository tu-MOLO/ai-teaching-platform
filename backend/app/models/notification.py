"""
通知模型模块
定义用户通知相关的数据模型
"""
from enum import Enum as PyEnum
from typing import TYPE_CHECKING, Optional

from sqlalchemy import String, Text, Boolean, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel

if TYPE_CHECKING:
    from app.models.user import User


class NotificationType(str, PyEnum):
    """通知类型枚举"""
    SYSTEM = "system"        # 系统通知
    COURSE = "course"        # 课程相关
    HOMEWORK = "homework"    # 作业相关
    EXAM = "exam"            # 考试相关
    MESSAGE = "message"      # 消息通知
    REMINDER = "reminder"    # 提醒通知


class Notification(BaseModel):
    """
    通知模型
    存储用户通知信息
    """
    __tablename__ = "notifications"
    
    # 关联用户
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="用户ID"
    )
    
    # 通知标题
    title: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
        comment="通知标题"
    )
    
    # 通知内容
    content: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        comment="通知内容"
    )
    
    # 通知类型
    type: Mapped[NotificationType] = mapped_column(
        SQLEnum(NotificationType, native_enum=False),
        default=NotificationType.SYSTEM,
        nullable=False,
        index=True,
        comment="通知类型"
    )
    
    # 是否已读
    read: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        index=True,
        comment="是否已读"
    )
    
    # 关联对象ID（可选，用于跳转到具体页面）
    target_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        nullable=True,
        comment="关联对象ID"
    )
    
    # 关联对象类型（可选）
    target_type: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        comment="关联对象类型"
    )
    
    # 关系
    user: Mapped["User"] = relationship("User")
    
    def __repr__(self) -> str:
        return f"<Notification(id={self.id}, user_id={self.user_id}, title={self.title}, read={self.read})>"
    
    def mark_as_read(self) -> None:
        """标记为已读"""
        self.read = True
    
    def mark_as_unread(self) -> None:
        """标记为未读"""
        self.read = False

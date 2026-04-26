"""
课程数据模型
"""
from enum import Enum as PyEnum
from typing import TYPE_CHECKING, Optional

from sqlalchemy import String, Index, Text, Enum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel

if TYPE_CHECKING:
    from app.models.user import User


class CourseStatus(str, PyEnum):
    """课程状态枚举"""
    ACTIVE = "active"        # 进行中
    INACTIVE = "inactive"    # 已结课
    DRAFT = "draft"          # 草稿


class Course(BaseModel):
    """课程模型"""
    __tablename__ = "courses"

    name: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
        index=True,
        comment="课程名称"
    )

    subject: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
        comment="学科"
    )

    grade: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
        comment="年级"
    )

    teacher: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="授课教师"
    )

    # 外键关联到用户表（创建者/主讲教师）
    user_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
        comment="关联用户ID"
    )

    schedule: Mapped[str] = mapped_column(
        String(500),
        nullable=True,
        comment="课程安排"
    )

    description: Mapped[str] = mapped_column(
        Text,
        nullable=True,
        comment="课程描述"
    )

    status: Mapped[CourseStatus] = mapped_column(
        Enum(CourseStatus, native_enum=False),
        default=CourseStatus.DRAFT,
        nullable=False,
        comment="课程状态"
    )

    # 关联关系
    user: Mapped[Optional["User"]] = relationship(
        "User",
        lazy="selectin"
    )

    # 复合索引
    __table_args__ = (
        Index('ix_courses_subject_grade', 'subject', 'grade'),
        Index('ix_courses_status', 'status'),
    )

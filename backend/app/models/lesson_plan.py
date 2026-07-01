"""
教案数据模型
"""

import enum
from typing import Optional

from sqlalchemy import Enum as SQLEnum
from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel


class LessonPlanStatus(str, enum.Enum):
    """教案状态枚举"""

    DRAFT = "draft"  # 草稿
    PUBLISHED = "published"  # 已发布
    ARCHIVED = "archived"  # 已归档


class LessonPlan(BaseModel):
    """
    教案模型
    存储教学教案信息
    """

    __tablename__ = "lesson_plans"

    # 关联用户（创建者）
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="用户ID",
    )

    # 关联教案模板（可选）
    template_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("lesson_templates.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="模板ID",
    )

    # 基本信息
    title: Mapped[str] = mapped_column(String(200), nullable=False, comment="教案标题")

    subject: Mapped[str] = mapped_column(String(100), nullable=False, index=True, comment="学科")

    grade: Mapped[str] = mapped_column(String(50), nullable=False, index=True, comment="年级")

    duration: Mapped[int] = mapped_column(nullable=False, comment="课时时长（分钟）")

    # 教学内容
    teaching_objectives: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True, comment="教学目标"
    )

    teaching_content: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment="教学内容")

    teaching_methods: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment="教学方法")

    teaching_process: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment="教学过程")

    teaching_resources: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True, comment="教学资源"
    )

    # 状态
    status: Mapped[LessonPlanStatus] = mapped_column(
        SQLEnum(LessonPlanStatus, native_enum=False),
        default=LessonPlanStatus.DRAFT,
        nullable=False,
        index=True,
        comment="教案状态",
    )

    # 备注
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment="备注")

    def __repr__(self) -> str:
        return (
            f"<LessonPlan(id={self.id}, title={self.title},"
            f" subject={self.subject}, status={self.status})>"
        )

    def publish(self) -> None:
        """发布教案"""
        self.status = LessonPlanStatus.PUBLISHED

    def archive(self) -> None:
        """归档教案"""
        self.status = LessonPlanStatus.ARCHIVED

    def is_published(self) -> bool:
        """检查是否已发布"""
        return self.status == LessonPlanStatus.PUBLISHED

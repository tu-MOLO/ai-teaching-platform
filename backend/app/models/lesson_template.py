"""
教案模板数据模型
"""

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel


class LessonTemplate(BaseModel):
    """
    教案模板模型
    """

    __tablename__ = "lesson_templates"

    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True, comment="模板名称")

    description: Mapped[str] = mapped_column(Text, nullable=True, comment="模板描述")

    structure: Mapped[str] = mapped_column(Text, nullable=False, comment="模板结构（JSON格式）")

    is_default: Mapped[bool] = mapped_column(default=False, nullable=False, comment="是否默认模板")

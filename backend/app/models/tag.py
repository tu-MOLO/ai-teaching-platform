"""
标签数据模型
"""

from sqlalchemy import Index, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel
from app.models.resource import resource_tag_association


class Tag(BaseModel):
    """
    标签模型
    """

    __tablename__ = "tags"

    name: Mapped[str] = mapped_column(String(50), nullable=False, comment="标签名称")

    description: Mapped[str] = mapped_column(Text, nullable=True, comment="标签描述")

    color: Mapped[str] = mapped_column(String(20), nullable=True, comment="标签颜色")

    # 关系
    resources = relationship("Resource", secondary=resource_tag_association, back_populates="tags")

    __table_args__ = (
        Index(
            "ix_tags_name_unique", "name", unique=True, postgresql_where=text("is_deleted = false")
        ),
    )

    def __repr__(self) -> str:
        return f"<Tag(id='{self.id}', name='{self.name}')>"

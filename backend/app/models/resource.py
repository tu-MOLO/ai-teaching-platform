"""
资源数据模型
"""
from sqlalchemy import String, Text, Integer, ForeignKey, Table
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import BaseModel

# 资源和标签的多对多关联表
from sqlalchemy import Column

resource_tag_association = Table(
    'resource_tag_association',
    Base.metadata,
    Column('resource_id', String(36), ForeignKey(
        'resources.id', ondelete='CASCADE'), primary_key=True),
    Column('tag_id', String(36), ForeignKey('tags.id', ondelete='CASCADE'), primary_key=True)
)


class Resource(BaseModel):
    """
    资源模型
    """
    __tablename__ = "resources"

    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        comment="资源名称"
    )

    description: Mapped[str] = mapped_column(
        Text,
        nullable=True,
        comment="资源描述"
    )

    file_path: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
        comment="文件存储路径"
    )

    file_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        comment="原始文件名"
    )

    file_size: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        comment="文件大小（字节）"
    )

    file_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
        comment="文件类型"
    )

    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey('users.id', ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="创建者ID"
    )

    # 关系
    tags = relationship(
        "Tag",
        secondary=resource_tag_association,
        back_populates="resources"
    )

    def __repr__(self) -> str:
        return f"<Resource(id='{self.id}', name='{self.name}', file_name='{self.file_name}')>"

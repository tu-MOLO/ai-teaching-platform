"""
基础模型模块
定义所有模型的基类和通用字段
"""
from datetime import datetime, timezone
from typing import Any, Optional
from uuid import uuid4

from sqlalchemy import DateTime, String, func, Integer
from sqlalchemy.orm import Mapped, mapped_column, declared_attr

from app.core.database import Base


class TimestampMixin:
    """时间戳混入类"""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        comment="创建时间"
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        comment="更新时间"
    )


class SoftDeleteMixin:
    """软删除混入类"""

    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        default=None,
        comment="删除时间（软删除）"
    )

    is_deleted: Mapped[bool] = mapped_column(
        default=False,
        nullable=False,
        comment="是否已删除"
    )

    def soft_delete(self) -> None:
        """软删除当前记录"""
        self.is_deleted = True
        self.deleted_at = datetime.now(timezone.utc)

    def restore(self) -> None:
        """恢复软删除的记录"""
        self.is_deleted = False
        self.deleted_at = None


class UUIDMixin:
    """UUID主键混入类"""

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid4()),
        comment="唯一标识符"
    )


class VersionMixin:
    """乐观锁版本混入类"""

    version: Mapped[int] = mapped_column(
        Integer,
        default=1,
        nullable=False,
        comment="乐观锁版本号"
    )


class BaseModel(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin, VersionMixin):
    """
    基础模型类
    所有业务模型都应继承此类
    """
    __abstract__ = True

    @declared_attr.directive
    def __table_args__(cls):
        """
        默认表参数
        添加软删除过滤器的注释说明
        """
        return {
            'comment': f'{cls.__name__}表'
        }

    def to_dict(self, exclude: Optional[set] = None,
                include: Optional[set] = None) -> dict[str, Any]:
        """
        将模型转换为字典

        Args:
            exclude: 要排除的字段集合
            include: 要包含的字段集合（优先级高于exclude）

        Returns:
            模型数据的字典表示
        """
        data = {}
        exclude = exclude or set()

        for column in self.__table__.columns:
            key = column.name

            # 如果指定了include，只包含指定字段
            if include and key not in include:
                continue

            # 跳过排除的字段
            if key in exclude:
                continue

            value = getattr(self, key)

            # 处理datetime类型
            if isinstance(value, datetime):
                value = value.isoformat()

            data[key] = value

        return data

    def increment_version(self) -> None:
        """增加版本号（用于乐观锁）"""
        self.version += 1

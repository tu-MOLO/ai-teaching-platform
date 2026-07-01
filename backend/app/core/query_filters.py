"""
查询过滤器模块
提供全局查询过滤功能，如软删除过滤
"""

from contextlib import contextmanager
from contextvars import ContextVar
from typing import Any, Optional, Type, TypeVar

from sqlalchemy import event
from sqlalchemy.orm import Query, Session

from app.core.database import Base

T = TypeVar("T", bound=Base)


class SoftDeleteFilter:
    """软删除查询过滤器"""

    _enabled_var: ContextVar[bool] = ContextVar("soft_delete_filter_enabled", default=True)

    @classmethod
    def enable(cls):
        """启用软删除过滤"""
        cls._enabled_var.set(True)

    @classmethod
    def disable(cls):
        """禁用软删除过滤（用于查询已删除数据）"""
        cls._enabled_var.set(False)

    @classmethod
    def is_enabled(cls) -> bool:
        """检查软删除过滤是否启用"""
        return cls._enabled_var.get()


@contextmanager
def include_deleted():
    """
    上下文管理器：临时包含已删除的数据

    使用示例：
        with include_deleted():
            # 这里的查询会包含软删除的数据
            deleted_users = db.query(User).filter(User.is_deleted == True).all()  # noqa: E712
    """
    token = SoftDeleteFilter._enabled_var.set(False)
    try:
        yield
    finally:
        SoftDeleteFilter._enabled_var.reset(token)


def apply_soft_delete_filter(query: Query, model_class: Optional[Type[T]] = None) -> Query:
    """
    应用软删除过滤器到查询

    Args:
        query: SQLAlchemy 查询对象
        model_class: 模型类（可选）

    Returns:
        过滤后的查询对象
    """
    if not SoftDeleteFilter.is_enabled():
        return query

    # 检查查询的实体是否有 is_deleted 字段
    for entity in query.column_descriptions:
        model = entity.get("entity")
        if model and hasattr(model, "is_deleted"):
            query = query.filter(model.is_deleted == False)  # type: ignore[union-attr] # noqa: E712

    return query


def setup_soft_delete_filter():
    """
    设置全局软删除过滤器
    在应用启动时调用
    """
    from sqlalchemy.orm import with_loader_criteria

    from app.models.base import BaseModel

    @event.listens_for(Session, "do_orm_execute")
    def _add_soft_delete_filter(execute_state):
        """
        自动添加软删除过滤条件
        """
        if not SoftDeleteFilter.is_enabled():
            return

        if execute_state.is_select:
            execute_state.statement = execute_state.statement.options(
                with_loader_criteria(
                    BaseModel,
                    lambda cls: cls.is_deleted == False,  # noqa: E712
                    include_aliases=True,
                )
            )


class OptimisticLockError(Exception):
    """乐观锁冲突异常"""

    def __init__(
        self,
        message: str = "数据已被其他用户修改，请刷新后重试",
        expected_version: Optional[int] = None,
        actual_version: Optional[int] = None,
    ):
        self.message = message
        self.expected_version = expected_version
        self.actual_version = actual_version
        super().__init__(self.message)


def check_version_and_update(model_instance: Any, expected_version: int, update_data: dict) -> bool:
    """
    检查版本号并更新数据（乐观锁）

    Args:
        model_instance: 模型实例
        expected_version: 期望的版本号
        update_data: 要更新的数据字典

    Returns:
        更新是否成功

    Raises:
        OptimisticLockError: 版本号不匹配时抛出
    """
    if model_instance.version != expected_version:
        raise OptimisticLockError(
            expected_version=expected_version, actual_version=model_instance.version
        )

    # 更新数据
    for field, value in update_data.items():
        if hasattr(model_instance, field):
            setattr(model_instance, field, value)

    # 增加版本号
    model_instance.increment_version()

    return True

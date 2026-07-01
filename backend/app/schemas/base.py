"""
基础响应模型模块
定义通用的Pydantic模型
"""

from datetime import datetime
from typing import Any, Dict, Generic, List, Optional, TypeVar

from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class BaseSchema(BaseModel):
    """基础Schema类"""

    model_config = ConfigDict(
        from_attributes=True,  # 允许从ORM模型创建
        populate_by_name=True,  # 允许通过字段名填充
        str_strip_whitespace=True,  # 自动去除字符串首尾空格
    )


class ResponseBase(BaseSchema):
    """基础响应模型"""


class DataResponse(ResponseBase, Generic[T]):
    """
    数据响应模型
    用于返回单个数据对象
    """

    data: T = Field(..., description="响应数据")


class ListResponse(ResponseBase, Generic[T]):
    """
    列表响应模型
    用于返回数据列表
    """

    data: List[T] = Field(default_factory=list, description="数据列表")
    total: int = Field(default=0, description="总记录数")
    page: int = Field(default=1, description="当前页码")
    page_size: int = Field(default=20, description="每页数量")
    pages: int = Field(default=1, description="总页数")


class MessageResponse(ResponseBase):
    """
    消息响应模型
    用于返回简单的消息
    """

    message: str = Field(..., description="消息内容")
    code: str = Field(default="success", description="响应代码")


class ErrorResponse(ResponseBase):
    """
    错误响应模型
    用于返回错误信息
    """

    error: str = Field(..., description="错误信息")
    code: str = Field(default="error", description="错误代码")
    details: Optional[Dict[str, Any]] = Field(default=None, description="错误详情")


class ValidationErrorResponse(ErrorResponse):
    """
    验证错误响应模型
    用于返回参数验证错误
    """

    errors: List[Dict[str, Any]] = Field(default_factory=list, description="验证错误列表")


class PaginationParams(BaseSchema):
    """
    分页参数模型
    用于接收分页请求参数
    """

    page: int = Field(default=1, ge=1, description="页码")
    page_size: int = Field(default=20, ge=1, le=100, description="每页数量")

    @property
    def offset(self) -> int:
        """计算偏移量"""
        return (self.page - 1) * self.page_size


class SortParams(BaseSchema):
    """
    排序参数模型
    用于接收排序请求参数
    """

    sort_by: Optional[str] = Field(default=None, description="排序字段")
    sort_order: str = Field(default="desc", pattern="^(asc|desc)$", description="排序方向")


class IDResponse(ResponseBase):
    """
    ID响应模型
    用于返回创建的资源ID
    """

    id: str = Field(..., description="资源ID")


class TimestampSchema(BaseSchema):
    """
    时间戳Schema
    包含创建和更新时间
    """

    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")


class SoftDeleteSchema(BaseSchema):
    """
    软删除Schema
    包含软删除相关字段
    """

    is_deleted: bool = Field(default=False, description="是否已删除")
    deleted_at: Optional[datetime] = Field(default=None, description="删除时间")


class AuditSchema(TimestampSchema, SoftDeleteSchema):
    """
    审计Schema
    包含完整的审计字段
    """

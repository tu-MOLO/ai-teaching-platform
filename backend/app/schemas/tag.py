"""
标签相关的Pydantic schemas
"""
from typing import Optional
from pydantic import Field, field_validator

from app.schemas.base import BaseSchema, AuditSchema


class TagBase(BaseSchema):
    """
    标签基础模型
    """
    name: str = Field(..., min_length=1, max_length=50, description="标签名称")
    description: Optional[str] = Field(None, description="标签描述")
    color: Optional[str] = Field(None, description="标签颜色")


class TagCreate(TagBase):
    """
    创建标签模型
    """
    pass


class TagUpdate(BaseSchema):
    """
    更新标签模型
    """
    name: Optional[str] = Field(None, min_length=1, max_length=50, description="标签名称")
    description: Optional[str] = Field(None, description="标签描述")
    color: Optional[str] = Field(None, description="标签颜色")


class TagResponse(TagBase, AuditSchema):
    """
    标签响应模型
    """
    id: str = Field(..., description="标签ID")


class TagListResponse(BaseSchema):
    """
    标签列表响应模型
    """
    id: str = Field(..., description="标签ID")
    name: str = Field(..., description="标签名称")
    color: Optional[str] = Field(None, description="标签颜色")

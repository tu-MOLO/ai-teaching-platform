"""
资源相关的Pydantic schemas
"""
from typing import List, Optional
from pydantic import Field, field_validator

from app.schemas.base import BaseSchema, AuditSchema, PaginationParams
from app.schemas.tag import TagListResponse


class ResourceBase(BaseSchema):
    """
    资源基础模型
    """
    name: str = Field(..., min_length=1, max_length=255, description="资源名称")
    description: Optional[str] = Field(None, description="资源描述")
    tag_ids: List[str] = Field(default_factory=list, description="标签ID列表")


class ResourceCreate(ResourceBase):
    """
    创建资源模型
    """
    pass


class ResourceUpdate(BaseSchema):
    """
    更新资源模型
    """
    name: Optional[str] = Field(None, min_length=1, max_length=255, description="资源名称")
    description: Optional[str] = Field(None, description="资源描述")
    tag_ids: Optional[List[str]] = Field(None, description="标签ID列表")


class ResourceResponse(ResourceBase, AuditSchema):
    """
    资源响应模型
    """
    id: str = Field(..., description="资源ID")
    file_name: str = Field(..., description="原始文件名")
    file_size: int = Field(..., description="文件大小（字节）")
    file_type: str = Field(..., description="文件类型")
    user_id: str = Field(..., description="创建者ID")
    tags: List[TagListResponse] = Field(default_factory=list, description="资源标签")
    file_url: Optional[str] = Field(None, description="文件下载URL")


class ResourceListResponse(BaseSchema):
    """
    资源列表响应模型
    """
    id: str = Field(..., description="资源ID")
    name: str = Field(..., description="资源名称")
    file_name: str = Field(..., description="原始文件名")
    file_size: int = Field(..., description="文件大小（字节）")
    file_type: str = Field(..., description="文件类型")
    user_id: str = Field(..., description="创建者ID")
    tags: List[TagListResponse] = Field(default_factory=list, description="资源标签")
    created_at: str = Field(..., description="创建时间")


class ResourceSearchParams(PaginationParams):
    """
    资源搜索参数模型
    """
    keyword: Optional[str] = Field(None, description="搜索关键词")
    tag_ids: Optional[List[str]] = Field(None, description="标签ID列表")
    file_type: Optional[str] = Field(None, description="文件类型")
    user_id: Optional[str] = Field(None, description="创建者ID")

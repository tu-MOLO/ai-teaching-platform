"""
教案模板相关的Pydantic schemas
"""
from pydantic import Field, ConfigDict, field_validator
from datetime import datetime
from typing import Optional

from app.schemas.base import BaseSchema


class LessonTemplateBase(BaseSchema):
    """
    教案模板基础schema
    """
    name: str = Field(..., max_length=255, description="模板名称")
    description: Optional[str] = Field(None, description="模板描述")
    structure: str = Field(..., description="模板结构（JSON格式）")
    is_default: bool = Field(False, description="是否默认模板")

    @field_validator('structure')
    @classmethod
    def validate_structure_json(cls, v):
        if v is None:
            return v
        import json
        try:
            json.loads(v)
        except (json.JSONDecodeError, TypeError):
            raise ValueError("模板结构必须是有效的JSON格式")
        return v


class LessonTemplateCreate(LessonTemplateBase):
    """
    创建教案模板的schema
    """
    pass


class LessonTemplateUpdate(BaseSchema):
    """
    更新教案模板的schema
    """
    name: Optional[str] = Field(None, description="模板名称")
    description: Optional[str] = Field(None, description="模板描述")
    structure: Optional[str] = Field(None, description="模板结构（JSON格式）")
    is_default: Optional[bool] = Field(None, description="是否默认模板")


class LessonTemplateResponse(LessonTemplateBase):
    """
    教案模板响应的schema
    """
    id: str = Field(..., description="模板ID")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")
    
    model_config = ConfigDict(from_attributes=True)

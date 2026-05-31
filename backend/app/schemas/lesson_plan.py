"""
教案相关的Pydantic schemas
"""
from pydantic import Field, ConfigDict
from datetime import datetime
from typing import Optional
from enum import Enum

from app.schemas.base import BaseSchema


class LessonPlanStatus(str, Enum):
    """
    教案状态枚举
    """
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class LessonPlanBase(BaseSchema):
    """
    教案基础schema
    """
    title: str = Field(..., max_length=200, description="教案标题")
    subject: str = Field(..., max_length=100, description="学科")
    grade: str = Field(..., max_length=50, description="年级")
    duration: int = Field(..., gt=0, le=480, description="课时时长（分钟）")
    teaching_objectives: Optional[str] = Field(None, description="教学目标")
    teaching_content: Optional[str] = Field(None, description="教学内容")
    teaching_methods: Optional[str] = Field(None, description="教学方法")
    teaching_process: Optional[str] = Field(None, description="教学过程")
    teaching_resources: Optional[str] = Field(None, description="教学资源")
    notes: Optional[str] = Field(None, description="备注")


class LessonPlanCreate(LessonPlanBase):
    """
    创建教案的schema
    """
    status: Optional[LessonPlanStatus] = Field(None, description="教案状态")


class LessonPlanUpdate(BaseSchema):
    """
    更新教案的schema
    """
    title: Optional[str] = Field(None, max_length=200, description="教案标题")
    subject: Optional[str] = Field(None, max_length=100, description="学科")
    grade: Optional[str] = Field(None, max_length=50, description="年级")
    duration: Optional[int] = Field(None, gt=0, le=480, description="课时时长（分钟）")
    teaching_objectives: Optional[str] = Field(None, description="教学目标")
    teaching_content: Optional[str] = Field(None, description="教学内容")
    teaching_methods: Optional[str] = Field(None, description="教学方法")
    teaching_process: Optional[str] = Field(None, description="教学过程")
    teaching_resources: Optional[str] = Field(None, description="教学资源")
    notes: Optional[str] = Field(None, description="备注")


class LessonPlanResponse(LessonPlanBase):
    """
    教案响应的schema
    """
    id: str = Field(..., description="教案ID")
    status: LessonPlanStatus = Field(..., description="教案状态")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")

    model_config = ConfigDict(from_attributes=True)

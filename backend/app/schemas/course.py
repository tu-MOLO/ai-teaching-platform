"""
课程相关的 Pydantic schemas
"""
from typing import Literal, Optional

from pydantic import Field

from app.schemas.base import AuditSchema, BaseSchema


class CourseBase(BaseSchema):
    """课程基础模型"""

    name: str = Field(..., description="课程名称", max_length=200)
    subject: str = Field(..., description="学科", max_length=100)
    grade: str = Field(..., description="年级", max_length=50)
    teacher: Optional[str] = Field(None, description="授课教师（服务端自动填充）", max_length=100)
    schedule: Optional[str] = Field(None, description="课程安排", max_length=500)
    description: Optional[str] = Field(None, description="课程描述")
    status: Literal["active", "inactive", "draft"] = Field(default="draft", description="课程状态")


class CourseCreate(BaseSchema):
    """创建课程模型"""
    name: str = Field(..., description="课程名称", max_length=200)
    subject: str = Field(..., description="学科", max_length=100)
    grade: str = Field(..., description="年级", max_length=50)
    schedule: Optional[str] = Field(None, description="课程安排", max_length=500)
    description: Optional[str] = Field(None, description="课程描述")
    status: Literal["active", "inactive", "draft"] = Field(default="draft", description="课程状态")


class CourseUpdate(BaseSchema):
    """更新课程模型"""

    name: Optional[str] = Field(None, description="课程名称", max_length=200)
    subject: Optional[str] = Field(None, description="学科", max_length=100)
    grade: Optional[str] = Field(None, description="年级", max_length=50)
    teacher: Optional[str] = Field(None, description="授课教师", max_length=100)
    schedule: Optional[str] = Field(None, description="课程安排", max_length=500)
    description: Optional[str] = Field(None, description="课程描述")
    status: Optional[Literal["active", "inactive", "draft"]] = Field(None, description="课程状态")


class CourseInDB(CourseBase, AuditSchema):
    """数据库中的课程模型"""

    id: str = Field(..., description="课程ID")


class CourseResponse(CourseInDB):
    """课程响应模型"""

"""
成长档案相关的Pydantic schemas
"""

import json
from typing import Optional

from pydantic import Field, field_validator

from app.schemas.base import AuditSchema, BaseSchema


class PortfolioBase(BaseSchema):
    """成长档案基础模型"""

    student_id: str = Field(..., description="学生ID")
    type: str = Field(
        ...,
        description="记录类型: work(作品), evaluation(评价), observation(观察), milestone(里程碑)",
    )
    title: str = Field(..., max_length=200, description="标题")
    content: Optional[str] = Field(None, description="内容")
    attachments: Optional[str] = Field(None, description="附件（JSON格式）")
    cognitive_score: Optional[int] = Field(None, ge=0, le=100, description="认知维度评分")
    skill_score: Optional[int] = Field(None, ge=0, le=100, description="技能维度评分")
    creativity_score: Optional[int] = Field(None, ge=0, le=100, description="创意维度评分")
    cooperation_score: Optional[int] = Field(None, ge=0, le=100, description="合作维度评分")
    attention_score: Optional[int] = Field(None, ge=0, le=100, description="注意力维度评分")

    @field_validator("type")
    @classmethod
    def validate_type(cls, v):
        """验证记录类型"""
        valid_types = ["work", "evaluation", "observation", "milestone"]
        if v not in valid_types:
            raise ValueError(f"Invalid type. Must be one of: {valid_types}")
        return v

    @field_validator("attachments")
    @classmethod
    def validate_attachments(cls, v):
        if v is not None:
            try:
                json.loads(v)
            except json.JSONDecodeError:
                raise ValueError("attachments must be valid JSON")
        return v


class PortfolioCreate(PortfolioBase):
    """创建成长档案模型"""


class PortfolioUpdate(BaseSchema):
    """更新成长档案模型"""

    type: Optional[str] = Field(
        None,
        description="记录类型: work(作品), evaluation(评价), observation(观察), milestone(里程碑)",
    )
    title: Optional[str] = Field(None, max_length=200, description="标题")
    content: Optional[str] = Field(None, description="内容")
    attachments: Optional[str] = Field(None, description="附件（JSON格式）")
    cognitive_score: Optional[int] = Field(None, ge=0, le=100, description="认知维度评分")
    skill_score: Optional[int] = Field(None, ge=0, le=100, description="技能维度评分")
    creativity_score: Optional[int] = Field(None, ge=0, le=100, description="创意维度评分")
    cooperation_score: Optional[int] = Field(None, ge=0, le=100, description="合作维度评分")
    attention_score: Optional[int] = Field(None, ge=0, le=100, description="注意力维度评分")

    @field_validator("type")
    @classmethod
    def validate_type(cls, v):
        if v is not None:
            valid_types = ["work", "evaluation", "observation", "milestone"]
            if v not in valid_types:
                raise ValueError(f"Invalid type. Must be one of: {valid_types}")
        return v

    @field_validator("attachments")
    @classmethod
    def validate_attachments(cls, v):
        if v is not None:
            try:
                json.loads(v)
            except json.JSONDecodeError:
                raise ValueError("attachments must be valid JSON")
        return v


class PortfolioInDB(PortfolioBase, AuditSchema):
    """数据库中的成长档案模型"""

    id: str = Field(..., description="成长档案ID")


class Portfolio(PortfolioInDB):
    """成长档案响应模型"""


class PortfolioWithStudent(Portfolio):
    """带学生信息的成长档案响应模型"""

    student_name: str = Field(..., description="学生姓名")
    student_grade: str = Field(..., description="学生年级")
    student_class: str = Field(..., description="学生班级")

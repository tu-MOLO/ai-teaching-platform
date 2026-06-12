"""
学生相关的Pydantic schemas
"""
from datetime import date
from typing import Optional

from pydantic import Field, field_validator

from app.schemas.base import BaseSchema, AuditSchema


class StudentBase(BaseSchema):
    """学生基础模型"""
    name: str = Field(..., max_length=100, description="学生姓名")
    gender: str = Field(..., description="性别")
    birth_date: date = Field(..., description="出生日期")
    grade: str = Field(..., max_length=50, description="年级")
    class_name: str = Field(..., max_length=50, description="班级")
    avatar: Optional[str] = Field(None, description="头像")
    parent_contact: Optional[str] = Field(None, description="家长联系方式")
    is_active: Optional[bool] = Field(True, description="是否在读")
    enrollment_date: Optional[date] = Field(None, description="入学日期")

    @field_validator('gender', mode='before')
    @classmethod
    def convert_gender_to_str(cls, v):
        """将枚举转换为字符串"""
        if v is None:
            return v
        return str(v) if hasattr(v, 'value') else str(v)

    @field_validator('gender')
    @classmethod
    def validate_gender(cls, v):
        if v is None:
            return v
        valid = {'male', 'female', 'other'}
        val = str(v).lower() if hasattr(v, 'value') else str(v).lower()
        if val not in valid:
            raise ValueError(f"性别必须是 male、female 或 other")
        return v

    @field_validator('birth_date', mode='before')
    @classmethod
    def convert_str_to_date(cls, v):
        """将字符串转换为date对象"""
        if v is None:
            return v
        if isinstance(v, date):
            return v
        if isinstance(v, str):
            return date.fromisoformat(v)
        return v


class StudentCreate(StudentBase):
    """创建学生模型"""


class StudentUpdate(BaseSchema):
    """更新学生模型"""
    name: Optional[str] = Field(None, max_length=100, description="学生姓名")
    gender: Optional[str] = Field(None, description="性别")
    birth_date: Optional[date] = Field(None, description="出生日期")
    grade: Optional[str] = Field(None, max_length=50, description="年级")
    class_name: Optional[str] = Field(None, max_length=50, description="班级")
    avatar: Optional[str] = Field(None, description="头像")
    parent_contact: Optional[str] = Field(None, description="家长联系方式")
    is_active: Optional[bool] = Field(None, description="是否在读")
    enrollment_date: Optional[date] = Field(None, description="入学日期")

    @field_validator('birth_date', mode='before')
    @classmethod
    def convert_str_to_date(cls, v):
        """将字符串转换为date对象"""
        if v is None:
            return v
        if isinstance(v, date):
            return v
        if isinstance(v, str):
            return date.fromisoformat(v)
        return v


class StudentInDB(StudentBase, AuditSchema):
    """数据库中的学生模型"""
    id: str = Field(..., description="学生ID")
    progress: Optional[int] = Field(None, description="学习进度(0-100)")
    age: Optional[int] = Field(None, description="年龄")


class Student(StudentInDB):
    """学生响应模型 - 输出时转换格式"""

    @field_validator('gender', mode='before')
    @classmethod
    def convert_gender_for_output(cls, v):
        """将枚举转换为字符串用于输出"""
        if v is None:
            return v
        # 处理 Gender.MALE 格式
        if hasattr(v, 'value'):
            return v.value
        # 处理字符串 "Gender.MALE"
        if isinstance(v, str) and 'Gender.' in v:
            return v.replace('Gender.', '').lower()
        return str(v).lower() if isinstance(v, str) else v

    @field_validator('birth_date', mode='before')
    @classmethod
    def convert_date_to_str(cls, v):
        """将date对象转换为字符串用于输出"""
        if v is None:
            return v
        if isinstance(v, date):
            return v.isoformat()
        return str(v)

"""
学生数据模型
"""
from datetime import date
from enum import Enum as PyEnum
from typing import Optional

from sqlalchemy import String, Index, Date, Enum, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class Gender(str, PyEnum):
    """性别枚举"""
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"


class Student(BaseModel):
    """学生模型"""
    __tablename__ = "students"

    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
        comment="学生姓名"
    )

    gender: Mapped[Gender] = mapped_column(
        Enum(Gender, native_enum=False),
        nullable=False,
        comment="性别: male-男, female-女, other-其他"
    )

    birth_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        comment="出生日期"
    )

    grade: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
        comment="年级"
    )

    class_name: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
        comment="班级"
    )

    avatar: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
        comment="头像"
    )

    parent_contact: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        comment="家长联系方式"
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        comment="是否在读"
    )

    enrollment_date: Mapped[Optional[date]] = mapped_column(
        Date,
        nullable=True,
        comment="入学日期"
    )

    user_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
        comment="关联用户ID"
    )

    # 关系
    user = relationship("User")

    portfolios = relationship(
        "Portfolio",
        cascade="all, delete-orphan"
    )

    # 复合索引
    __table_args__ = (
        Index('ix_students_grade_class', 'grade', 'class_name'),
    )

"""
成长档案数据模型
"""
from sqlalchemy import ForeignKey, String, Text, Integer, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class Portfolio(BaseModel):
    """成长档案模型"""
    __tablename__ = "portfolios"
    
    user_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
        comment="用户ID"
    )
    
    student_id: Mapped[str] = mapped_column(
        ForeignKey("students.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="学生ID"
    )
    
    type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="记录类型: work(作品), evaluation(评价), observation(观察), milestone(里程碑)"
    )
    
    title: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
        comment="标题"
    )
    
    content: Mapped[str] = mapped_column(
        Text,
        nullable=True,
        comment="内容"
    )
    
    attachments: Mapped[str] = mapped_column(
        Text,
        nullable=True,
        comment="附件（JSON格式）"
    )
    
    # 多维度评价字段（0-100分）
    cognitive_score: Mapped[int] = mapped_column(
        Integer,
        nullable=True,
        comment="认知维度评分（0-100）"
    )
    
    skill_score: Mapped[int] = mapped_column(
        Integer,
        nullable=True,
        comment="技能维度评分（0-100）"
    )
    
    creativity_score: Mapped[int] = mapped_column(
        Integer,
        nullable=True,
        comment="创意维度评分（0-100）"
    )
    
    cooperation_score: Mapped[int] = mapped_column(
        Integer,
        nullable=True,
        comment="合作维度评分（0-100）"
    )
    
    attention_score: Mapped[int] = mapped_column(
        Integer,
        nullable=True,
        comment="注意力维度评分（0-100）"
    )
    
    # 关系
    student = relationship(
        "Student"
    )
    
    user = relationship(
        "User"
    )
    
    # 表级约束：评分范围检查
    __table_args__ = (
        CheckConstraint("cognitive_score IS NULL OR (cognitive_score >= 0 AND cognitive_score <= 100)", name="ck_cognitive_score_range"),
        CheckConstraint("skill_score IS NULL OR (skill_score >= 0 AND skill_score <= 100)", name="ck_skill_score_range"),
        CheckConstraint("creativity_score IS NULL OR (creativity_score >= 0 AND creativity_score <= 100)", name="ck_creativity_score_range"),
        CheckConstraint("cooperation_score IS NULL OR (cooperation_score >= 0 AND cooperation_score <= 100)", name="ck_cooperation_score_range"),
        CheckConstraint("attention_score IS NULL OR (attention_score >= 0 AND attention_score <= 100)", name="ck_attention_score_range"),
    )

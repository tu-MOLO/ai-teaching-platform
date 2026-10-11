"""
个别化教育计划（IEP / 一人一案）与发展领域评估数据模型

设计要点：
- 评估"模板"（教师可配置、自研、可恢复默认）与 IEP 评估"快照"（创建 IEP 时复制存档）分离，
  模板后续修改不影响历史 IEP；
- IEP 状态机保证 AI 只能生成草稿，只有教师能审定/锁定；修订通过 parent_id 形成版本链并保留历史；
- 评级统一采用 0-3 级掌握度（0 不能完成 / 1 需大量辅助 / 2 需少量辅助 / 3 独立完成），
  替代无测量学基础的 0-100 拍脑袋评分；
- 不内置任何受版权或资质保护的正式量表。
"""

import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import JSON, CheckConstraint, DateTime
from sqlalchemy import Enum as SQLEnum
from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class IEPStatus(str, enum.Enum):
    """IEP 状态：草稿 → 待审定 → 已锁定（修订通过新建版本实现）"""

    DRAFT = "draft"
    REVIEW = "review"
    LOCKED = "locked"


class GoalStatus(str, enum.Enum):
    """短期目标达成状态"""

    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    ACHIEVED = "achieved"
    MAINTAIN = "maintain"


# ============================================================
# 一、发展领域评估模板（可配置，自研）
# ============================================================


class AssessmentTemplate(BaseModel):
    """评估模板：一名教师可拥有多套，其中一套为默认模板"""

    __tablename__ = "assessment_templates"

    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="用户ID",
    )

    name: Mapped[str] = mapped_column(String(100), nullable=False, comment="模板名称")

    is_default: Mapped[bool] = mapped_column(
        default=False, nullable=False, comment="是否为该用户默认模板"
    )

    domains: Mapped[list["AssessmentDomain"]] = relationship(
        "AssessmentDomain",
        back_populates="template",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="AssessmentDomain.sort_order",
    )


class AssessmentDomain(BaseModel):
    """评估领域（如感知、认知、语言与沟通、运动、生活自理、社会适应）"""

    __tablename__ = "assessment_domains"

    template_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("assessment_templates.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="模板ID",
    )

    code: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True, comment="领域标识（可空，用于程序关联）"
    )

    name: Mapped[str] = mapped_column(String(100), nullable=False, comment="领域名称")

    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False, comment="排序")

    template: Mapped["AssessmentTemplate"] = relationship(
        "AssessmentTemplate", back_populates="domains"
    )

    items: Mapped[list["AssessmentItem"]] = relationship(
        "AssessmentItem",
        back_populates="domain",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="AssessmentItem.sort_order",
    )


class AssessmentItem(BaseModel):
    """评估条目：领域下的可观测行为，含 0-3 级行为锚点"""

    __tablename__ = "assessment_items"

    domain_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("assessment_domains.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="领域ID",
    )

    name: Mapped[str] = mapped_column(String(200), nullable=False, comment="条目名称（可观测行为）")

    observation: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True, comment="观测说明（如何观察该行为）"
    )

    level_anchors: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=True, comment="0-3 级行为锚点，形如 {'0':..,'1':..,'2':..,'3':..}"
    )

    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False, comment="排序")

    domain: Mapped["AssessmentDomain"] = relationship("AssessmentDomain", back_populates="items")


# ============================================================
# 二、IEP 主体
# ============================================================


class IEPPlan(BaseModel):
    """个别化教育计划：一个学生一个学期一份"""

    __tablename__ = "iep_plans"

    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="教师ID",
    )

    student_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("students.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="学生ID",
    )

    term: Mapped[str] = mapped_column(
        String(100), nullable=False, index=True, comment="学期，如 2026-2027学年第一学期"
    )

    status: Mapped[IEPStatus] = mapped_column(
        SQLEnum(IEPStatus, native_enum=False),
        default=IEPStatus.DRAFT,
        nullable=False,
        index=True,
        comment="IEP状态",
    )

    # 修订版本链
    parent_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("iep_plans.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="上一版本IEP ID（修订链）",
    )

    revision_no: Mapped[int] = mapped_column(Integer, default=1, nullable=False, comment="第几版")

    # 基本情况（教师填写；AI 不得杜撰医学诊断）
    student_profile: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True, comment="学生情况/教育诊断摘要（教师提供）"
    )

    supports: Mapped[Optional[dict]] = mapped_column(
        JSON,
        nullable=True,
        comment="教学/康复/家庭支持，形如 {'teaching':[],'rehab':[],'family':[]}",
    )

    evaluation_plan: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True, comment="评价方式与周期"
    )

    # 审定信息
    reviewed_by: Mapped[Optional[str]] = mapped_column(
        String(36), nullable=True, comment="审定人ID"
    )

    reviewed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True, comment="审定时间"
    )

    domain_assessments: Mapped[list["IEPDomainAssessment"]] = relationship(
        "IEPDomainAssessment",
        back_populates="iep",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="IEPDomainAssessment.sort_order",
    )

    long_term_goals: Mapped[list["IEPLongTermGoal"]] = relationship(
        "IEPLongTermGoal",
        back_populates="iep",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="IEPLongTermGoal.sort_order",
    )

    generation_logs: Mapped[list["IEPGenerationLog"]] = relationship(
        "IEPGenerationLog",
        back_populates="iep",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    student = relationship("Student")


class IEPDomainAssessment(BaseModel):
    """IEP 领域评估快照（复制模板领域存档）"""

    __tablename__ = "iep_domain_assessments"

    iep_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("iep_plans.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="IEP ID",
    )

    domain_code: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True, comment="领域标识快照"
    )

    domain_name: Mapped[str] = mapped_column(String(100), nullable=False, comment="领域名称快照")

    overall_level: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True, comment="领域总体掌握度 0-3"
    )

    summary: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True, comment="领域现状描述（基于评估，不诊断）"
    )

    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False, comment="排序")

    iep: Mapped["IEPPlan"] = relationship("IEPPlan", back_populates="domain_assessments")

    items: Mapped[list["IEPAssessmentSnapshotItem"]] = relationship(
        "IEPAssessmentSnapshotItem",
        back_populates="domain_assessment",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="IEPAssessmentSnapshotItem.sort_order",
    )

    __table_args__ = (
        CheckConstraint(
            "overall_level IS NULL OR (overall_level >= 0 AND overall_level <= 3)",
            name="ck_iep_da_overall_level_range",
        ),
    )


class IEPAssessmentSnapshotItem(BaseModel):
    """IEP 条目评估快照（复制模板条目并记录评级）"""

    __tablename__ = "iep_assessment_snapshot_items"

    domain_assessment_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("iep_domain_assessments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="领域评估快照ID",
    )

    item_name: Mapped[str] = mapped_column(String(200), nullable=False, comment="条目名称快照")

    level: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, comment="掌握度评级 0-3")

    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment="教师备注")

    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False, comment="排序")

    domain_assessment: Mapped["IEPDomainAssessment"] = relationship(
        "IEPDomainAssessment", back_populates="items"
    )

    __table_args__ = (
        CheckConstraint(
            "level IS NULL OR (level >= 0 AND level <= 3)",
            name="ck_iep_snap_item_level_range",
        ),
    )


class IEPLongTermGoal(BaseModel):
    """IEP 长期目标，关联领域，1-N 个短期目标"""

    __tablename__ = "iep_long_term_goals"

    iep_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("iep_plans.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="IEP ID",
    )

    domain_code: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True, comment="领域标识"
    )

    domain_name: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True, comment="领域名称"
    )

    goal: Mapped[str] = mapped_column(Text, nullable=False, comment="长期目标描述")

    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False, comment="排序")

    iep: Mapped["IEPPlan"] = relationship("IEPPlan", back_populates="long_term_goals")

    short_term_goals: Mapped[list["IEPShortTermGoal"]] = relationship(
        "IEPShortTermGoal",
        back_populates="long_term_goal",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="IEPShortTermGoal.sort_order",
    )


class IEPShortTermGoal(BaseModel):
    """IEP 短期目标：条件 + 可观察行为 + 达成标准 + 辅助等级"""

    __tablename__ = "iep_short_term_goals"

    long_term_goal_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("iep_long_term_goals.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="长期目标ID",
    )

    condition: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment="完成条件")

    behavior: Mapped[str] = mapped_column(Text, nullable=False, comment="可观察行为")

    criterion: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment="达成标准")

    support_level: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True, comment="辅助等级 0-3"
    )

    status: Mapped[GoalStatus] = mapped_column(
        SQLEnum(GoalStatus, native_enum=False),
        default=GoalStatus.NOT_STARTED,
        nullable=False,
        index=True,
        comment="目标达成状态",
    )

    teaching_methods: Mapped[Optional[list]] = mapped_column(
        JSON, nullable=True, comment="具体教学策略列表"
    )

    materials: Mapped[Optional[list]] = mapped_column(JSON, nullable=True, comment="教具/材料列表")

    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False, comment="排序")

    long_term_goal: Mapped["IEPLongTermGoal"] = relationship(
        "IEPLongTermGoal", back_populates="short_term_goals"
    )

    __table_args__ = (
        CheckConstraint(
            "support_level IS NULL OR (support_level >= 0 AND support_level <= 3)",
            name="ck_iep_stg_support_level_range",
        ),
    )


class IEPGenerationLog(BaseModel):
    """AI 生成留痕（IEP 初稿 / 成长报告），保证可追溯"""

    __tablename__ = "iep_generation_logs"

    iep_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("iep_plans.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="IEP ID",
    )

    kind: Mapped[str] = mapped_column(
        String(20), nullable=False, comment="生成类型：draft(IEP初稿) / report(成长报告)"
    )

    model: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, comment="使用的模型")

    template_snapshot: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True, comment="输入评估快照版本/摘要"
    )

    raw_output: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment="模型原始输出")

    iep: Mapped["IEPPlan"] = relationship("IEPPlan", back_populates="generation_logs")

"""
个别化教育计划（IEP）与发展领域评估的 Pydantic 模型
"""

from datetime import datetime
from typing import List, Literal, Optional

from pydantic import Field

from app.models.iep import GoalStatus, IEPStatus
from app.schemas.base import BaseSchema

# ============================================================
# 一、评估模板
# ============================================================


class AssessmentItemBase(BaseSchema):
    name: str = Field(..., max_length=200, description="条目名称（可观测行为）")
    observation: Optional[str] = Field(default=None, description="观测说明")
    level_anchors: Optional[dict] = Field(
        default=None, description="0-3 级行为锚点 {'0':..,'1':..,'2':..,'3':..}"
    )
    sort_order: int = Field(default=0, description="排序")


class AssessmentItemCreate(AssessmentItemBase):
    pass


class AssessmentItemUpdate(BaseSchema):
    name: Optional[str] = Field(default=None, max_length=200)
    observation: Optional[str] = None
    level_anchors: Optional[dict] = None
    sort_order: Optional[int] = None


class AssessmentItemResponse(AssessmentItemBase):
    id: str

    class Config:
        from_attributes = True


class AssessmentDomainBase(BaseSchema):
    code: Optional[str] = Field(default=None, max_length=50, description="领域标识")
    name: str = Field(..., max_length=100, description="领域名称")
    sort_order: int = Field(default=0, description="排序")


class AssessmentDomainCreate(AssessmentDomainBase):
    items: List[AssessmentItemCreate] = Field(default_factory=list, description="领域下条目")


class AssessmentDomainUpdate(BaseSchema):
    code: Optional[str] = None
    name: Optional[str] = Field(default=None, max_length=100)
    sort_order: Optional[int] = None
    items: Optional[List[AssessmentItemCreate]] = None


class AssessmentDomainResponse(AssessmentDomainBase):
    id: str
    items: List[AssessmentItemResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True


class AssessmentTemplateCreate(BaseSchema):
    name: str = Field(..., max_length=100, description="模板名称")
    is_default: bool = Field(default=False, description="是否设为默认模板")
    domains: List[AssessmentDomainCreate] = Field(default_factory=list, description="领域与条目")


class AssessmentTemplateUpdate(BaseSchema):
    name: Optional[str] = Field(default=None, max_length=100)
    is_default: Optional[bool] = None
    domains: Optional[List[AssessmentDomainCreate]] = None


class AssessmentTemplateResponse(BaseSchema):
    id: str
    name: str
    is_default: bool
    domains: List[AssessmentDomainResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================================
# 二、IEP 评估快照
# ============================================================


class SnapshotItemBase(BaseSchema):
    item_name: str = Field(..., max_length=200, description="条目名称快照")
    level: Optional[int] = Field(default=None, ge=0, le=3, description="掌握度 0-3")
    note: Optional[str] = None
    sort_order: int = Field(default=0)


class SnapshotItemCreate(SnapshotItemBase):
    pass


class SnapshotItemResponse(SnapshotItemBase):
    id: str

    class Config:
        from_attributes = True


class DomainAssessmentBase(BaseSchema):
    domain_code: Optional[str] = Field(default=None, max_length=50)
    domain_name: str = Field(..., max_length=100)
    overall_level: Optional[int] = Field(default=None, ge=0, le=3, description="领域总体掌握度 0-3")
    summary: Optional[str] = Field(default=None, description="领域现状描述（不诊断）")
    sort_order: int = Field(default=0)


class DomainAssessmentCreate(DomainAssessmentBase):
    items: List[SnapshotItemCreate] = Field(default_factory=list)


class DomainAssessmentResponse(DomainAssessmentBase):
    id: str
    items: List[SnapshotItemResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True


# ============================================================
# 三、IEP 目标
# ============================================================


class ShortTermGoalBase(BaseSchema):
    condition: Optional[str] = Field(default=None, description="完成条件")
    behavior: str = Field(..., description="可观察行为")
    criterion: Optional[str] = Field(default=None, description="达成标准")
    support_level: Optional[int] = Field(default=None, ge=0, le=3, description="辅助等级 0-3")
    status: GoalStatus = Field(default=GoalStatus.NOT_STARTED, description="目标状态")
    teaching_methods: Optional[List[str]] = Field(default=None, description="教学策略")
    materials: Optional[List[str]] = Field(default=None, description="教具材料")
    sort_order: int = Field(default=0)


class ShortTermGoalCreate(ShortTermGoalBase):
    pass


class ShortTermGoalUpdate(BaseSchema):
    condition: Optional[str] = None
    behavior: Optional[str] = None
    criterion: Optional[str] = None
    support_level: Optional[int] = Field(default=None, ge=0, le=3)
    status: Optional[GoalStatus] = None
    teaching_methods: Optional[List[str]] = None
    materials: Optional[List[str]] = None
    sort_order: Optional[int] = None


class ShortTermGoalResponse(ShortTermGoalBase):
    id: str

    class Config:
        from_attributes = True


class LongTermGoalBase(BaseSchema):
    domain_code: Optional[str] = Field(default=None, max_length=50)
    domain_name: Optional[str] = Field(default=None, max_length=100)
    goal: str = Field(..., description="长期目标")
    sort_order: int = Field(default=0)


class LongTermGoalCreate(LongTermGoalBase):
    short_term_goals: List[ShortTermGoalCreate] = Field(default_factory=list)


class LongTermGoalUpdate(BaseSchema):
    domain_code: Optional[str] = None
    domain_name: Optional[str] = None
    goal: Optional[str] = None
    sort_order: Optional[int] = None
    short_term_goals: Optional[List[ShortTermGoalCreate]] = None


class LongTermGoalResponse(LongTermGoalBase):
    id: str
    short_term_goals: List[ShortTermGoalResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True


# ============================================================
# 四、IEP 主体
# ============================================================


class IEPSupports(BaseSchema):
    """教学/康复/家庭支持结构（supports JSON 的规范形状）"""

    teaching: List[str] = Field(default_factory=list)
    rehab: List[str] = Field(default_factory=list)
    family: List[str] = Field(default_factory=list)


class IEPBase(BaseSchema):
    term: str = Field(..., max_length=100, description="学期")
    student_profile: Optional[str] = Field(
        default=None, description="学生情况/教育诊断摘要（教师提供）"
    )
    supports: Optional[IEPSupports] = Field(default=None, description="教学/康复/家庭支持")
    evaluation_plan: Optional[str] = Field(default=None, description="评价方式与周期")


class IEPCreate(IEPBase):
    student_id: str = Field(..., description="学生ID")
    domain_assessments: List[DomainAssessmentCreate] = Field(default_factory=list)
    long_term_goals: List[LongTermGoalCreate] = Field(default_factory=list)


class IEPUpdate(BaseSchema):
    # 不含 status：状态只能通过 submit/review/lock/revise 动作端点流转，防止越权直接锁定
    term: Optional[str] = Field(default=None, max_length=100)
    student_profile: Optional[str] = None
    supports: Optional[IEPSupports] = None
    evaluation_plan: Optional[str] = None
    domain_assessments: Optional[List[DomainAssessmentCreate]] = None
    long_term_goals: Optional[List[LongTermGoalCreate]] = None


class IEPDraftGenerateRequest(BaseSchema):
    """AI 初稿生成范围，对应编辑页三个步骤，用于只生成当前页内容。"""

    section: Literal["all", "profile", "goals", "supports"] = Field(
        default="all",
        description=(
            "profile=情况与评估页（基本情况+领域小结）；goals=长短期目标页；"
            "supports=支持措施与评价页；all=全部"
        ),
    )


class IEPResponse(IEPBase):
    id: str
    student_id: str
    student_name: Optional[str] = None
    status: IEPStatus
    parent_id: Optional[str] = None
    revision_no: int
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    domain_assessments: List[DomainAssessmentResponse] = Field(default_factory=list)
    long_term_goals: List[LongTermGoalResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class IEPSummaryResponse(BaseSchema):
    """列表项（轻量，不含嵌套快照/目标明细）"""

    id: str
    student_id: str
    student_name: Optional[str] = None
    term: str
    status: IEPStatus
    revision_no: int
    parent_id: Optional[str] = None
    long_term_goal_count: int = 0
    short_term_goal_count: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================================
# 五、AI 生成留痕
# ============================================================


class IEPGenerationLogResponse(BaseSchema):
    id: str
    kind: str = Field(..., description="draft / report")
    model: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

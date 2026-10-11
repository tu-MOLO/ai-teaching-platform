"""
个别化教育计划（IEP）与发展领域评估模板 服务层

- AssessmentTemplateService：评估模板的获取/默认初始化/增改/重置/删除；
- IEPService：IEP 的创建、整体编辑、状态流转（草稿→待审定→已锁定）与修订版本。

所有读取均按 user_id 做所有权隔离；async 下关系通过 selectinload 预加载，避免懒加载 IO。
AI 只能产出草稿，锁定（定稿）只能由教师完成。
"""

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import BadRequestException
from app.models.iep import (
    AssessmentDomain,
    AssessmentItem,
    AssessmentTemplate,
    GoalStatus,
    IEPAssessmentSnapshotItem,
    IEPDomainAssessment,
    IEPLongTermGoal,
    IEPPlan,
    IEPShortTermGoal,
    IEPStatus,
)
from app.models.student import Student
from app.schemas.iep import (
    AssessmentTemplateCreate,
    AssessmentTemplateUpdate,
    IEPCreate,
    IEPSummaryResponse,
    IEPUpdate,
)
from app.services.iep_defaults import DEFAULT_DOMAINS, DEFAULT_TEMPLATE_NAME

# ============================================================
# 嵌套构建 helper
# ============================================================


def _build_template_domains(template: AssessmentTemplate, domains_data: list[dict]) -> None:
    for di, d in enumerate(domains_data):
        domain = AssessmentDomain(
            code=d.get("code"),
            name=d["name"],
            sort_order=d.get("sort_order", di),
        )
        for ii, item in enumerate(d.get("items", [])):
            domain.items.append(
                AssessmentItem(
                    name=item["name"],
                    observation=item.get("observation"),
                    level_anchors=item.get("level_anchors"),
                    sort_order=item.get("sort_order", ii),
                )
            )
        template.domains.append(domain)


def _replace_template_domains(template: AssessmentTemplate, domains_data: list[dict]) -> None:
    template.domains.clear()
    _build_template_domains(template, domains_data)


def _attach_domain_assessments(iep: IEPPlan, domains_data: list[dict]) -> None:
    for di, d in enumerate(domains_data):
        da = IEPDomainAssessment(
            domain_code=d.get("domain_code"),
            domain_name=d["domain_name"],
            overall_level=d.get("overall_level"),
            summary=d.get("summary"),
            sort_order=d.get("sort_order", di),
        )
        for ii, item in enumerate(d.get("items", [])):
            da.items.append(
                IEPAssessmentSnapshotItem(
                    item_name=item["item_name"],
                    level=item.get("level"),
                    note=item.get("note"),
                    sort_order=item.get("sort_order", ii),
                )
            )
        iep.domain_assessments.append(da)


def _attach_long_term_goals(iep: IEPPlan, goals_data: list[dict]) -> None:
    for gi, g in enumerate(goals_data):
        ltg = IEPLongTermGoal(
            domain_code=g.get("domain_code"),
            domain_name=g.get("domain_name"),
            goal=g["goal"],
            sort_order=g.get("sort_order", gi),
        )
        for si, s in enumerate(g.get("short_term_goals", [])):
            ltg.short_term_goals.append(
                IEPShortTermGoal(
                    condition=s.get("condition"),
                    behavior=s["behavior"],
                    criterion=s.get("criterion"),
                    support_level=s.get("support_level"),
                    status=s.get("status", GoalStatus.NOT_STARTED),
                    teaching_methods=s.get("teaching_methods"),
                    materials=s.get("materials"),
                    sort_order=s.get("sort_order", si),
                )
            )
        iep.long_term_goals.append(ltg)


# ============================================================
# 评估模板服务
# ============================================================


class AssessmentTemplateService:
    """发展领域评估模板服务"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def _load_template(self, template_id: str, user_id: str) -> Optional[AssessmentTemplate]:
        stmt = (
            select(AssessmentTemplate)
            .where(
                AssessmentTemplate.id == template_id,
                AssessmentTemplate.user_id == user_id,
                AssessmentTemplate.is_deleted == False,  # noqa: E712
            )
            .options(selectinload(AssessmentTemplate.domains).selectinload(AssessmentDomain.items))
        )
        return (await self.db.execute(stmt)).scalar_one_or_none()

    async def list_templates(self, user_id: str) -> list[AssessmentTemplate]:
        stmt = (
            select(AssessmentTemplate)
            .where(
                AssessmentTemplate.user_id == user_id,
                AssessmentTemplate.is_deleted == False,  # noqa: E712
            )
            .options(selectinload(AssessmentTemplate.domains).selectinload(AssessmentDomain.items))
            .order_by(AssessmentTemplate.is_default.desc(), AssessmentTemplate.created_at.desc())
        )
        return list((await self.db.execute(stmt)).scalars().all())

    async def get_or_create_default(self, user_id: str) -> AssessmentTemplate:
        """获取默认模板；不存在则用内置六领域自动初始化（懒初始化，无需迁移种子）。"""
        stmt = (
            select(AssessmentTemplate)
            .where(
                AssessmentTemplate.user_id == user_id,
                AssessmentTemplate.is_default == True,  # noqa: E712
                AssessmentTemplate.is_deleted == False,  # noqa: E712
            )
            .options(selectinload(AssessmentTemplate.domains).selectinload(AssessmentDomain.items))
        )
        template = (await self.db.execute(stmt)).scalar_one_or_none()
        if template:
            return template
        return await self._create_from_defaults(user_id)

    async def _create_from_defaults(
        self, user_id: str, name: str = DEFAULT_TEMPLATE_NAME
    ) -> AssessmentTemplate:
        template = AssessmentTemplate(user_id=user_id, name=name, is_default=True)
        _build_template_domains(template, DEFAULT_DOMAINS)
        self.db.add(template)
        await self.db.flush()
        created = await self._load_template(template.id, user_id)
        assert created is not None  # 刚写入并 flush，必然可加载
        return created

    async def _unset_defaults(self, user_id: str, except_id: Optional[str] = None) -> None:
        stmt = select(AssessmentTemplate).where(
            AssessmentTemplate.user_id == user_id,
            AssessmentTemplate.is_default == True,  # noqa: E712
            AssessmentTemplate.is_deleted == False,  # noqa: E712
        )
        for template in (await self.db.execute(stmt)).scalars().all():
            if except_id and template.id == except_id:
                continue
            template.is_default = False

    async def create(self, user_id: str, data: AssessmentTemplateCreate) -> AssessmentTemplate:
        if data.is_default:
            await self._unset_defaults(user_id)
        template = AssessmentTemplate(user_id=user_id, name=data.name, is_default=data.is_default)
        _build_template_domains(template, [d.model_dump() for d in data.domains])
        self.db.add(template)
        await self.db.flush()
        created = await self._load_template(template.id, user_id)
        assert created is not None  # 刚写入并 flush，必然可加载
        return created

    async def get(self, template_id: str, user_id: str) -> Optional[AssessmentTemplate]:
        return await self._load_template(template_id, user_id)

    async def update(
        self, template_id: str, user_id: str, data: AssessmentTemplateUpdate
    ) -> Optional[AssessmentTemplate]:
        template = await self._load_template(template_id, user_id)
        if not template:
            return None

        payload = data.model_dump(exclude_unset=True)
        if payload.get("is_default"):
            await self._unset_defaults(user_id, except_id=template.id)
        if "name" in payload:
            template.name = payload["name"]
        if "is_default" in payload:
            template.is_default = payload["is_default"]
        if payload.get("domains") is not None:
            _replace_template_domains(template, payload["domains"])

        await self.db.flush()
        return await self._load_template(template.id, user_id)

    async def reset_to_default(
        self, template_id: str, user_id: str
    ) -> Optional[AssessmentTemplate]:
        template = await self._load_template(template_id, user_id)
        if not template:
            return None
        _replace_template_domains(template, DEFAULT_DOMAINS)
        await self.db.flush()
        return await self._load_template(template.id, user_id)

    async def delete(self, template_id: str, user_id: str) -> bool:
        template = (
            await self.db.execute(
                select(AssessmentTemplate).where(
                    AssessmentTemplate.id == template_id,
                    AssessmentTemplate.user_id == user_id,
                    AssessmentTemplate.is_deleted == False,  # noqa: E712
                )
            )
        ).scalar_one_or_none()
        if not template:
            return False
        template.soft_delete()
        await self.db.flush()
        return True


# ============================================================
# IEP 服务
# ============================================================


class IEPService:
    """个别化教育计划服务"""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ---------- 基础 ----------

    async def _get_owned_student(self, student_id: str, user_id: str) -> Optional[Student]:
        return (
            await self.db.execute(
                select(Student).where(
                    Student.id == student_id,
                    Student.user_id == user_id,
                    Student.is_deleted == False,  # noqa: E712
                )
            )
        ).scalar_one_or_none()

    async def _load_iep(self, iep_id: str, user_id: str) -> Optional[IEPPlan]:
        stmt = (
            select(IEPPlan)
            .where(
                IEPPlan.id == iep_id,
                IEPPlan.user_id == user_id,
                IEPPlan.is_deleted == False,  # noqa: E712
            )
            .options(
                selectinload(IEPPlan.domain_assessments).selectinload(IEPDomainAssessment.items),
                selectinload(IEPPlan.long_term_goals).selectinload(
                    IEPLongTermGoal.short_term_goals
                ),
                selectinload(IEPPlan.generation_logs),
                selectinload(IEPPlan.student),
            )
        )
        iep = (await self.db.execute(stmt)).scalar_one_or_none()
        if iep:
            # 动态挂载非持久化学生姓名，供 PDF 导出便捷读取（消费方以 getattr 读取）
            setattr(iep, "student_name", iep.student.name if iep.student else None)
        return iep

    # ---------- CRUD ----------

    async def create(self, user_id: str, data: IEPCreate) -> IEPPlan:
        student = await self._get_owned_student(data.student_id, user_id)
        if not student:
            raise BadRequestException("学生不存在或不属于当前教师")

        iep = IEPPlan(
            user_id=user_id,
            student_id=student.id,
            term=data.term,
            status=IEPStatus.DRAFT,
            student_profile=data.student_profile,
            supports=data.supports.model_dump() if data.supports else None,
            evaluation_plan=data.evaluation_plan,
            revision_no=1,
        )
        _attach_domain_assessments(iep, [d.model_dump() for d in data.domain_assessments])
        _attach_long_term_goals(iep, [g.model_dump() for g in data.long_term_goals])
        self.db.add(iep)
        await self.db.flush()
        created = await self._load_iep(iep.id, user_id)
        assert created is not None  # 刚写入并 flush，必然可加载
        return created

    async def get_list(
        self,
        user_id: str,
        skip: int = 0,
        limit: int = 20,
        student_id: Optional[str] = None,
        status_filter: Optional[IEPStatus] = None,
        term: Optional[str] = None,
        search: Optional[str] = None,
    ) -> list[IEPSummaryResponse]:
        stmt = select(IEPPlan).where(
            IEPPlan.user_id == user_id,
            IEPPlan.is_deleted == False,  # noqa: E712
        )
        if student_id:
            stmt = stmt.where(IEPPlan.student_id == student_id)
        if status_filter:
            stmt = stmt.where(IEPPlan.status == status_filter)
        if term:
            stmt = stmt.where(IEPPlan.term == term)
        if search:
            safe = search.replace("%", "\\%").replace("_", "\\_")
            stmt = stmt.where(IEPPlan.term.ilike(f"%{safe}%", escape="\\"))

        stmt = (
            stmt.options(
                selectinload(IEPPlan.student),
                selectinload(IEPPlan.long_term_goals).selectinload(
                    IEPLongTermGoal.short_term_goals
                ),
            )
            .order_by(IEPPlan.updated_at.desc())
            .offset(skip)
            .limit(limit)
        )
        rows = list((await self.db.execute(stmt)).scalars().all())

        summaries: list[IEPSummaryResponse] = []
        for iep in rows:
            long_count = len(iep.long_term_goals)
            short_count = sum(len(g.short_term_goals) for g in iep.long_term_goals)
            summaries.append(
                IEPSummaryResponse(
                    id=iep.id,
                    student_id=iep.student_id,
                    student_name=iep.student.name if iep.student else None,
                    term=iep.term,
                    status=iep.status,
                    revision_no=iep.revision_no,
                    parent_id=iep.parent_id,
                    long_term_goal_count=long_count,
                    short_term_goal_count=short_count,
                    created_at=iep.created_at,
                    updated_at=iep.updated_at,
                )
            )
        return summaries

    async def count(
        self,
        user_id: str,
        student_id: Optional[str] = None,
        status_filter: Optional[IEPStatus] = None,
        term: Optional[str] = None,
        search: Optional[str] = None,
    ) -> int:
        stmt = select(func.count(IEPPlan.id)).where(
            IEPPlan.user_id == user_id,
            IEPPlan.is_deleted == False,  # noqa: E712
        )
        if student_id:
            stmt = stmt.where(IEPPlan.student_id == student_id)
        if status_filter:
            stmt = stmt.where(IEPPlan.status == status_filter)
        if term:
            stmt = stmt.where(IEPPlan.term == term)
        if search:
            safe = search.replace("%", "\\%").replace("_", "\\_")
            stmt = stmt.where(IEPPlan.term.ilike(f"%{safe}%", escape="\\"))
        return (await self.db.execute(stmt)).scalar() or 0

    async def get_by_id(self, iep_id: str, user_id: str) -> Optional[IEPPlan]:
        return await self._load_iep(iep_id, user_id)

    async def get_comparison(self, iep_id: str, user_id: str) -> Optional[dict]:
        """沿修订链取上一版本与当前版本的六领域整体级别，用于期初/期末对比。"""
        current = await self._load_iep(iep_id, user_id)
        if not current:
            return None

        previous = None
        if current.parent_id:
            previous = await self._load_iep(current.parent_id, user_id)

        def domain_levels(iep: Optional[IEPPlan]) -> list:
            if not iep:
                return []
            return [
                {
                    "domain_code": d.domain_code,
                    "domain_name": d.domain_name,
                    "overall_level": d.overall_level,
                }
                for d in iep.domain_assessments
            ]

        return {
            "previous_term": previous.term if previous else None,
            "current_term": current.term,
            "previous": domain_levels(previous),
            "current": domain_levels(current),
        }

    async def update(self, iep_id: str, user_id: str, data: IEPUpdate) -> Optional[IEPPlan]:
        iep = await self._load_iep(iep_id, user_id)
        if not iep:
            return None
        if iep.status == IEPStatus.LOCKED:
            raise BadRequestException("已锁定的IEP不能直接修改，请基于它创建修订版本")

        payload = data.model_dump(exclude_unset=True)
        if "term" in payload:
            iep.term = payload["term"]
        if "student_profile" in payload:
            iep.student_profile = payload["student_profile"]
        if "evaluation_plan" in payload:
            iep.evaluation_plan = payload["evaluation_plan"]
        if "supports" in payload:
            iep.supports = payload["supports"]
        if payload.get("domain_assessments") is not None:
            iep.domain_assessments.clear()
            _attach_domain_assessments(iep, payload["domain_assessments"])
        if payload.get("long_term_goals") is not None:
            iep.long_term_goals.clear()
            _attach_long_term_goals(iep, payload["long_term_goals"])

        await self.db.flush()
        return await self._load_iep(iep.id, user_id)

    async def delete(self, iep_id: str, user_id: str) -> bool:
        iep = await self._load_iep(iep_id, user_id)
        if not iep:
            return False
        iep.soft_delete()
        await self.db.flush()
        return True

    # ---------- 状态流转 ----------

    async def submit(self, iep_id: str, user_id: str) -> Optional[IEPPlan]:
        iep = await self._load_iep(iep_id, user_id)
        if not iep:
            return None
        if iep.status != IEPStatus.DRAFT:
            raise BadRequestException("只有草稿状态的IEP可以提交审定")
        if not iep.domain_assessments and not iep.long_term_goals:
            raise BadRequestException("请至少完成一项领域评估或添加一个教育目标后再提交")
        iep.status = IEPStatus.REVIEW
        await self.db.flush()
        return await self._load_iep(iep.id, user_id)

    async def back_to_draft(self, iep_id: str, user_id: str) -> Optional[IEPPlan]:
        iep = await self._load_iep(iep_id, user_id)
        if not iep:
            return None
        if iep.status != IEPStatus.REVIEW:
            raise BadRequestException("只有待审定状态的IEP可以退回草稿")
        iep.status = IEPStatus.DRAFT
        await self.db.flush()
        return await self._load_iep(iep.id, user_id)

    async def lock(self, iep_id: str, user_id: str) -> Optional[IEPPlan]:
        iep = await self._load_iep(iep_id, user_id)
        if not iep:
            return None
        if iep.status != IEPStatus.REVIEW:
            raise BadRequestException("只有待审定状态的IEP可以审定锁定")
        iep.status = IEPStatus.LOCKED
        iep.reviewed_by = user_id
        iep.reviewed_at = datetime.now(timezone.utc)
        await self.db.flush()
        return await self._load_iep(iep.id, user_id)

    async def revise(self, iep_id: str, user_id: str) -> Optional[IEPPlan]:
        """基于待审定/已锁定 IEP 创建下一版草稿（复制评估与目标，短期目标状态重置）。"""
        src = await self._load_iep(iep_id, user_id)
        if not src:
            return None
        if src.status not in (IEPStatus.LOCKED, IEPStatus.REVIEW):
            raise BadRequestException("只能基于待审定或已锁定的IEP创建修订版本")

        new = IEPPlan(
            user_id=user_id,
            student_id=src.student_id,
            term=src.term,
            status=IEPStatus.DRAFT,
            parent_id=src.id,
            revision_no=src.revision_no + 1,
            student_profile=src.student_profile,
            supports=dict(src.supports) if src.supports else None,
            evaluation_plan=src.evaluation_plan,
        )

        for da in src.domain_assessments:
            nda = IEPDomainAssessment(
                domain_code=da.domain_code,
                domain_name=da.domain_name,
                overall_level=da.overall_level,
                summary=da.summary,
                sort_order=da.sort_order,
            )
            for item in da.items:
                nda.items.append(
                    IEPAssessmentSnapshotItem(
                        item_name=item.item_name,
                        level=item.level,
                        note=item.note,
                        sort_order=item.sort_order,
                    )
                )
            new.domain_assessments.append(nda)

        for lg in src.long_term_goals:
            nlg = IEPLongTermGoal(
                domain_code=lg.domain_code,
                domain_name=lg.domain_name,
                goal=lg.goal,
                sort_order=lg.sort_order,
            )
            for s in lg.short_term_goals:
                nlg.short_term_goals.append(
                    IEPShortTermGoal(
                        condition=s.condition,
                        behavior=s.behavior,
                        criterion=s.criterion,
                        support_level=s.support_level,
                        status=GoalStatus.NOT_STARTED,
                        teaching_methods=list(s.teaching_methods) if s.teaching_methods else None,
                        materials=list(s.materials) if s.materials else None,
                        sort_order=s.sort_order,
                    )
                )
            new.long_term_goals.append(nlg)

        self.db.add(new)
        await self.db.flush()
        return await self._load_iep(new.id, user_id)

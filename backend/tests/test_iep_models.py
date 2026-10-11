"""IEP 数据层测试：模型关系、0-3 级约束、级联删除、软删除、所有权隔离与 Pydantic 校验。"""

from datetime import date

import bcrypt
import pytest
import pytest_asyncio
from pydantic import ValidationError
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload

from app.models.iep import (
    AssessmentDomain,
    AssessmentItem,
    AssessmentTemplate,
    GoalStatus,
    IEPAssessmentSnapshotItem,
    IEPDomainAssessment,
    IEPGenerationLog,
    IEPLongTermGoal,
    IEPPlan,
    IEPShortTermGoal,
    IEPStatus,
)
from app.models.student import Gender, Student
from app.models.user import User, UserRole
from app.schemas.iep import (
    IEPCreate,
    IEPResponse,
    ShortTermGoalCreate,
)


@pytest_asyncio.fixture
async def owner_student(db_session):
    """一名教师 + 其名下一名学生（已提交）。"""
    user = User(
        email="iep@example.com",
        username="iepuser",
        full_name="IEP Teacher",
        hashed_password=bcrypt.hashpw(b"x", bcrypt.gensalt()).decode(),
        role=UserRole.TEACHER,
        is_active=True,
        token_version=1,
        security_question="What is your pet name?",
        hashed_security_answer=bcrypt.hashpw(b"Fluffy", bcrypt.gensalt()).decode(),
    )
    db_session.add(user)
    await db_session.flush()
    student = Student(
        user_id=user.id,
        name="小明",
        grade="三年级",
        class_name="培智三班",
        gender=Gender.MALE,
        birth_date=date(2018, 9, 1),
    )
    db_session.add(student)
    await db_session.commit()
    await db_session.refresh(user)
    await db_session.refresh(student)
    return user, student


async def _make_iep(db, user, student, **kwargs):
    iep = IEPPlan(user_id=user.id, student_id=student.id, term="2026-2027第一学期", **kwargs)
    db.add(iep)
    await db.flush()
    return iep


async def _load_full_iep(db, iep_id):
    """预加载全部嵌套关系（两层），避免 async 下懒加载触发 MissingGreenlet。"""
    stmt = (
        select(IEPPlan)
        .where(IEPPlan.id == iep_id)
        .options(
            selectinload(IEPPlan.domain_assessments).selectinload(IEPDomainAssessment.items),
            selectinload(IEPPlan.long_term_goals).selectinload(IEPLongTermGoal.short_term_goals),
            selectinload(IEPPlan.generation_logs),
        )
    )
    return (await db.execute(stmt)).scalar_one()


# ---------------- 模板 ----------------


async def test_template_with_domains_and_items(db_session, owner_student):
    user, _ = owner_student
    template = AssessmentTemplate(user_id=user.id, name="默认六领域", is_default=True)
    domain = AssessmentDomain(template=template, code="perception", name="感知", sort_order=0)
    domain.items.append(
        AssessmentItem(
            name="能注视移动的物体",
            observation="在安静环境中观察",
            level_anchors={"0": "不能", "1": "需大量辅助", "2": "需少量辅助", "3": "独立"},
            sort_order=0,
        )
    )
    template.domains.append(domain)
    db_session.add(template)
    await db_session.commit()

    loaded = (
        await db_session.execute(
            select(AssessmentTemplate).where(AssessmentTemplate.user_id == user.id)
        )
    ).scalar_one()
    assert loaded.is_default is True
    assert loaded.domains[0].code == "perception"
    assert loaded.domains[0].items[0].level_anchors["3"] == "独立"


# ---------------- IEP 主体与嵌套 ----------------


async def test_create_full_iep_defaults(db_session, owner_student):
    user, student = owner_student
    iep = await _make_iep(db_session, user, student)

    da = IEPDomainAssessment(
        iep=iep, domain_code="perception", domain_name="感知", overall_level=1, sort_order=0
    )
    da.items.append(IEPAssessmentSnapshotItem(item_name="注视物体", level=1, sort_order=0))
    db_session.add(da)

    ltg = IEPLongTermGoal(
        iep=iep, domain_code="perception", domain_name="感知", goal="提升视觉追踪", sort_order=0
    )
    ltg.short_term_goals.append(
        IEPShortTermGoal(
            condition="在教师提示下",
            behavior="目光追随移动玩具",
            criterion="连续3次每次5秒",
            support_level=2,
            sort_order=0,
        )
    )
    db_session.add(ltg)
    db_session.add(IEPGenerationLog(iep=iep, kind="draft", model="test-model", raw_output="{}"))
    await db_session.commit()

    loaded = await _load_full_iep(db_session, iep.id)
    assert loaded.status == IEPStatus.DRAFT
    assert loaded.revision_no == 1
    assert loaded.domain_assessments[0].items[0].level == 1
    stg = loaded.long_term_goals[0].short_term_goals[0]
    assert stg.status == GoalStatus.NOT_STARTED
    assert stg.support_level == 2
    assert len(loaded.generation_logs) == 1


# ---------------- 0-3 级 check 约束 ----------------


async def test_domain_overall_level_out_of_range(db_session, owner_student):
    user, student = owner_student
    iep = await _make_iep(db_session, user, student)
    db_session.add(IEPDomainAssessment(iep=iep, domain_name="感知", overall_level=4, sort_order=0))
    with pytest.raises(IntegrityError):
        await db_session.flush()
    await db_session.rollback()


async def test_snapshot_item_level_out_of_range(db_session, owner_student):
    user, student = owner_student
    iep = await _make_iep(db_session, user, student)
    da = IEPDomainAssessment(iep=iep, domain_name="感知", sort_order=0)
    db_session.add(da)
    await db_session.flush()
    db_session.add(IEPAssessmentSnapshotItem(domain_assessment=da, item_name="x", level=-1))
    with pytest.raises(IntegrityError):
        await db_session.flush()
    await db_session.rollback()


async def test_short_term_support_level_out_of_range(db_session, owner_student):
    user, student = owner_student
    iep = await _make_iep(db_session, user, student)
    ltg = IEPLongTermGoal(iep=iep, goal="g", sort_order=0)
    db_session.add(ltg)
    await db_session.flush()
    db_session.add(IEPShortTermGoal(long_term_goal=ltg, behavior="b", support_level=9))
    with pytest.raises(IntegrityError):
        await db_session.flush()
    await db_session.rollback()


# ---------------- 级联删除 ----------------


async def test_cascade_delete_iep(db_session, owner_student):
    user, student = owner_student
    iep = await _make_iep(db_session, user, student)
    db_session.add(IEPDomainAssessment(iep=iep, domain_name="感知", sort_order=0))
    ltg = IEPLongTermGoal(iep=iep, goal="g", sort_order=0)
    ltg.short_term_goals.append(IEPShortTermGoal(behavior="b", sort_order=0))
    db_session.add(ltg)
    db_session.add(IEPGenerationLog(iep=iep, kind="draft"))
    await db_session.commit()

    loaded = await _load_full_iep(db_session, iep.id)
    await db_session.delete(loaded)
    await db_session.commit()

    assert (
        await db_session.execute(select(func.count()).select_from(IEPDomainAssessment))
    ).scalar() == 0
    assert (
        await db_session.execute(select(func.count()).select_from(IEPAssessmentSnapshotItem))
    ).scalar() == 0
    assert (
        await db_session.execute(select(func.count()).select_from(IEPLongTermGoal))
    ).scalar() == 0
    assert (
        await db_session.execute(select(func.count()).select_from(IEPShortTermGoal))
    ).scalar() == 0
    assert (
        await db_session.execute(select(func.count()).select_from(IEPGenerationLog))
    ).scalar() == 0


async def test_cascade_delete_template(db_session, owner_student):
    user, _ = owner_student
    template = AssessmentTemplate(user_id=user.id, name="t")
    domain = AssessmentDomain(name="感知", sort_order=0)
    domain.items.append(AssessmentItem(name="条目", sort_order=0))
    template.domains.append(domain)
    db_session.add(template)
    await db_session.commit()

    await db_session.delete(template)
    await db_session.commit()
    assert (
        await db_session.execute(select(func.count()).select_from(AssessmentDomain))
    ).scalar() == 0
    assert (
        await db_session.execute(select(func.count()).select_from(AssessmentItem))
    ).scalar() == 0


# ---------------- 软删除 ----------------


async def test_soft_delete_and_restore(db_session, owner_student):
    user, student = owner_student
    iep = await _make_iep(db_session, user, student)
    await db_session.commit()

    iep.soft_delete()
    await db_session.commit()

    visible = (
        (
            await db_session.execute(
                select(IEPPlan).where(
                    IEPPlan.user_id == user.id, IEPPlan.is_deleted == False
                )  # noqa: E712
            )
        )
        .scalars()
        .all()
    )
    assert visible == []

    iep.restore()
    await db_session.commit()
    again = await db_session.get(IEPPlan, iep.id)
    assert again.is_deleted is False


# ---------------- 所有权隔离 ----------------


async def test_ownership_isolation(db_session, owner_student):
    user, student = owner_student
    other = User(
        email="other@example.com",
        username="otheruser",
        full_name="Other",
        hashed_password=bcrypt.hashpw(b"x", bcrypt.gensalt()).decode(),
        role=UserRole.TEACHER,
        is_active=True,
        token_version=1,
        security_question="What is your pet name?",
        hashed_security_answer=bcrypt.hashpw(b"Fluffy", bcrypt.gensalt()).decode(),
    )
    db_session.add(other)
    await db_session.flush()

    await _make_iep(db_session, user, student)
    other_student = Student(
        user_id=other.id,
        name="小刚",
        gender=Gender.MALE,
        grade="二年级",
        class_name="培智一班",
        birth_date=date(2019, 3, 1),
    )
    db_session.add(other_student)
    await db_session.flush()
    await _make_iep(db_session, other, other_student)
    await db_session.commit()

    mine = (
        (await db_session.execute(select(IEPPlan).where(IEPPlan.user_id == user.id)))
        .scalars()
        .all()
    )
    theirs = (
        (await db_session.execute(select(IEPPlan).where(IEPPlan.user_id == other.id)))
        .scalars()
        .all()
    )
    assert len(mine) == 1
    assert len(theirs) == 1
    assert mine[0].student_id == student.id


# ---------------- Pydantic schema ----------------


def test_schema_rejects_overall_level_out_of_range():
    with pytest.raises(ValidationError):
        IEPCreate(
            student_id="s1",
            term="t",
            domain_assessments=[{"domain_name": "感知", "overall_level": 4}],
        )


def test_schema_rejects_support_level_out_of_range():
    with pytest.raises(ValidationError):
        ShortTermGoalCreate(behavior="b", support_level=5)


def test_schema_valid_nested():
    iep = IEPCreate(
        student_id="s1",
        term="2026秋",
        student_profile="教师提供的情况",
        supports={"teaching": ["视觉提示"], "rehab": [], "family": []},
        domain_assessments=[
            {
                "domain_code": "perception",
                "domain_name": "感知",
                "overall_level": 2,
                "items": [{"item_name": "注视", "level": 2}],
            }
        ],
        long_term_goals=[
            {
                "domain_name": "感知",
                "goal": "提升追踪",
                "short_term_goals": [
                    {
                        "condition": "提示下",
                        "behavior": "追视",
                        "criterion": "3次",
                        "support_level": 2,
                    }
                ],
            }
        ],
    )
    assert iep.supports.teaching == ["视觉提示"]
    assert iep.domain_assessments[0].items[0].level == 2
    assert iep.long_term_goals[0].short_term_goals[0].support_level == 2


async def test_response_serializes_from_orm(db_session, owner_student):
    user, student = owner_student
    iep = await _make_iep(db_session, user, student)
    db_session.add(IEPDomainAssessment(iep=iep, domain_name="感知", sort_order=0))
    db_session.add(IEPLongTermGoal(iep=iep, goal="g", sort_order=0))
    await db_session.commit()
    loaded = await _load_full_iep(db_session, iep.id)

    resp = IEPResponse.model_validate(loaded)
    assert resp.status == IEPStatus.DRAFT
    assert len(resp.domain_assessments) == 1
    assert len(resp.long_term_goals) == 1
    # student_name 无模型属性时安全回退为 None（service 层会显式填充）
    assert resp.student_name is None

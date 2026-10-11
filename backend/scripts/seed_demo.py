"""
seed_demo.py — 生成一套完整、全虚构的演示数据（求职作品集 / 开源演示用）。

运行（在 backend 目录）：
    venv\\Scripts\\python.exe -m scripts.seed_demo

特性：
- 幂等可重复：固定操作演示教师账号 teacher，重建其名下全部业务数据；
- 数据跨最近约 6 个月，月度趋势有起伏；
- 含 IEP 完整链路：评估 → 目标 → 提交 → 锁定 → 修订（双快照对比）；
- 全部人物、分数、事件均为虚构，不对应任何真实学生；
- 不调用大模型，IEP 内容为脚本构造的示例（AI 初稿/成长报告需在界面配置模型后生成）。
"""

import sys
from datetime import date, datetime, timezone
from pathlib import Path

# 允许直接 python scripts/seed_demo.py 运行
BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

from app.core.config import settings  # noqa: E402
from app.core.security import get_password_hash  # noqa: E402
from app.models.course import Course, CourseStatus  # noqa: E402
from app.models.iep import (  # noqa: E402
    GoalStatus,
    IEPAssessmentSnapshotItem,
    IEPDomainAssessment,
    IEPLongTermGoal,
    IEPPlan,
    IEPShortTermGoal,
    IEPStatus,
)
from app.models.lesson_plan import LessonPlan, LessonPlanStatus  # noqa: E402
from app.models.portfolio import Portfolio  # noqa: E402
from app.models.resource import Resource  # noqa: E402
from app.models.student import Gender, Student  # noqa: E402
from app.models.user import User, UserRole, UserStatus  # noqa: E402

DEMO_USERNAME = "teacher"
DEMO_PASSWORD = "Teacher123"

NOW = datetime.now(timezone.utc)

# 默认六领域（自研框架，不含版权量表）
DOMAINS = [
    ("perception", "感知"),
    ("cognition", "认知"),
    ("language", "语言与沟通"),
    ("motor", "运动"),
    ("self_care", "生活自理"),
    ("social", "社会适应"),
]


def month_anchor(months_back: int, day: int = 18) -> datetime:
    """返回 months_back 个月前的一个固定日（落在不同自然月），UTC。"""
    year = NOW.year
    month = NOW.month - months_back
    while month <= 0:
        month += 12
        year -= 1
    day = min(day, 28)
    return datetime(year, month, day, 9, 0, tzinfo=timezone.utc)


# ============================================================
# 演示教师
# ============================================================


def get_or_create_user(session: Session) -> User:
    user = session.query(User).filter(User.username == DEMO_USERNAME).first()
    if user is None:
        user = User(
            email="teacher@example.com",
            username=DEMO_USERNAME,
            hashed_password=get_password_hash(DEMO_PASSWORD),
            full_name="演示教师",
            role=UserRole.TEACHER,
            status=UserStatus.ACTIVE,
            is_active=True,
            security_question="演示账号密保问题",
            hashed_security_answer=get_password_hash("demo"),
        )
        session.add(user)
        session.flush()
    else:
        user.hashed_password = get_password_hash(DEMO_PASSWORD)
    return user


def reset_demo_data(session: Session, user: User) -> None:
    """硬删除该演示教师名下的全部业务数据（仅操作该账号）。"""
    for iep in session.query(IEPPlan).filter(IEPPlan.user_id == user.id).all():
        session.delete(iep)
    session.flush()

    for obj in session.query(Portfolio).filter_by(user_id=user.id).all():
        session.delete(obj)
    for obj in session.query(Resource).filter_by(user_id=user.id).all():
        session.delete(obj)
    for obj in session.query(LessonPlan).filter_by(user_id=user.id).all():
        session.delete(obj)

    for course in session.query(Course).filter(Course.user_id == user.id).all():
        # 让 ORM 解除多对多关联（避免与手动删除重复导致 StaleDataError）
        course.students.clear()
        session.delete(course)
    session.flush()

    for student in session.query(Student).filter(Student.user_id == user.id).all():
        session.delete(student)
    session.commit()


# ============================================================
# IEP 构造辅助
# ============================================================


def add_domain_assessment(iep: IEPPlan, code: str, name: str, level, sort_order: int) -> None:
    da = IEPDomainAssessment(
        domain_code=code,
        domain_name=name,
        overall_level=level,
        summary="" if level is None else f"{name}领域整体处于{level}级",
        sort_order=sort_order,
    )
    if level is not None:
        da.items.append(
            IEPAssessmentSnapshotItem(
                item_name=f"{name}观察项",
                level=level,
                note="",
                sort_order=1,
            )
        )
    iep.domain_assessments.append(da)


def add_long_goal(
    iep: IEPPlan,
    code: str,
    name: str,
    goal_text: str,
    short_goals: list,
    sort_order: int,
) -> None:
    lg = IEPLongTermGoal(
        domain_code=code,
        domain_name=name,
        goal=goal_text,
        sort_order=sort_order,
    )
    for i, sg in enumerate(short_goals):
        lg.short_term_goals.append(
            IEPShortTermGoal(
                condition=sg["condition"],
                behavior=sg["behavior"],
                criterion=sg["criterion"],
                support_level=sg.get("support_level", 1),
                status=sg.get("status", GoalStatus.NOT_STARTED),
                teaching_methods=sg.get("methods", []),
                materials=sg.get("materials", []),
                sort_order=i + 1,
            )
        )
    iep.long_term_goals.append(lg)


def build_iep(
    user: User,
    student: Student,
    term: str,
    status: IEPStatus,
    levels: dict,
    goals: list,
    created: datetime,
    parent: IEPPlan = None,
) -> IEPPlan:
    iep = IEPPlan(
        user_id=user.id,
        student_id=student.id,
        term=term,
        status=status,
        parent_id=parent.id if parent else None,
        revision_no=2 if parent else 1,
        student_profile=f"{student.name}的学习特点与支持需求（示例，非医学诊断）。",
        supports={
            "teaching": ["视觉提示", "分步指令"],
            "rehab": [],
            "family": ["家庭练习配合"],
        },
        evaluation_plan="学期中与学期末各评估一次，结合课堂观察与目标达成情况。",
        created_at=created,
        updated_at=created,
    )
    for sort_order, (code, dname) in enumerate(DOMAINS, start=1):
        add_domain_assessment(iep, code, dname, levels.get(code), sort_order)
    for sort_order, goal in enumerate(goals, start=1):
        add_long_goal(
            iep,
            goal["code"],
            goal["name"],
            goal["goal"],
            goal["short"],
            sort_order,
        )
    if status == IEPStatus.LOCKED:
        iep.reviewed_by = user.id
        iep.reviewed_at = created
    return iep


# ============================================================
# 主流程
# ============================================================


def seed() -> None:  # noqa: C901 - 种子脚本为线性编排，复杂度来自各步骤的数据规格循环
    engine = create_engine(settings.sync_database_url)
    with Session(engine) as session:
        user = get_or_create_user(session)
        reset_demo_data(session, user)
        print(f"[1/6] 演示教师就绪：{DEMO_USERNAME} / {DEMO_PASSWORD}")

        # ---------- 学生（5 名，跨年级，全虚构） ----------
        student_specs = [
            ("陈小明", Gender.MALE, date(2017, 5, 12), "四年级", "培智一班"),
            ("林雨欣", Gender.FEMALE, date(2018, 9, 3), "三年级", "培智一班"),
            ("黄子轩", Gender.MALE, date(2019, 3, 22), "二年级", "培智二班"),
            ("李思琪", Gender.FEMALE, date(2016, 11, 8), "五年级", "培智二班"),
            ("王浩然", Gender.MALE, date(2020, 7, 15), "一年级", "培智三班"),
        ]
        students: list[Student] = []
        for name, gender, birth, grade, klass in student_specs:
            student = Student(
                user_id=user.id,
                name=name,
                gender=gender,
                birth_date=birth,
                grade=grade,
                class_name=klass,
                is_active=True,
                enrollment_date=month_anchor(6).date(),
                created_at=month_anchor(6),
                updated_at=month_anchor(6),
            )
            session.add(student)
            students.append(student)
        session.flush()
        print(f"[2/6] 已创建 {len(students)} 名虚构学生")

        # ---------- 课程（6 门，创建时间分布制造月度起伏） ----------
        course_specs = [
            ("生活适应", "生活适应", "全校", 5, [0, 1, 2, 3, 4]),
            ("唱游与律动", "唱游律动", "低年级", 4, [1, 2, 3, 4]),
            ("运动与保健", "运动保健", "全校", 4, [0, 1, 2, 4]),
            ("生活语文", "生活语文", "中年级", 2, [0, 1, 3]),
            ("生活数学", "生活数学", "中年级", 1, [0, 2, 3]),
            ("绘画与手工", "绘画手工", "低年级", 0, [1, 2]),
        ]
        courses: list[Course] = []
        for cname, subject, grade, mb, idxs in course_specs:
            created = month_anchor(mb)
            course = Course(
                user_id=user.id,
                name=cname,
                subject=subject,
                grade=grade,
                teacher=user.full_name or "演示教师",
                schedule="每周2课时",
                description=f"{cname}课程（演示数据）。",
                status=CourseStatus.ACTIVE,
                created_at=created,
                updated_at=created,
            )
            for i in idxs:
                course.students.append(students[i])
            session.add(course)
            courses.append(course)
        session.flush()
        print(f"[3/6] 已创建 {len(courses)} 门课程及选课关系")

        # ---------- 教案（跨6月，发布为主、少量草稿） ----------
        published_per_month = [2, 3, 1, 4, 3, 2]
        lesson_index = 0
        for mb, count in enumerate(published_per_month):
            created = month_anchor(mb)
            for _ in range(count):
                lesson_index += 1
                session.add(
                    LessonPlan(
                        user_id=user.id,
                        title=f"教案示例 {lesson_index}",
                        subject=courses[lesson_index % len(courses)].subject,
                        grade="中年级",
                        duration=40,
                        teaching_objectives="知识、技能与情感目标（示例）。",
                        teaching_content="教学内容（示例）。",
                        teaching_methods="示范、提示、分层练习。",
                        teaching_process="导入—新授—练习—小结（示例）。",
                        status=LessonPlanStatus.PUBLISHED,
                        created_at=created,
                        updated_at=created,
                    )
                )
        for k in range(2):
            created = month_anchor(0)
            session.add(
                LessonPlan(
                    user_id=user.id,
                    title=f"未完成教案 {k + 1}",
                    subject="生活适应",
                    grade="低年级",
                    duration=40,
                    status=LessonPlanStatus.DRAFT,
                    created_at=created,
                    updated_at=created,
                )
            )
        session.flush()
        print(f"[4/6] 已创建 {lesson_index} 篇发布教案与 2 篇草稿")

        # ---------- 资源（8 个，不同类型） ----------
        resource_specs = [
            ("视觉提示卡模板", "pdf", 5),
            ("分层练习纸", "docx", 4),
            ("课堂规则图卡", "png", 3),
            ("律动示范视频", "mp4", 3),
            ("生活适应课件", "pptx", 2),
            ("家长沟通模板", "docx", 2),
            ("精细动作训练图", "pdf", 1),
            ("学期评价量规示例", "xlsx", 0),
        ]
        for rname, ftype, mb in resource_specs:
            created = month_anchor(mb)
            session.add(
                Resource(
                    user_id=user.id,
                    name=rname,
                    description=f"{rname}（演示资源，无真实文件）。",
                    file_path=f"demo/{rname}.{ftype}",
                    file_name=f"{rname}.{ftype}",
                    file_size=1024 * (mb + 1),
                    file_type=ftype,
                    created_at=created,
                    updated_at=created,
                )
            )
        session.flush()
        print("[5/6] 已创建 8 个演示资源")

        # ---------- 成长档案评价（每学生3条，跨月，体现成长） ----------
        base_scores = {
            0: [45, 40, 50, 48, 38],
            1: [55, 52, 60, 58, 50],
            2: [40, 42, 48, 45, 35],
            3: [60, 58, 55, 62, 58],
            4: [35, 38, 42, 40, 32],
        }
        eval_points = [(4, "期初观察评价"), (2, "中期评价"), (0, "期末评价")]
        for si, base in base_scores.items():
            for step, (mb, title) in enumerate(eval_points):
                created = month_anchor(mb)
                scores = [min(95, base[d] + step * 6 + (d % 2) * step) for d in range(5)]
                attention = scores[4] if not (si == 2 and step == 1) else None
                session.add(
                    Portfolio(
                        user_id=user.id,
                        student_id=students[si].id,
                        type="evaluation",
                        title=title,
                        content="课堂观察与作品表现综合评价（示例）。",
                        cognitive_score=scores[0],
                        skill_score=scores[1],
                        creativity_score=scores[2],
                        cooperation_score=scores[3],
                        attention_score=attention,
                        created_at=created,
                        updated_at=created,
                    )
                )
        session.flush()

        # ---------- IEP：3 名重点学生的双版本链路 ----------
        prev_levels = {
            0: {
                "perception": 1,
                "cognition": 1,
                "language": 0,
                "motor": 1,
                "self_care": 1,
                "social": 0,
            },
            1: {
                "perception": 2,
                "cognition": 1,
                "language": 1,
                "motor": 2,
                "self_care": 1,
                "social": 1,
            },
            2: {
                "perception": 1,
                "cognition": 0,
                "language": 0,
                "motor": 1,
                "self_care": 0,
                "social": 0,
            },
        }
        prev_terms = {}
        for si in (0, 1, 2):
            prev = build_iep(
                user,
                students[si],
                term="2025-2026第二学期",
                status=IEPStatus.LOCKED,
                levels=prev_levels[si],
                goals=[
                    {
                        "code": "perception",
                        "name": "感知",
                        "goal": "巩固视觉追踪与辨别能力",
                        "short": [
                            {
                                "condition": "在教师提示下",
                                "behavior": "辨别两种常见物品",
                                "criterion": "连续3次正确",
                                "support_level": 1,
                                "status": GoalStatus.ACHIEVED,
                                "methods": ["示范", "强化"],
                                "materials": ["实物卡片"],
                            }
                        ],
                    }
                ],
                created=month_anchor(5),
            )
            session.add(prev)
            session.flush()
            prev_terms[si] = prev

        curr_levels = {
            0: {
                "perception": 2,
                "cognition": 2,
                "language": 1,
                "motor": 2,
                "self_care": 2,
                "social": 1,
            },
            1: {
                "perception": 2,
                "cognition": 2,
                "language": 2,
                "motor": 2,
                "self_care": 2,
                "social": 2,
            },
            2: {
                "perception": 2,
                "cognition": 1,
                "language": 1,
                "motor": 1,
                "self_care": 1,
                "social": 0,
            },
        }
        curr_status = {
            0: IEPStatus.LOCKED,
            1: IEPStatus.REVIEW,
            2: IEPStatus.DRAFT,
        }
        for si in (0, 1, 2):
            curr = build_iep(
                user,
                students[si],
                term="2026-2027第一学期",
                status=curr_status[si],
                levels=curr_levels[si],
                goals=[
                    {
                        "code": "self_care",
                        "name": "生活自理",
                        "goal": "提高进餐与穿脱衣物的独立性",
                        "short": [
                            {
                                "condition": "午餐时间",
                                "behavior": "独立使用勺子进餐",
                                "criterion": "连续5天少洒落",
                                "support_level": 2,
                                "status": (
                                    GoalStatus.ACHIEVED if si == 0 else GoalStatus.IN_PROGRESS
                                ),
                                "methods": ["任务分解", "正向强化"],
                                "materials": ["餐具", "步骤图"],
                            },
                            {
                                "condition": "午睡前后",
                                "behavior": "配合穿脱外套",
                                "criterion": "一周4次在少量提示下完成",
                                "support_level": 2,
                                "status": (
                                    GoalStatus.MAINTAIN if si == 0 else GoalStatus.NOT_STARTED
                                ),
                                "methods": ["提示"],
                                "materials": ["外套"],
                            },
                        ],
                    }
                ],
                created=month_anchor(1 if si == 2 else 3),
                parent=prev_terms[si],
            )
            session.add(curr)

        simple_specs = [
            (3, IEPStatus.REVIEW, month_anchor(2)),
            (4, IEPStatus.DRAFT, month_anchor(0)),
        ]
        for si, st, created in simple_specs:
            session.add(
                build_iep(
                    user,
                    students[si],
                    term="2026-2027第一学期",
                    status=st,
                    levels={
                        "perception": 2,
                        "cognition": 2,
                        "language": 1,
                        "motor": 2,
                        "self_care": 1,
                        "social": 1,
                    },
                    goals=[],
                    created=created,
                )
            )
        session.commit()
        print("[6/6] 已创建 IEP（含3组双版本对比，覆盖草稿/送审/锁定）")

    print("\n演示数据生成完成。登录：teacher / Teacher123")


if __name__ == "__main__":
    seed()

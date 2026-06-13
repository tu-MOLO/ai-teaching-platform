"""
Reporting services used by the frontend dashboard and reports pages.
"""
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Sequence

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.course import Course, CourseStatus, course_student
from app.models.lesson_plan import LessonPlan, LessonPlanStatus
from app.models.resource import Resource
from app.models.student import Student


class ReportService:
    """Aggregated reporting queries."""

    @staticmethod
    def get_month_start(base_date: datetime, month_offset: int = 0) -> datetime:
        year = base_date.year + (base_date.month + month_offset - 1) // 12
        month = (base_date.month + month_offset - 1) % 12 + 1
        return base_date.replace(
    year=year,
    month=month,
    day=1,
    hour=0,
    minute=0,
    second=0,
     microsecond=0)

    @staticmethod
    async def get_dashboard_stats(
        db: AsyncSession, user_id: Optional[str] = None) -> Dict[str, Any]:
        course_filters = [Course.is_deleted == False]  # noqa: E712
        student_filters = [Student.is_deleted == False]  # noqa: E712
        lesson_plan_filters = [LessonPlan.is_deleted == False]  # noqa: E712
        resource_filters = [Resource.is_deleted == False]  # noqa: E712

        if user_id is not None:
          course_filters.append(Course.user_id == user_id)
          student_filters.append(Student.user_id == user_id)
          lesson_plan_filters.append(LessonPlan.user_id == user_id)
          resource_filters.append(Resource.user_id == user_id)

        total_courses = (
            await db.execute(select(func.count()).select_from(Course).where(*course_filters))
        ).scalar() or 0
        total_students = (
            await db.execute(select(func.count()).select_from(Student).where(*student_filters))
        ).scalar() or 0
        total_resources = (
            await db.execute(select(func.count()).select_from(Resource).where(*resource_filters))
        ).scalar() or 0

        # 计算活跃课程数（进行中状态）
        active_courses = (
            await db.execute(
                select(func.count()).select_from(Course).where(
                    *course_filters,
                    Course.status == CourseStatus.ACTIVE,
                )
            )
        ).scalar() or 0

        # 计算草稿教案数
        draft_lesson_plans = (
            await db.execute(
                select(func.count()).select_from(LessonPlan).where(
                    *lesson_plan_filters,
                    LessonPlan.status == LessonPlanStatus.DRAFT,
                )
            )
        ).scalar() or 0

        # 计算教案完成率（已发布教案 / 总教案）
        total_lesson_plans = (
            await db.execute(
                select(func.count()).select_from(LessonPlan).where(*lesson_plan_filters)
            )
        ).scalar() or 0
        published_lesson_plans = (
            await db.execute(
                select(func.count()).select_from(LessonPlan).where(
                    *lesson_plan_filters,
                    LessonPlan.status == LessonPlanStatus.PUBLISHED,
                )
            )
        ).scalar() or 0
        completion_rate = round((published_lesson_plans / total_lesson_plans * \
                                100), 0) if total_lesson_plans > 0 else 0

        now = datetime.now()
        current_month_start = ReportService.get_month_start(now, 0)
        last_month_start = ReportService.get_month_start(now, -1)
        two_months_ago_start = ReportService.get_month_start(now, -2)

        monthly_courses = (
            await db.execute(
                select(func.count()).select_from(Course).where(
                    *course_filters,
                    Course.created_at >= current_month_start,
                )
            )
        ).scalar() or 0
        monthly_students = (
            await db.execute(
                select(func.count()).select_from(Student).where(
                    *student_filters,
                    Student.created_at >= current_month_start,
                )
            )
        ).scalar() or 0
        monthly_lesson_plans = (
            await db.execute(
                select(func.count()).select_from(LessonPlan).where(
                    *lesson_plan_filters,
                    LessonPlan.status == LessonPlanStatus.PUBLISHED,
                    LessonPlan.created_at >= current_month_start,
                )
            )
        ).scalar() or 0

        last_month_courses = (
            await db.execute(
                select(func.count()).select_from(Course).where(
                    *course_filters,
                    Course.created_at >= last_month_start,
                    Course.created_at < current_month_start,
                )
            )
        ).scalar() or 0
        two_months_ago_courses = (
            await db.execute(
                select(func.count()).select_from(Course).where(
                    *course_filters,
                    Course.created_at >= two_months_ago_start,
                    Course.created_at < last_month_start,
                )
            )
        ).scalar() or 0
        last_month_students = (
            await db.execute(
                select(func.count()).select_from(Student).where(
                    *student_filters,
                    Student.created_at >= last_month_start,
                    Student.created_at < current_month_start,
                )
            )
        ).scalar() or 0
        two_months_ago_students = (
            await db.execute(
                select(func.count()).select_from(Student).where(
                    *student_filters,
                    Student.created_at >= two_months_ago_start,
                    Student.created_at < last_month_start,
                )
            )
        ).scalar() or 0

        recent_activities = await ReportService._build_recent_activities(
            db, course_filters, student_filters, now
        )

        return {
            "totalCourses": total_courses,
            "totalStudents": total_students,
            "activeCourses": active_courses,
            "averageProgress": completion_rate,
            "courseTrend": ReportService._format_growth(last_month_courses, two_months_ago_courses),
            "studentTrend": ReportService._format_growth(last_month_students, two_months_ago_students),
            "recentActivities": recent_activities,
            "monthlyCourses": monthly_courses,
            "monthlyStudents": monthly_students,
            "monthlyLessonPlans": monthly_lesson_plans,
            "draftLessonPlans": draft_lesson_plans,
            "completionRate": completion_rate,
            "aiAssistants": 0,
            "totalResources": total_resources,
        }

    @staticmethod
    def _format_growth(current: int, previous: int) -> str:
        if previous > 0:
            growth = ((current - previous) / previous) * 100
            return f"{'+' if growth >= 0 else ''}{round(growth)}%"
        if current > 0:
            return "+100%"
        return "+0%"

    @staticmethod
    def _relative_time(now: datetime, dt: datetime) -> str:
        delta = now - dt.replace(tzinfo=None) if dt.tzinfo else now - dt
        if delta.days == 0:
            if delta.seconds < 3600:
                return f"{max(delta.seconds // 60, 1)}分钟前"
            return f"{delta.seconds // 3600}小时前"
        return f"{delta.days}天前"

    @staticmethod
    async def _build_recent_activities(
        db: AsyncSession,
        course_filters: list,
        student_filters: list,
        now: datetime,
    ) -> List[Dict[str, Any]]:
        recent_activities: List[Dict[str, Any]] = []
        recent_courses = (
            await db.execute(
                select(Course).where(*course_filters).order_by(Course.created_at.desc()).limit(3)
            )
        ).scalars().all()
        recent_students = (
            await db.execute(
                select(Student).where(*student_filters).order_by(Student.created_at.desc()).limit(2)
            )
        ).scalars().all()

        for course in recent_courses:
            recent_activities.append(
                {
                    "id": f"course_{course.id}",
                    "title": "新增课程",
                    "description": f"创建了课程《{course.name}》",
                    "icon": "BookOutlined",
                    "time": ReportService._relative_time(now, course.created_at),
                    "desc": course.subject,
                    "color": "#c9a87c",
                    "sort_time": course.created_at,
                }
            )

        for student in recent_students:
            recent_activities.append(
                {
                    "id": f"student_{student.id}",
                    "title": "新增学生",
                    "description": f"添加了学生 {student.name}",
                    "icon": "UserOutlined",
                    "time": ReportService._relative_time(now, student.created_at),
                    "desc": f"{student.grade} {student.class_name}",
                    "color": "#6b9b7a",
                    "sort_time": student.created_at,
                }
            )

        recent_activities = sorted(
            recent_activities,
            key=lambda item: item["sort_time"],
            reverse=True,
        )[:5]
        for item in recent_activities:
            item.pop("sort_time", None)

        return recent_activities

    @staticmethod
    async def get_course_statistics(
        db: AsyncSession, user_id: Optional[str] = None) -> Dict[str, Any]:
        course_filters = [Course.is_deleted == False]  # noqa: E712
        if user_id is not None:
            course_filters.append(Course.user_id == user_id)

        subject_stats: Sequence[Any] = (
            await db.execute(
                select(Course.subject, func.count().label("count"))
                .where(*course_filters)
                .group_by(Course.subject)
            )
        ).all()
        total_courses = sum(item.count for item in subject_stats)
        colors = ["#c9a87c", "#6b9b7a", "#7a9ab8", "#d4a574", "#9b8b7a", "#b8a07a", "#7ab8a0"]

        category_stats = [
            {
                "name": item.subject,
                "value": item.count,
                "percent": round((item.count / total_courses * 100) if total_courses else 0, 0),
                "color": colors[index % len(colors)],
            }
            for index, item in enumerate(subject_stats)
        ]

        status_stats: Sequence[Any] = (
            await db.execute(
                select(Course.status, func.count().label("count"))
                .where(*course_filters)
                .group_by(Course.status)
            )
        ).all()
        status_map = {"active": "进行中", "inactive": "已结课", "draft": "草稿"}
        status_distribution = [
            {
                "status": status_map.get(str(item.status), str(item.status)),
                "count": item.count,
                "percent": round((item.count / total_courses * 100) if total_courses else 0, 0),
            }
            for item in status_stats
        ]

        hot_courses = []
        hot_course_rows = (
            await db.execute(
                select(Course).where(*course_filters).order_by(Course.created_at.desc()).limit(5)
            )
        ).scalars().all()
        for course in hot_course_rows:
            student_count = (
                await db.execute(
                    select(func.count()).select_from(course_student).where(
                        course_student.c.course_id == course.id
                    )
                )
            ).scalar() or 0
            hot_courses.append(
                {
                    "id": course.id,
                    "name": course.name,
                    "studentCount": student_count,
                    "completionRate": 0,
                }
            )

        return {
            "categoryStats": category_stats,
            "hotCourses": hot_courses,
            "statusDistribution": status_distribution,
        }

    @staticmethod
    async def get_student_statistics(
        db: AsyncSession, user_id: Optional[str] = None) -> Dict[str, Any]:
        student_filters = [Student.is_deleted == False]  # noqa: E712
        if user_id is not None:
            student_filters.append(Student.user_id == user_id)

        grade_stats: Sequence[Any] = (
            await db.execute(
                select(Student.grade, func.count().label("count"))
                .where(*student_filters)
                .group_by(Student.grade)
                .order_by(Student.grade)
            )
        ).all()
        total_students = sum(item.count for item in grade_stats)
        colors = ["#c9a87c", "#6b9b7a", "#7a9ab8", "#d4a574", "#9b8b7a", "#b8a07a"]
        grade_distribution = [
            {
                "grade": item.grade,
                "count": item.count,
                "percent": round((item.count / total_students * 100) if total_students else 0, 0),
                "color": colors[index % len(colors)],
            }
            for index, item in enumerate(grade_stats)
        ]

        gender_stats: Sequence[Any] = (
            await db.execute(
                select(Student.gender, func.count().label("count"))
                .where(*student_filters)
                .group_by(Student.gender)
            )
        ).all()
        gender_distribution = [
            {
                "gender": item.gender,
                "count": item.count,
                "percent": round((item.count / total_students * 100) if total_students else 0, 0),
            }
            for item in gender_stats
        ]

        progress_distribution = [
            {"range": "优秀(90-100%)", "count": 0, "percent": 0},
            {"range": "良好(80-89%)", "count": 0, "percent": 0},
            {"range": "中等(60-79%)", "count": 0, "percent": 0},
            {"range": "需努力(<60%)", "count": 0, "percent": 0},
        ]

        return {
            "gradeDistribution": grade_distribution,
            "genderDistribution": gender_distribution,
            "progressDistribution": progress_distribution,
        }

    @staticmethod
    async def get_monthly_trends(
        db: AsyncSession,
        months: int = 6,
        user_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        course_filters = [Course.is_deleted == False]  # noqa: E712
        student_filters = [Student.is_deleted == False]  # noqa: E712
        lesson_plan_filters = [LessonPlan.is_deleted == False]  # noqa: E712
        if user_id is not None:
            course_filters.append(Course.user_id == user_id)
            student_filters.append(Student.user_id == user_id)
            lesson_plan_filters.append(LessonPlan.user_id == user_id)

        trends: List[Dict[str, Any]] = []
        current_date = datetime.now()
        for offset in range(months - 1, -1, -1):
            month_start = ReportService.get_month_start(current_date, -offset)
            month_end = ReportService.get_month_start(
                current_date, -offset + 1) - timedelta(seconds=1)

            courses_count = (
                await db.execute(
                    select(func.count()).select_from(Course).where(
                        *course_filters,
                        Course.created_at >= month_start,
                        Course.created_at <= month_end,
                    )
                )
            ).scalar() or 0
            students_count = (
                await db.execute(
                    select(func.count()).select_from(Student).where(
                        *student_filters,
                        Student.created_at >= month_start,
                        Student.created_at <= month_end,
                    )
                )
            ).scalar() or 0
            lesson_plans_count = (
                await db.execute(
                    select(func.count()).select_from(LessonPlan).where(
                        *lesson_plan_filters,
                        LessonPlan.created_at >= month_start,
                        LessonPlan.created_at <= month_end,
                    )
                )
            ).scalar() or 0

            trends.append(
                {
                    "month": month_start.strftime("%Y-%m"),
                    "newCourses": courses_count,
                    "newStudents": students_count,
                    "newLessonPlans": lesson_plans_count,
                }
            )

        return trends

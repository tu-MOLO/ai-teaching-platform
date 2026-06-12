from datetime import date, datetime, timezone

import pytest
import bcrypt

from app.models.user import User, UserRole
from app.models.course import Course, CourseStatus, course_student
from app.models.student import Student, Gender
from app.models.lesson_plan import LessonPlan, LessonPlanStatus
from app.services.reports import ReportService


class TestGetMonthStart:
    def test_current_month(self):
        base = datetime(2024, 3, 15, 14, 30, 45)
        result = ReportService.get_month_start(base, 0)
        assert result == datetime(2024, 3, 1, 0, 0, 0)

    def test_previous_month(self):
        base = datetime(2024, 3, 15)
        result = ReportService.get_month_start(base, -1)
        assert result == datetime(2024, 2, 1, 0, 0, 0)

    def test_year_boundary_january_to_december(self):
        base = datetime(2024, 1, 15)
        result = ReportService.get_month_start(base, -1)
        assert result == datetime(2023, 12, 1, 0, 0, 0)

    def test_year_boundary_december_to_january(self):
        base = datetime(2024, 12, 15)
        result = ReportService.get_month_start(base, 1)
        assert result == datetime(2025, 1, 1, 0, 0, 0)

    def test_multiple_months_back(self):
        base = datetime(2024, 6, 15)
        result = ReportService.get_month_start(base, -5)
        assert result == datetime(2024, 1, 1, 0, 0, 0)

    def test_multiple_months_forward(self):
        base = datetime(2024, 1, 15)
        result = ReportService.get_month_start(base, 2)
        assert result == datetime(2024, 3, 1, 0, 0, 0)

    def test_default_offset_is_zero(self):
        base = datetime(2024, 7, 20)
        result = ReportService.get_month_start(base)
        assert result == datetime(2024, 7, 1, 0, 0, 0)

    def test_leap_year_february(self):
        base = datetime(2024, 3, 10)
        result = ReportService.get_month_start(base, -1)
        assert result == datetime(2024, 2, 1, 0, 0, 0)

    def test_non_leap_year_february(self):
        base = datetime(2023, 3, 10)
        result = ReportService.get_month_start(base, -1)
        assert result == datetime(2023, 2, 1, 0, 0, 0)

    def test_large_offset_across_years(self):
        base = datetime(2024, 5, 15)
        result = ReportService.get_month_start(base, -18)
        assert result == datetime(2022, 11, 1, 0, 0, 0)

    def test_large_offset_forward_across_years(self):
        base = datetime(2024, 5, 15)
        result = ReportService.get_month_start(base, 18)
        assert result == datetime(2025, 11, 1, 0, 0, 0)


async def _create_report_user(db_session):
    user = User(
        email="report_user@example.com",
        username="report_user",
        hashed_password=bcrypt.hashpw(
            "Pass123!".encode(), bcrypt.gensalt()
        ).decode(),
        role=UserRole.TEACHER,
        is_active=True,
        security_question="q?",
        hashed_security_answer=bcrypt.hashpw(
            "a".encode(), bcrypt.gensalt()
        ).decode(),
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


class TestGetDashboardStats:
    @pytest.mark.asyncio
    async def test_empty_database(self, db_session):
        stats = await ReportService.get_dashboard_stats(db_session)
        assert stats["totalCourses"] == 0
        assert stats["totalStudents"] == 0
        assert stats["activeCourses"] == 0
        assert stats["totalResources"] == 0
        assert stats["draftLessonPlans"] == 0
        assert stats["completionRate"] == 0
        assert stats["recentActivities"] == []

    @pytest.mark.asyncio
    async def test_with_courses_and_students(self, db_session):
        user = await _create_report_user(db_session)
        now = datetime.now(timezone.utc)

        c1 = Course(
            name="数学课",
            subject="数学",
            grade="三年级",
            teacher="王老师",
            status=CourseStatus.ACTIVE,
            user_id=user.id,
            created_at=now,
        )
        c2 = Course(
            name="语文课",
            subject="语文",
            grade="三年级",
            teacher="李老师",
            status=CourseStatus.DRAFT,
            user_id=user.id,
            created_at=now,
        )
        db_session.add_all([c1, c2])

        s1 = Student(
            name="张三",
            gender=Gender.MALE,
            birth_date=date(2015, 5, 10),
            grade="三年级",
            class_name="1班",
            user_id=user.id,
            created_at=now,
        )
        s2 = Student(
            name="李四",
            gender=Gender.FEMALE,
            birth_date=date(2015, 8, 20),
            grade="三年级",
            class_name="2班",
            user_id=user.id,
            created_at=now,
        )
        db_session.add_all([s1, s2])
        await db_session.commit()

        stats = await ReportService.get_dashboard_stats(db_session)
        assert stats["totalCourses"] == 2
        assert stats["totalStudents"] == 2
        assert stats["activeCourses"] == 1

    @pytest.mark.asyncio
    async def test_with_lesson_plans(self, db_session):
        user = await _create_report_user(db_session)
        now = datetime.now(timezone.utc)

        lp1 = LessonPlan(
            title="教案1",
            subject="数学",
            grade="三年级",
            duration=45,
            status=LessonPlanStatus.PUBLISHED,
            user_id=user.id,
            created_at=now,
        )
        lp2 = LessonPlan(
            title="教案2",
            subject="语文",
            grade="三年级",
            duration=40,
            status=LessonPlanStatus.DRAFT,
            user_id=user.id,
            created_at=now,
        )
        lp3 = LessonPlan(
            title="教案3",
            subject="英语",
            grade="三年级",
            duration=35,
            status=LessonPlanStatus.PUBLISHED,
            user_id=user.id,
            created_at=now,
        )
        db_session.add_all([lp1, lp2, lp3])
        await db_session.commit()

        stats = await ReportService.get_dashboard_stats(db_session)
        assert stats["draftLessonPlans"] == 1
        assert stats["completionRate"] == 67

    @pytest.mark.asyncio
    async def test_with_user_filter(self, db_session):
        user = await _create_report_user(db_session)
        now = datetime.now(timezone.utc)

        c1 = Course(
            name="过滤课",
            subject="数学",
            grade="三年级",
            teacher="王老师",
            status=CourseStatus.ACTIVE,
            user_id=user.id,
            created_at=now,
        )
        db_session.add(c1)
        await db_session.commit()

        stats_filtered = await ReportService.get_dashboard_stats(
            db_session, user_id=user.id
        )
        assert stats_filtered["totalCourses"] >= 1

        stats_other = await ReportService.get_dashboard_stats(
            db_session, user_id="nonexistent-id"
        )
        assert stats_other["totalCourses"] == 0

    @pytest.mark.asyncio
    async def test_recent_activities(self, db_session):
        user = await _create_report_user(db_session)
        now = datetime.now(timezone.utc)

        c = Course(
            name="活动课",
            subject="数学",
            grade="三年级",
            teacher="王老师",
            status=CourseStatus.ACTIVE,
            user_id=user.id,
            created_at=now,
        )
        s = Student(
            name="活动学生",
            gender=Gender.MALE,
            birth_date=date(2015, 1, 1),
            grade="三年级",
            class_name="1班",
            user_id=user.id,
            created_at=now,
        )
        db_session.add_all([c, s])
        await db_session.commit()

        stats = await ReportService.get_dashboard_stats(db_session)
        assert len(stats["recentActivities"]) >= 1
        titles = [a["title"] for a in stats["recentActivities"]]
        assert "新增课程" in titles or "新增学生" in titles


class TestGetCourseStatistics:
    @pytest.mark.asyncio
    async def test_empty_database(self, db_session):
        result = await ReportService.get_course_statistics(db_session)
        assert result["categoryStats"] == []
        assert result["hotCourses"] == []
        assert result["statusDistribution"] == []

    @pytest.mark.asyncio
    async def test_category_and_status_stats(self, db_session):
        user = await _create_report_user(db_session)
        now = datetime.now(timezone.utc)

        c1 = Course(
            name="数学课",
            subject="数学",
            grade="三年级",
            teacher="王老师",
            status=CourseStatus.ACTIVE,
            user_id=user.id,
            created_at=now,
        )
        c2 = Course(
            name="语文课",
            subject="语文",
            grade="三年级",
            teacher="李老师",
            status=CourseStatus.INACTIVE,
            user_id=user.id,
            created_at=now,
        )
        c3 = Course(
            name="数学课2",
            subject="数学",
            grade="四年级",
            teacher="赵老师",
            status=CourseStatus.DRAFT,
            user_id=user.id,
            created_at=now,
        )
        db_session.add_all([c1, c2, c3])
        await db_session.commit()

        result = await ReportService.get_course_statistics(db_session)
        cat_names = [c["name"] for c in result["categoryStats"]]
        assert "数学" in cat_names
        assert "语文" in cat_names

        math_stat = next(c for c in result["categoryStats"] if c["name"] == "数学")
        assert math_stat["value"] == 2
        assert math_stat["percent"] == 67

        status_vals = [s["status"] for s in result["statusDistribution"]]
        assert any("ACTIVE" in v or "进行中" in v for v in status_vals)
        assert any("INACTIVE" in v or "已结课" in v for v in status_vals)
        assert any("DRAFT" in v or "草稿" in v for v in status_vals)

    @pytest.mark.asyncio
    async def test_hot_courses(self, db_session):
        user = await _create_report_user(db_session)
        now = datetime.now(timezone.utc)

        c = Course(
            name="热门课",
            subject="数学",
            grade="三年级",
            teacher="王老师",
            status=CourseStatus.ACTIVE,
            user_id=user.id,
            created_at=now,
        )
        db_session.add(c)
        await db_session.commit()
        await db_session.refresh(c)

        s = Student(
            name="选课学生",
            gender=Gender.MALE,
            birth_date=date(2015, 1, 1),
            grade="三年级",
            class_name="1班",
            user_id=user.id,
            created_at=now,
        )
        db_session.add(s)
        await db_session.commit()
        await db_session.refresh(s)

        await db_session.execute(
            course_student.insert().values(
                course_id=c.id, student_id=s.id
            )
        )
        await db_session.commit()

        result = await ReportService.get_course_statistics(db_session)
        assert len(result["hotCourses"]) >= 1
        hot = result["hotCourses"][0]
        assert hot["name"] == "热门课"
        assert hot["studentCount"] == 1


class TestGetStudentStatistics:
    @pytest.mark.asyncio
    async def test_empty_database(self, db_session):
        result = await ReportService.get_student_statistics(db_session)
        assert result["gradeDistribution"] == []
        assert result["genderDistribution"] == []
        assert len(result["progressDistribution"]) == 4

    @pytest.mark.asyncio
    async def test_grade_and_gender_distribution(self, db_session):
        user = await _create_report_user(db_session)
        now = datetime.now(timezone.utc)

        s1 = Student(
            name="张三",
            gender=Gender.MALE,
            birth_date=date(2015, 5, 10),
            grade="三年级",
            class_name="1班",
            user_id=user.id,
            created_at=now,
        )
        s2 = Student(
            name="李四",
            gender=Gender.FEMALE,
            birth_date=date(2015, 8, 20),
            grade="三年级",
            class_name="2班",
            user_id=user.id,
            created_at=now,
        )
        s3 = Student(
            name="王五",
            gender=Gender.MALE,
            birth_date=date(2014, 3, 15),
            grade="四年级",
            class_name="1班",
            user_id=user.id,
            created_at=now,
        )
        db_session.add_all([s1, s2, s3])
        await db_session.commit()

        result = await ReportService.get_student_statistics(db_session)
        grade_vals = [g["grade"] for g in result["gradeDistribution"]]
        assert "三年级" in grade_vals
        assert "四年级" in grade_vals

        grade3 = next(g for g in result["gradeDistribution"] if g["grade"] == "三年级")
        assert grade3["count"] == 2
        assert grade3["percent"] == 67

        gender_vals = [g["gender"] for g in result["genderDistribution"]]
        assert Gender.MALE in gender_vals
        assert Gender.FEMALE in gender_vals


class TestGetMonthlyTrends:
    @pytest.mark.asyncio
    async def test_empty_database(self, db_session):
        trends = await ReportService.get_monthly_trends(db_session, months=3)
        assert len(trends) == 3
        for t in trends:
            assert t["newCourses"] == 0
            assert t["newStudents"] == 0
            assert t["newLessonPlans"] == 0

    @pytest.mark.asyncio
    async def test_with_current_month_data(self, db_session):
        user = await _create_report_user(db_session)
        now = datetime.now(timezone.utc)

        c = Course(
            name="趋势课",
            subject="数学",
            grade="三年级",
            teacher="王老师",
            status=CourseStatus.ACTIVE,
            user_id=user.id,
            created_at=now,
        )
        s = Student(
            name="趋势学生",
            gender=Gender.MALE,
            birth_date=date(2015, 1, 1),
            grade="三年级",
            class_name="1班",
            user_id=user.id,
            created_at=now,
        )
        lp = LessonPlan(
            title="趋势教案",
            subject="数学",
            grade="三年级",
            duration=45,
            status=LessonPlanStatus.DRAFT,
            user_id=user.id,
            created_at=now,
        )
        db_session.add_all([c, s, lp])
        await db_session.commit()

        trends = await ReportService.get_monthly_trends(db_session, months=3)
        current_month = now.strftime("%Y-%m")
        current = next(t for t in trends if t["month"] == current_month)
        assert current["newCourses"] >= 1
        assert current["newStudents"] >= 1
        assert current["newLessonPlans"] >= 1

    @pytest.mark.asyncio
    async def test_months_parameter(self, db_session):
        trends = await ReportService.get_monthly_trends(db_session, months=6)
        assert len(trends) == 6
        for i in range(len(trends) - 1):
            assert trends[i]["month"] < trends[i + 1]["month"]

    @pytest.mark.asyncio
    async def test_with_user_filter(self, db_session):
        user = await _create_report_user(db_session)
        now = datetime.now(timezone.utc)

        c = Course(
            name="过滤趋势课",
            subject="数学",
            grade="三年级",
            teacher="王老师",
            status=CourseStatus.ACTIVE,
            user_id=user.id,
            created_at=now,
        )
        db_session.add(c)
        await db_session.commit()

        trends_filtered = await ReportService.get_monthly_trends(
            db_session, months=3, user_id=user.id
        )
        current_month = now.strftime("%Y-%m")
        filtered_current = next(
            t for t in trends_filtered if t["month"] == current_month
        )
        assert filtered_current["newCourses"] >= 1

        trends_other = await ReportService.get_monthly_trends(
            db_session, months=3, user_id="nonexistent-id"
        )
        other_current = next(
            t for t in trends_other if t["month"] == current_month
        )
        assert other_current["newCourses"] == 0

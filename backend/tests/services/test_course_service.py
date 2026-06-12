import pytest

from app.services.courses import CourseService
from app.schemas.course import CourseCreate, CourseUpdate
from app.models.notification import NotificationType


class TestCourseServiceIntegration:
    @pytest.mark.asyncio
    async def test_create_with_real_db(self, db_session, test_user):
        course_in = CourseCreate(
            name="数学基础",
            subject="数学",
            grade="三年级",
            teacher="张老师",
            description="数学基础课程",
        )
        course = await CourseService.create(db_session, course_in, test_user.id, "张老师")
        assert course is not None
        assert course.name == "数学基础"
        assert course.subject == "数学"
        assert course.teacher == "张老师"
        assert course.user_id == test_user.id

    @pytest.mark.asyncio
    async def test_create_generates_notification(self, db_session, test_user):
        from sqlalchemy import select
        from app.models.notification import Notification

        course_in = CourseCreate(
            name="语文阅读",
            subject="语文",
            grade="二年级",
            teacher="李老师",
        )
        course = await CourseService.create(db_session, course_in, test_user.id, "李老师")

        result = await db_session.execute(
            select(Notification).where(
                Notification.target_id == course.id,
                Notification.target_type == "course",
            )
        )
        notification = result.scalar_one_or_none()
        assert notification is not None
        assert notification.type == NotificationType.COURSE

    @pytest.mark.asyncio
    async def test_get_by_id_with_real_db(self, db_session, test_user):
        course_in = CourseCreate(
            name="英语口语",
            subject="英语",
            grade="四年级",
            teacher="王老师",
        )
        created = await CourseService.create(db_session, course_in, test_user.id, "王老师")

        course = await CourseService.get_by_id(db_session, created.id, test_user.id)
        assert course is not None
        assert course.name == "英语口语"

    @pytest.mark.asyncio
    async def test_get_by_id_returns_none_for_wrong_user(self, db_session, test_user):
        course_in = CourseCreate(
            name="物理实验",
            subject="物理",
            grade="五年级",
            teacher="赵老师",
        )
        created = await CourseService.create(db_session, course_in, test_user.id, "赵老师")

        course = await CourseService.get_by_id(db_session, created.id, "wrong-user-id")
        assert course is None

    @pytest.mark.asyncio
    async def test_get_list_with_real_db(self, db_session, test_user):
        for i in range(3):
            course_in = CourseCreate(
                name=f"课程{i}",
                subject="化学",
                grade="六年级",
                teacher="孙老师",
            )
            await CourseService.create(db_session, course_in, test_user.id, "孙老师")

        courses = await CourseService.get_list(db_session, test_user.id)
        assert len(courses) >= 3

    @pytest.mark.asyncio
    async def test_get_list_with_keyword_filter(self, db_session, test_user):
        course_in = CourseCreate(
            name="独特课程名称",
            subject="生物",
            grade="七年级",
            teacher="周老师",
        )
        await CourseService.create(db_session, course_in, test_user.id, "周老师")

        courses = await CourseService.get_list(db_session, test_user.id, keyword="独特课程")
        assert len(courses) >= 1
        assert courses[0].name == "独特课程名称"

    @pytest.mark.asyncio
    async def test_get_list_with_subject_filter(self, db_session, test_user):
        course_in = CourseCreate(
            name="历史课",
            subject="历史",
            grade="八年级",
            teacher="吴老师",
        )
        await CourseService.create(db_session, course_in, test_user.id, "吴老师")

        courses = await CourseService.get_list(db_session, test_user.id, subject="历史")
        assert len(courses) >= 1
        assert all(c.subject == "历史" for c in courses)

    @pytest.mark.asyncio
    async def test_count_with_real_db(self, db_session, test_user):
        initial_count = await CourseService.count(db_session, test_user.id)

        course_in = CourseCreate(
            name="地理课",
            subject="地理",
            grade="九年级",
            teacher="郑老师",
        )
        await CourseService.create(db_session, course_in, test_user.id, "郑老师")

        new_count = await CourseService.count(db_session, test_user.id)
        assert new_count == initial_count + 1

    @pytest.mark.asyncio
    async def test_count_with_grade_filter(self, db_session, test_user):
        course_in = CourseCreate(
            name="政治课",
            subject="政治",
            grade="高一",
            teacher="钱老师",
        )
        await CourseService.create(db_session, course_in, test_user.id, "钱老师")

        count = await CourseService.count(db_session, test_user.id, grade="高一")
        assert count >= 1

    @pytest.mark.asyncio
    async def test_update_with_real_db(self, db_session, test_user):
        course_in = CourseCreate(
            name="更新前课程",
            subject="音乐",
            grade="高二",
            teacher="冯老师",
        )
        created = await CourseService.create(db_session, course_in, test_user.id, "冯老师")

        update_data = CourseUpdate(name="更新后课程", grade="高三")
        updated = await CourseService.update(db_session, created.id, update_data, test_user.id, "冯老师")
        assert updated is not None
        assert updated.name == "更新后课程"
        assert updated.grade == "高三"

    @pytest.mark.asyncio
    async def test_update_returns_none_for_wrong_user(self, db_session, test_user):
        course_in = CourseCreate(
            name="不可更新课程",
            subject="美术",
            grade="高三",
            teacher="陈老师",
        )
        created = await CourseService.create(db_session, course_in, test_user.id, "陈老师")

        update_data = CourseUpdate(name="不应更新")
        result = await CourseService.update(db_session, created.id, update_data, "wrong-user-id", "陈老师")
        assert result is None

    @pytest.mark.asyncio
    async def test_delete_with_real_db(self, db_session, test_user):
        course_in = CourseCreate(
            name="待删除课程",
            subject="体育",
            grade="四年级",
            teacher="韩老师",
        )
        created = await CourseService.create(db_session, course_in, test_user.id, "韩老师")

        result = await CourseService.delete(db_session, created.id, test_user.id)
        assert result is True

        course = await CourseService.get_by_id(db_session, created.id, test_user.id)
        assert course is None

    @pytest.mark.asyncio
    async def test_delete_returns_false_for_wrong_user(self, db_session, test_user):
        course_in = CourseCreate(
            name="不可删除课程",
            subject="信息技术",
            grade="五年级",
            teacher="杨老师",
        )
        created = await CourseService.create(db_session, course_in, test_user.id, "杨老师")

        result = await CourseService.delete(db_session, created.id, "wrong-user-id")
        assert result is False

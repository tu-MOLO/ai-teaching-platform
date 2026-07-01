from datetime import date
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.models.notification import NotificationType
from app.schemas.student import StudentCreate, StudentUpdate
from app.services.students import StudentService


def _make_portfolio(cognitive=None, skill=None, creativity=None, cooperation=None, attention=None):
    p = MagicMock()
    p.cognitive_score = cognitive
    p.skill_score = skill
    p.creativity_score = creativity
    p.cooperation_score = cooperation
    p.attention_score = attention
    return p


class TestComputeProgressFromPortfolios:
    def test_empty_list_returns_zero(self):
        result = StudentService._compute_progress_from_portfolios([])
        assert result == 0

    def test_single_portfolio(self):
        portfolio = _make_portfolio(
            cognitive=80, skill=70, creativity=90, cooperation=60, attention=50
        )
        result = StudentService._compute_progress_from_portfolios([portfolio])
        assert result == 70

    def test_multiple_portfolios(self):
        p1 = _make_portfolio(cognitive=80, skill=70, creativity=90, cooperation=60, attention=50)
        p2 = _make_portfolio(cognitive=60, skill=80, creativity=70, cooperation=90, attention=100)
        result = StudentService._compute_progress_from_portfolios([p1, p2])
        assert result == 75

    def test_partial_scores_some_none(self):
        p1 = _make_portfolio(
            cognitive=80, skill=None, creativity=90, cooperation=None, attention=50
        )
        p2 = _make_portfolio(
            cognitive=60, skill=80, creativity=None, cooperation=90, attention=None
        )
        result = StudentService._compute_progress_from_portfolios([p1, p2])
        expected_cognitive = (80 + 60) / 2
        expected_skill = 80 / 1
        expected_creativity = 90 / 1
        expected_cooperation = 90 / 1
        expected_attention = 50 / 1
        expected_avg = (
            expected_cognitive
            + expected_skill
            + expected_creativity
            + expected_cooperation
            + expected_attention
        ) / 5
        assert result == round(expected_avg)

    def test_all_zeros(self):
        portfolio = _make_portfolio(cognitive=0, skill=0, creativity=0, cooperation=0, attention=0)
        result = StudentService._compute_progress_from_portfolios([portfolio])
        assert result == 0

    def test_all_100s(self):
        portfolio = _make_portfolio(
            cognitive=100, skill=100, creativity=100, cooperation=100, attention=100
        )
        result = StudentService._compute_progress_from_portfolios([portfolio])
        assert result == 100

    def test_rounding(self):
        p1 = _make_portfolio(cognitive=81, skill=72, creativity=93, cooperation=64, attention=55)
        result = StudentService._compute_progress_from_portfolios([p1])
        assert result == round((81 + 72 + 93 + 64 + 55) / 5)

    def test_all_none_scores_returns_zero(self):
        portfolio = _make_portfolio(
            cognitive=None, skill=None, creativity=None, cooperation=None, attention=None
        )
        result = StudentService._compute_progress_from_portfolios([portfolio])
        assert result == 0


class TestVerifyOwnership:
    @pytest.mark.asyncio
    async def test_student_belongs_to_user(self):
        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = MagicMock()
        mock_db.execute.return_value = mock_result

        result = await StudentService.verify_ownership(mock_db, "student-1", "user-1")
        assert result is True

    @pytest.mark.asyncio
    async def test_student_does_not_belong_to_user(self):
        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result

        result = await StudentService.verify_ownership(mock_db, "student-1", "user-2")
        assert result is False


class TestCalculateProgress:
    @pytest.mark.asyncio
    async def test_no_portfolios_returns_zero(self):
        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_scalars = MagicMock()
        mock_scalars.all.return_value = []
        mock_result.scalars.return_value = mock_scalars
        mock_db.execute.return_value = mock_result

        result = await StudentService.calculate_progress(mock_db, "student-1")
        assert result == 0

    @pytest.mark.asyncio
    async def test_with_portfolios(self):
        mock_db = AsyncMock()
        p1 = _make_portfolio(cognitive=80, skill=70, creativity=90, cooperation=60, attention=50)
        mock_result = MagicMock()
        mock_scalars = MagicMock()
        mock_scalars.all.return_value = [p1]
        mock_result.scalars.return_value = mock_scalars
        mock_db.execute.return_value = mock_result

        result = await StudentService.calculate_progress(mock_db, "student-1")
        assert result == 70


class TestStudentServiceIntegration:
    @pytest.mark.asyncio
    async def test_create_with_real_db(self, db_session, test_user):
        student_in = StudentCreate(
            name="张三",
            gender="male",
            birth_date=date(2015, 3, 15),
            grade="三年级",
            class_name="1班",
        )
        student = await StudentService.create(db_session, student_in, test_user.id)
        assert student is not None
        assert student.name == "张三"
        assert student.grade == "三年级"
        assert student.class_name == "1班"
        assert student.user_id == test_user.id
        assert student.is_deleted is False

    @pytest.mark.asyncio
    async def test_create_generates_notification(self, db_session, test_user):
        from sqlalchemy import select

        from app.models.notification import Notification

        student_in = StudentCreate(
            name="李四",
            gender="female",
            birth_date=date(2016, 5, 20),
            grade="二年级",
            class_name="2班",
        )
        student = await StudentService.create(db_session, student_in, test_user.id)

        result = await db_session.execute(
            select(Notification).where(
                Notification.target_id == student.id,
                Notification.target_type == "student",
            )
        )
        notification = result.scalar_one_or_none()
        assert notification is not None
        assert notification.title == "添加学生成功"
        assert "李四" in notification.content
        assert notification.type == NotificationType.SYSTEM

    @pytest.mark.asyncio
    async def test_get_with_real_db(self, db_session, test_user):
        student_in = StudentCreate(
            name="王五",
            gender="male",
            birth_date=date(2014, 8, 10),
            grade="四年级",
            class_name="3班",
        )
        created = await StudentService.create(db_session, student_in, test_user.id)

        student = await StudentService.get(db_session, created.id, test_user.id)
        assert student is not None
        assert student.name == "王五"
        assert student.progress == 0

    @pytest.mark.asyncio
    async def test_get_returns_none_for_wrong_user(self, db_session, test_user):
        student_in = StudentCreate(
            name="赵六",
            gender="female",
            birth_date=date(2015, 1, 1),
            grade="三年级",
            class_name="1班",
        )
        created = await StudentService.create(db_session, student_in, test_user.id)

        student = await StudentService.get(db_session, created.id, "nonexistent-user-id")
        assert student is None

    @pytest.mark.asyncio
    async def test_get_list_with_real_db(self, db_session, test_user):
        for i in range(3):
            student_in = StudentCreate(
                name=f"学生{i}",
                gender="male",
                birth_date=date(2015, 1, 1),
                grade="三年级",
                class_name="1班",
            )
            await StudentService.create(db_session, student_in, test_user.id)

        students = await StudentService.get_list(db_session, test_user.id)
        assert len(students) >= 3
        for s in students:
            assert hasattr(s, "progress")

    @pytest.mark.asyncio
    async def test_get_list_with_keyword_filter(self, db_session, test_user):
        student_in = StudentCreate(
            name="独特名字小明",
            gender="male",
            birth_date=date(2015, 1, 1),
            grade="三年级",
            class_name="特殊班级",
        )
        await StudentService.create(db_session, student_in, test_user.id)

        students = await StudentService.get_list(db_session, test_user.id, keyword="独特名字")
        assert len(students) >= 1
        assert students[0].name == "独特名字小明"

    @pytest.mark.asyncio
    async def test_get_list_with_grade_filter(self, db_session, test_user):
        student_in = StudentCreate(
            name="五年级学生",
            gender="male",
            birth_date=date(2013, 1, 1),
            grade="五年级",
            class_name="1班",
        )
        await StudentService.create(db_session, student_in, test_user.id)

        students = await StudentService.get_list(db_session, test_user.id, grade="五年级")
        assert len(students) >= 1
        assert all(s.grade == "五年级" for s in students)

    @pytest.mark.asyncio
    async def test_update_with_real_db(self, db_session, test_user):
        student_in = StudentCreate(
            name="更新前",
            gender="male",
            birth_date=date(2015, 1, 1),
            grade="三年级",
            class_name="1班",
        )
        created = await StudentService.create(db_session, student_in, test_user.id)

        update_data = StudentUpdate(name="更新后", grade="四年级")
        updated = await StudentService.update(db_session, created.id, update_data, test_user.id)
        assert updated is not None
        assert updated.name == "更新后"
        assert updated.grade == "四年级"

    @pytest.mark.asyncio
    async def test_update_returns_none_for_wrong_user(self, db_session, test_user):
        student_in = StudentCreate(
            name="他人学生",
            gender="male",
            birth_date=date(2015, 1, 1),
            grade="三年级",
            class_name="1班",
        )
        created = await StudentService.create(db_session, student_in, test_user.id)

        update_data = StudentUpdate(name="不应更新")
        result = await StudentService.update(db_session, created.id, update_data, "wrong-user-id")
        assert result is None

    @pytest.mark.asyncio
    async def test_delete_with_real_db(self, db_session, test_user):
        student_in = StudentCreate(
            name="待删除",
            gender="male",
            birth_date=date(2015, 1, 1),
            grade="三年级",
            class_name="1班",
        )
        created = await StudentService.create(db_session, student_in, test_user.id)

        result = await StudentService.delete(db_session, created.id, test_user.id)
        assert result is True

        student = await StudentService.get(db_session, created.id, test_user.id)
        assert student is None

    @pytest.mark.asyncio
    async def test_delete_returns_false_for_wrong_user(self, db_session, test_user):
        student_in = StudentCreate(
            name="他人学生",
            gender="male",
            birth_date=date(2015, 1, 1),
            grade="三年级",
            class_name="1班",
        )
        created = await StudentService.create(db_session, student_in, test_user.id)

        result = await StudentService.delete(db_session, created.id, "wrong-user-id")
        assert result is False

    @pytest.mark.asyncio
    async def test_count_with_real_db(self, db_session, test_user):
        initial_count = await StudentService.count(db_session, test_user.id)

        for i in range(3):
            student_in = StudentCreate(
                name=f"计数学生{i}",
                gender="male",
                birth_date=date(2015, 1, 1),
                grade="三年级",
                class_name="1班",
            )
            await StudentService.create(db_session, student_in, test_user.id)

        new_count = await StudentService.count(db_session, test_user.id)
        assert new_count == initial_count + 3

    @pytest.mark.asyncio
    async def test_count_with_grade_filter(self, db_session, test_user):
        student_in = StudentCreate(
            name="六年级学生",
            gender="male",
            birth_date=date(2012, 1, 1),
            grade="六年级",
            class_name="1班",
        )
        await StudentService.create(db_session, student_in, test_user.id)

        count = await StudentService.count(db_session, test_user.id, grade="六年级")
        assert count >= 1

    @pytest.mark.asyncio
    async def test_verify_ownership_with_real_db(self, db_session, test_user):
        student_in = StudentCreate(
            name="归属测试",
            gender="male",
            birth_date=date(2015, 1, 1),
            grade="三年级",
            class_name="1班",
        )
        created = await StudentService.create(db_session, student_in, test_user.id)

        assert await StudentService.verify_ownership(db_session, created.id, test_user.id) is True
        assert (
            await StudentService.verify_ownership(db_session, created.id, "wrong-user-id") is False
        )

    @pytest.mark.asyncio
    async def test_calculate_progress_with_real_db(self, db_session, test_user):
        from app.schemas.portfolio import PortfolioCreate
        from app.services.portfolios import PortfolioService

        student_in = StudentCreate(
            name="进度测试",
            gender="male",
            birth_date=date(2015, 1, 1),
            grade="三年级",
            class_name="1班",
        )
        created = await StudentService.create(db_session, student_in, test_user.id)

        progress = await StudentService.calculate_progress(db_session, created.id)
        assert progress == 0

        portfolio_in = PortfolioCreate(
            student_id=created.id,
            type="evaluation",
            title="期中评价",
            cognitive_score=80,
            skill_score=70,
            creativity_score=90,
            cooperation_score=60,
            attention_score=50,
        )
        await PortfolioService.create(db_session, portfolio_in, test_user.id)

        progress = await StudentService.calculate_progress(db_session, created.id)
        assert progress == 70

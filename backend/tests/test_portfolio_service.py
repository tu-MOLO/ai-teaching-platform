import pytest
from datetime import date

from app.services.portfolio import PortfolioService
from app.schemas.portfolio import PortfolioCreate, PortfolioUpdate
from app.schemas.student import StudentCreate
from app.services.student import StudentService


class TestPortfolioServiceIntegration:
    @pytest.mark.asyncio
    async def test_create_with_real_db(self, db_session, test_user):
        student_in = StudentCreate(
            name="档案学生",
            gender="male",
            birth_date=date(2015, 1, 1),
            grade="三年级",
            class_name="1班",
        )
        student = await StudentService.create(db_session, student_in, test_user.id)

        portfolio_in = PortfolioCreate(
            student_id=student.id,
            type="evaluation",
            title="期中评价",
            content="表现优秀",
            cognitive_score=85,
            skill_score=90,
        )
        portfolio = await PortfolioService.create(db_session, portfolio_in, test_user.id)
        assert portfolio is not None
        assert portfolio.title == "期中评价"
        assert portfolio.student_id == student.id
        assert portfolio.user_id == test_user.id
        assert portfolio.cognitive_score == 85
        assert portfolio.skill_score == 90

    @pytest.mark.asyncio
    async def test_get_by_id_with_real_db(self, db_session, test_user):
        student_in = StudentCreate(
            name="获取档案学生",
            gender="female",
            birth_date=date(2016, 5, 10),
            grade="二年级",
            class_name="2班",
        )
        student = await StudentService.create(db_session, student_in, test_user.id)

        portfolio_in = PortfolioCreate(
            student_id=student.id,
            type="work",
            title="作品集",
            content="优秀作品",
        )
        created = await PortfolioService.create(db_session, portfolio_in, test_user.id)

        portfolio = await PortfolioService.get(db_session, created.id, test_user.id)
        assert portfolio is not None
        assert portfolio.title == "作品集"

    @pytest.mark.asyncio
    async def test_get_by_id_returns_none_for_wrong_user(self, db_session, test_user):
        student_in = StudentCreate(
            name="他人档案学生",
            gender="male",
            birth_date=date(2014, 3, 15),
            grade="四年级",
            class_name="3班",
        )
        student = await StudentService.create(db_session, student_in, test_user.id)

        portfolio_in = PortfolioCreate(
            student_id=student.id,
            type="observation",
            title="观察记录",
        )
        created = await PortfolioService.create(db_session, portfolio_in, test_user.id)

        portfolio = await PortfolioService.get(db_session, created.id, "wrong-user-id")
        assert portfolio is None

    @pytest.mark.asyncio
    async def test_get_list_with_real_db(self, db_session, test_user):
        student_in = StudentCreate(
            name="列表档案学生",
            gender="male",
            birth_date=date(2015, 1, 1),
            grade="三年级",
            class_name="1班",
        )
        student = await StudentService.create(db_session, student_in, test_user.id)

        for i in range(3):
            portfolio_in = PortfolioCreate(
                student_id=student.id,
                type="milestone",
                title=f"里程碑{i}",
            )
            await PortfolioService.create(db_session, portfolio_in, test_user.id)

        portfolios = await PortfolioService.get_list(db_session, test_user.id)
        assert len(portfolios) >= 3

    @pytest.mark.asyncio
    async def test_get_list_with_student_filter(self, db_session, test_user):
        student_in = StudentCreate(
            name="筛选档案学生",
            gender="female",
            birth_date=date(2015, 6, 1),
            grade="三年级",
            class_name="2班",
        )
        student = await StudentService.create(db_session, student_in, test_user.id)

        portfolio_in = PortfolioCreate(
            student_id=student.id,
            type="evaluation",
            title="筛选评价",
        )
        await PortfolioService.create(db_session, portfolio_in, test_user.id)

        portfolios = await PortfolioService.get_list(db_session, test_user.id, student_id=student.id)
        assert len(portfolios) >= 1
        assert all(p.student_id == student.id for p in portfolios)

    @pytest.mark.asyncio
    async def test_get_list_with_type_filter(self, db_session, test_user):
        student_in = StudentCreate(
            name="类型筛选学生",
            gender="male",
            birth_date=date(2015, 1, 1),
            grade="三年级",
            class_name="1班",
        )
        student = await StudentService.create(db_session, student_in, test_user.id)

        portfolio_in = PortfolioCreate(
            student_id=student.id,
            type="work",
            title="作品类型",
        )
        await PortfolioService.create(db_session, portfolio_in, test_user.id)

        portfolios = await PortfolioService.get_list(db_session, test_user.id, type="work")
        assert len(portfolios) >= 1
        assert all(p.type == "work" for p in portfolios)

    @pytest.mark.asyncio
    async def test_update_with_real_db(self, db_session, test_user):
        student_in = StudentCreate(
            name="更新档案学生",
            gender="male",
            birth_date=date(2015, 1, 1),
            grade="三年级",
            class_name="1班",
        )
        student = await StudentService.create(db_session, student_in, test_user.id)

        portfolio_in = PortfolioCreate(
            student_id=student.id,
            type="evaluation",
            title="更新前标题",
            cognitive_score=70,
        )
        created = await PortfolioService.create(db_session, portfolio_in, test_user.id)

        update_data = PortfolioUpdate(title="更新后标题", cognitive_score=90)
        updated = await PortfolioService.update(db_session, created.id, update_data, test_user.id)
        assert updated is not None
        assert updated.title == "更新后标题"
        assert updated.cognitive_score == 90

    @pytest.mark.asyncio
    async def test_update_returns_none_for_wrong_user(self, db_session, test_user):
        student_in = StudentCreate(
            name="不可更新档案学生",
            gender="male",
            birth_date=date(2015, 1, 1),
            grade="三年级",
            class_name="1班",
        )
        student = await StudentService.create(db_session, student_in, test_user.id)

        portfolio_in = PortfolioCreate(
            student_id=student.id,
            type="evaluation",
            title="不应更新",
        )
        created = await PortfolioService.create(db_session, portfolio_in, test_user.id)

        update_data = PortfolioUpdate(title="错误更新")
        result = await PortfolioService.update(db_session, created.id, update_data, "wrong-user-id")
        assert result is None

    @pytest.mark.asyncio
    async def test_delete_with_real_db(self, db_session, test_user):
        student_in = StudentCreate(
            name="删除档案学生",
            gender="male",
            birth_date=date(2015, 1, 1),
            grade="三年级",
            class_name="1班",
        )
        student = await StudentService.create(db_session, student_in, test_user.id)

        portfolio_in = PortfolioCreate(
            student_id=student.id,
            type="evaluation",
            title="待删除档案",
        )
        created = await PortfolioService.create(db_session, portfolio_in, test_user.id)

        result = await PortfolioService.delete(db_session, created.id, test_user.id)
        assert result is True

        portfolio = await PortfolioService.get(db_session, created.id, test_user.id)
        assert portfolio is None

    @pytest.mark.asyncio
    async def test_delete_returns_false_for_wrong_user(self, db_session, test_user):
        student_in = StudentCreate(
            name="不可删除档案学生",
            gender="male",
            birth_date=date(2015, 1, 1),
            grade="三年级",
            class_name="1班",
        )
        student = await StudentService.create(db_session, student_in, test_user.id)

        portfolio_in = PortfolioCreate(
            student_id=student.id,
            type="evaluation",
            title="不可删除",
        )
        created = await PortfolioService.create(db_session, portfolio_in, test_user.id)

        result = await PortfolioService.delete(db_session, created.id, "wrong-user-id")
        assert result is False

    @pytest.mark.asyncio
    async def test_count_with_real_db(self, db_session, test_user):
        student_in = StudentCreate(
            name="计数档案学生",
            gender="male",
            birth_date=date(2015, 1, 1),
            grade="三年级",
            class_name="1班",
        )
        student = await StudentService.create(db_session, student_in, test_user.id)

        initial_count = await PortfolioService.count(db_session, test_user.id)

        portfolio_in = PortfolioCreate(
            student_id=student.id,
            type="evaluation",
            title="计数档案",
        )
        await PortfolioService.create(db_session, portfolio_in, test_user.id)

        new_count = await PortfolioService.count(db_session, test_user.id)
        assert new_count == initial_count + 1

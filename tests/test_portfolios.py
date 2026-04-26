"""
档案模块CRUD测试
"""
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.portfolio import Portfolio
from app.models.student import Student
from app.models.user import User
from tests.factories import PortfolioFactory, StudentFactory


class TestPortfolioCreate:
    """档案创建测试"""

    @pytest.mark.asyncio
    async def test_create_portfolio_success(self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession, test_user: User):
        """测试成功创建档案"""
        # 先创建学生
        student = StudentFactory.create(user_id=test_user.id)
        db_session.add(student)
        await db_session.commit()

        response = await client.post("/api/v1/portfolios", headers=auth_headers, json={
            "student_id": student.id,
            "type": "work",
            "title": "优秀作品",
            "content": "这是一份优秀的作品",
            "cognitive_score": 90
        })

        assert response.status_code == 201
        data = response.json()
        assert data["data"]["title"] == "优秀作品"
        assert data["data"]["type"] == "work"
        assert data["data"]["student_id"] == student.id

    @pytest.mark.asyncio
    async def test_create_portfolio_missing_fields(self, client: AsyncClient, auth_headers: dict):
        """测试缺少必填字段"""
        response = await client.post("/api/v1/portfolios", headers=auth_headers, json={
            "title": "优秀作品"
            # 缺少 student_id, type
        })

        assert response.status_code == 422


class TestPortfolioRead:
    """档案查询测试"""

    @pytest.mark.asyncio
    async def test_get_portfolio_success(self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession, test_user: User):
        """测试成功查询单个档案"""
        # 创建学生
        student = StudentFactory.create(user_id=test_user.id)
        db_session.add(student)
        await db_session.commit()

        # 创建档案
        portfolio = PortfolioFactory.create(student_id=student.id, user_id=test_user.id)
        db_session.add(portfolio)
        await db_session.commit()

        response = await client.get(f"/api/v1/portfolios/{portfolio.id}", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["data"]["id"] == portfolio.id
        assert data["data"]["title"] == portfolio.title

    @pytest.mark.asyncio
    async def test_list_portfolios(self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession, test_user: User):
        """测试查询档案列表"""
        # 创建学生
        student = StudentFactory.create(user_id=test_user.id)
        db_session.add(student)
        await db_session.commit()

        # 创建多个档案
        for i in range(5):
            portfolio = PortfolioFactory.create(student_id=student.id, user_id=test_user.id, title=f"档案{i}")
            db_session.add(portfolio)
        await db_session.commit()

        response = await client.get("/api/v1/portfolios", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "total" in data


class TestPortfolioUpdate:
    """档案更新测试"""

    @pytest.mark.asyncio
    async def test_update_portfolio_success(self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession, test_user: User):
        """测试成功更新档案"""
        # 创建学生
        student = StudentFactory.create(user_id=test_user.id)
        db_session.add(student)
        await db_session.commit()

        # 创建档案
        portfolio = PortfolioFactory.create(student_id=student.id, user_id=test_user.id)
        db_session.add(portfolio)
        await db_session.commit()

        response = await client.put(f"/api/v1/portfolios/{portfolio.id}", headers=auth_headers, json={
            "title": "更新后的档案",
            "cognitive_score": 95
        })

        assert response.status_code == 200
        data = response.json()
        assert data["data"]["title"] == "更新后的档案"
        assert data["data"]["cognitive_score"] == 95


class TestPortfolioDelete:
    """档案删除测试"""

    @pytest.mark.asyncio
    async def test_delete_portfolio_success(self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession, test_user: User):
        """测试成功删除档案"""
        # 创建学生
        student = StudentFactory.create(user_id=test_user.id)
        db_session.add(student)
        await db_session.commit()

        # 创建档案
        portfolio = PortfolioFactory.create(student_id=student.id, user_id=test_user.id)
        db_session.add(portfolio)
        await db_session.commit()

        response = await client.delete(f"/api/v1/portfolios/{portfolio.id}", headers=auth_headers)

        assert response.status_code == 204

        # 验证已软删除
        await db_session.refresh(portfolio)
        assert portfolio.is_deleted is True

        # 验证学生仍然存在
        await db_session.refresh(student)
        assert student.is_deleted is False

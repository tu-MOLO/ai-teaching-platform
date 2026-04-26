"""
教案模块CRUD测试
"""
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.lesson_plan import LessonPlan, LessonPlanStatus
from app.models.user import User
from tests.factories import LessonPlanFactory


class TestLessonPlanCreate:
    """教案创建测试"""

    @pytest.mark.asyncio
    async def test_create_lesson_plan_success(self, client: AsyncClient, auth_headers: dict, test_user: User):
        """测试成功创建教案"""
        response = await client.post("/api/v1/lesson-plans", headers=auth_headers, json={
            "title": "数学教案",
            "subject": "数学",
            "grade": "一年级",
            "duration": 45
        })

        assert response.status_code == 201
        data = response.json()
        assert data["data"]["title"] == "数学教案"
        assert data["data"]["subject"] == "数学"
        assert data["data"]["status"] == "draft"

    @pytest.mark.asyncio
    async def test_create_lesson_plan_missing_fields(self, client: AsyncClient, auth_headers: dict):
        """测试缺少必填字段"""
        response = await client.post("/api/v1/lesson-plans", headers=auth_headers, json={
            "title": "数学教案"
            # 缺少 subject, grade, duration
        })

        assert response.status_code == 422


class TestLessonPlanRead:
    """教案查询测试"""

    @pytest.mark.asyncio
    async def test_get_lesson_plan_success(self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession, test_user: User):
        """测试成功查询单个教案"""
        # 创建教案
        lesson_plan = LessonPlanFactory.create(user_id=test_user.id)
        db_session.add(lesson_plan)
        await db_session.commit()

        response = await client.get(f"/api/v1/lesson-plans/{lesson_plan.id}", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["data"]["id"] == lesson_plan.id
        assert data["data"]["title"] == lesson_plan.title

    @pytest.mark.asyncio
    async def test_get_lesson_plan_not_found(self, client: AsyncClient, auth_headers: dict):
        """测试查询不存在教案"""
        response = await client.get("/api/v1/lesson-plans/non-existent-id", headers=auth_headers)

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_list_lesson_plans(self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession, test_user: User):
        """测试查询教案列表"""
        # 创建多个教案
        for i in range(5):
            lesson_plan = LessonPlanFactory.create(user_id=test_user.id, title=f"教案{i}")
            db_session.add(lesson_plan)
        await db_session.commit()

        response = await client.get("/api/v1/lesson-plans", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "total" in data

    @pytest.mark.asyncio
    async def test_list_lesson_plans_filter_by_status(self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession, test_user: User):
        """测试按状态筛选教案"""
        # 创建不同状态的教案
        draft_plan = LessonPlanFactory.create(user_id=test_user.id, status=LessonPlanStatus.DRAFT)
        published_plan = LessonPlanFactory.create(user_id=test_user.id, status=LessonPlanStatus.PUBLISHED)
        db_session.add_all([draft_plan, published_plan])
        await db_session.commit()

        response = await client.get("/api/v1/lesson-plans?status=published", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        for plan in data["data"]:
            assert plan["status"] == "published"


class TestLessonPlanUpdate:
    """教案更新测试"""

    @pytest.mark.asyncio
    async def test_update_lesson_plan_success(self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession, test_user: User):
        """测试成功更新教案"""
        # 创建教案
        lesson_plan = LessonPlanFactory.create(user_id=test_user.id)
        db_session.add(lesson_plan)
        await db_session.commit()

        response = await client.put(f"/api/v1/lesson-plans/{lesson_plan.id}", headers=auth_headers, json={
            "title": "更新后的教案",
            "duration": 60
        })

        assert response.status_code == 200
        data = response.json()
        assert data["data"]["title"] == "更新后的教案"
        assert data["data"]["duration"] == 60

    @pytest.mark.asyncio
    async def test_publish_lesson_plan(self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession, test_user: User):
        """测试发布教案"""
        # 创建草稿状态的教案
        lesson_plan = LessonPlanFactory.create(user_id=test_user.id, status=LessonPlanStatus.DRAFT)
        db_session.add(lesson_plan)
        await db_session.commit()

        response = await client.put(f"/api/v1/lesson-plans/{lesson_plan.id}", headers=auth_headers, json={
            "status": "published"
        })

        assert response.status_code == 200
        data = response.json()
        assert data["data"]["status"] == "published"

    @pytest.mark.asyncio
    async def test_archive_lesson_plan(self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession, test_user: User):
        """测试归档教案"""
        # 创建已发布的教案
        lesson_plan = LessonPlanFactory.create(user_id=test_user.id, status=LessonPlanStatus.PUBLISHED)
        db_session.add(lesson_plan)
        await db_session.commit()

        response = await client.put(f"/api/v1/lesson-plans/{lesson_plan.id}", headers=auth_headers, json={
            "status": "archived"
        })

        assert response.status_code == 200
        data = response.json()
        assert data["data"]["status"] == "archived"


class TestLessonPlanDelete:
    """教案删除测试"""

    @pytest.mark.asyncio
    async def test_delete_lesson_plan_success(self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession, test_user: User):
        """测试成功删除教案"""
        # 创建教案
        lesson_plan = LessonPlanFactory.create(user_id=test_user.id)
        db_session.add(lesson_plan)
        await db_session.commit()

        response = await client.delete(f"/api/v1/lesson-plans/{lesson_plan.id}", headers=auth_headers)

        assert response.status_code == 204

        # 验证已软删除
        await db_session.refresh(lesson_plan)
        assert lesson_plan.is_deleted is True

    @pytest.mark.asyncio
    async def test_delete_lesson_plan_not_found(self, client: AsyncClient, auth_headers: dict):
        """测试删除不存在教案"""
        response = await client.delete("/api/v1/lesson-plans/non-existent-id", headers=auth_headers)

        assert response.status_code == 404

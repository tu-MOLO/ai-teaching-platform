"""
标签模块CRUD测试
"""
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tag import Tag
from tests.factories import TagFactory


class TestTagCreate:
    """标签创建测试"""

    @pytest.mark.asyncio
    async def test_create_tag_success(self, client: AsyncClient, auth_headers: dict):
        """测试成功创建标签"""
        response = await client.post("/api/v1/tags", headers=auth_headers, json={
            "name": "数学",
            "color": "#FF0000"
        })

        assert response.status_code == 201
        data = response.json()
        assert data["data"]["name"] == "数学"
        assert data["data"]["color"] == "#FF0000"

    @pytest.mark.asyncio
    async def test_create_tag_duplicate(self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession):
        """测试创建重复标签"""
        # 先创建一个标签
        tag = TagFactory.create(name="唯一标签")
        db_session.add(tag)
        await db_session.commit()

        # 尝试创建同名标签
        response = await client.post("/api/v1/tags", headers=auth_headers, json={
            "name": "唯一标签"
        })

        assert response.status_code == 400


class TestTagRead:
    """标签查询测试"""

    @pytest.mark.asyncio
    async def test_list_tags(self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession):
        """测试查询所有标签"""
        # 创建多个标签
        for i in range(5):
            tag = TagFactory.create(name=f"标签{i}")
            db_session.add(tag)
        await db_session.commit()

        response = await client.get("/api/v1/tags", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert len(data["data"]) >= 5


class TestTagUpdate:
    """标签更新测试"""

    @pytest.mark.asyncio
    async def test_update_tag_success(self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession):
        """测试成功更新标签"""
        # 创建标签
        tag = TagFactory.create(name="旧名称")
        db_session.add(tag)
        await db_session.commit()

        response = await client.put(f"/api/v1/tags/{tag.id}", headers=auth_headers, json={
            "name": "新名称",
            "color": "#00FF00"
        })

        assert response.status_code == 200
        data = response.json()
        assert data["data"]["name"] == "新名称"
        assert data["data"]["color"] == "#00FF00"


class TestTagDelete:
    """标签删除测试"""

    @pytest.mark.asyncio
    async def test_delete_tag_success(self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession):
        """测试成功删除标签"""
        # 创建标签
        tag = TagFactory.create()
        db_session.add(tag)
        await db_session.commit()

        response = await client.delete(f"/api/v1/tags/{tag.id}", headers=auth_headers)

        assert response.status_code == 204

        # 验证已软删除
        await db_session.refresh(tag)
        assert tag.is_deleted is True

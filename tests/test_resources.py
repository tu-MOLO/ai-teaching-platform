"""
资源模块CRUD测试
"""
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.resource import Resource
from app.models.user import User
from tests.factories import ResourceFactory, TagFactory


class TestResourceCreate:
    """资源创建测试"""

    @pytest.mark.asyncio
    async def test_create_resource_success(self, client: AsyncClient, auth_headers: dict, test_user: User):
        """测试成功创建资源"""
        response = await client.post("/api/v1/resources", headers=auth_headers, json={
            "name": "数学课件",
            "file_path": "/uploads/math.pdf",
            "file_name": "math.pdf",
            "file_size": 1024000,
            "file_type": "application/pdf"
        })

        assert response.status_code == 201
        data = response.json()
        assert data["data"]["name"] == "数学课件"
        assert data["data"]["file_name"] == "math.pdf"

    @pytest.mark.asyncio
    async def test_create_resource_missing_fields(self, client: AsyncClient, auth_headers: dict):
        """测试缺少必填字段"""
        response = await client.post("/api/v1/resources", headers=auth_headers, json={
            "name": "数学课件"
            # 缺少 file_path, file_name, file_size, file_type
        })

        assert response.status_code == 422


class TestResourceRead:
    """资源查询测试"""

    @pytest.mark.asyncio
    async def test_list_resources(self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession, test_user: User):
        """测试查询资源列表"""
        # 创建多个资源
        for i in range(5):
            resource = ResourceFactory.create(user_id=test_user.id, name=f"资源{i}")
            db_session.add(resource)
        await db_session.commit()

        response = await client.get("/api/v1/resources", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "total" in data

    @pytest.mark.asyncio
    async def test_list_resources_filter_by_type(self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession, test_user: User):
        """测试按类型筛选资源"""
        # 创建不同类型的资源
        pdf_resource = ResourceFactory.create(user_id=test_user.id, file_type="application/pdf")
        image_resource = ResourceFactory.create(user_id=test_user.id, file_type="image/png")
        db_session.add_all([pdf_resource, image_resource])
        await db_session.commit()

        response = await client.get("/api/v1/resources?file_type=application/pdf", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        for resource in data["data"]:
            assert resource["file_type"] == "application/pdf"


class TestResourceUpdate:
    """资源更新测试"""

    @pytest.mark.asyncio
    async def test_update_resource_success(self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession, test_user: User):
        """测试成功更新资源"""
        # 创建资源
        resource = ResourceFactory.create(user_id=test_user.id)
        db_session.add(resource)
        await db_session.commit()

        response = await client.put(f"/api/v1/resources/{resource.id}", headers=auth_headers, json={
            "name": "更新后的资源名",
            "description": "更新后的描述"
        })

        assert response.status_code == 200
        data = response.json()
        assert data["data"]["name"] == "更新后的资源名"


class TestResourceDelete:
    """资源删除测试"""

    @pytest.mark.asyncio
    async def test_delete_resource_success(self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession, test_user: User):
        """测试成功删除资源"""
        # 创建资源
        resource = ResourceFactory.create(user_id=test_user.id)
        db_session.add(resource)
        await db_session.commit()

        response = await client.delete(f"/api/v1/resources/{resource.id}", headers=auth_headers)

        assert response.status_code == 204

        # 验证已软删除
        await db_session.refresh(resource)
        assert resource.is_deleted is True

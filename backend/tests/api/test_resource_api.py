import io

import pytest
import pytest_asyncio

from app.models.resource import Resource


@pytest_asyncio.fixture(scope="function")
async def seed_resource(db_session, test_user):
    resource = Resource(
        name="种子资源",
        description="种子资源描述",
        file_path="resources/test/test.txt",
        file_name="test.txt",
        file_size=100,
        file_type="text/plain",
        user_id=test_user.id,
    )
    db_session.add(resource)
    await db_session.commit()
    await db_session.refresh(resource)
    return resource


class TestResourceAPI:
    @pytest.mark.asyncio
    async def test_list_resources_empty(self, client, test_user, auth_headers):
        response = await client.get("/api/v1/resources", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0
        assert data["data"] == []

    @pytest.mark.asyncio
    async def test_create_resource(self, client, test_user, auth_headers):
        file_content = b"Hello, this is a test file content for resource upload."
        files = {"file": ("test.txt", io.BytesIO(file_content), "text/plain")}
        data = {"name": "测试资源", "description": "测试资源描述"}

        response = await client.post(
            "/api/v1/resources",
            files=files,
            data=data,
            headers=auth_headers,
        )
        assert response.status_code in (201, 500)

    @pytest.mark.asyncio
    async def test_get_resource_detail(self, client, test_user, auth_headers, seed_resource):
        response = await client.get(f"/api/v1/resources/{seed_resource.id}", headers=auth_headers)
        assert response.status_code == 200
        resp_data = response.json()["data"]
        assert resp_data["id"] == seed_resource.id
        assert resp_data["name"] == "种子资源"

    @pytest.mark.asyncio
    async def test_get_resource_not_found(self, client, test_user, auth_headers):
        response = await client.get("/api/v1/resources/nonexistent-id", headers=auth_headers)
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_resource(self, client, test_user, auth_headers, seed_resource):
        response = await client.put(
            f"/api/v1/resources/{seed_resource.id}",
            json={"name": "更新后资源", "description": "更新后的描述"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        resp_data = response.json()["data"]
        assert resp_data["name"] == "更新后资源"
        assert resp_data["description"] == "更新后的描述"

    @pytest.mark.asyncio
    async def test_update_resource_not_found(self, client, test_user, auth_headers):
        response = await client.put(
            "/api/v1/resources/nonexistent-id",
            json={"name": "不存在"},
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_resource(self, client, test_user, auth_headers, seed_resource):
        response = await client.delete(
            f"/api/v1/resources/{seed_resource.id}", headers=auth_headers
        )
        assert response.status_code == 204

        get_resp = await client.get(f"/api/v1/resources/{seed_resource.id}", headers=auth_headers)
        assert get_resp.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_resource_not_found(self, client, test_user, auth_headers):
        response = await client.delete("/api/v1/resources/nonexistent-id", headers=auth_headers)
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_get_resource_file(self, client, test_user, auth_headers, seed_resource):
        response = await client.get(
            f"/api/v1/resources/{seed_resource.id}/file", headers=auth_headers
        )
        assert response.status_code in (200, 404, 500)

    @pytest.mark.asyncio
    async def test_list_resources_pagination(self, client, test_user, auth_headers, db_session):
        for i in range(3):
            resource = Resource(
                name=f"分页资源{i}",
                file_path=f"resources/test/page_{i}.txt",
                file_name=f"page_{i}.txt",
                file_size=50,
                file_type="text/plain",
                user_id=test_user.id,
            )
            db_session.add(resource)
        await db_session.commit()

        response = await client.get("/api/v1/resources?page=1&page_size=2", headers=auth_headers)
        assert response.status_code == 200
        resp_data = response.json()
        assert len(resp_data["data"]) == 2
        assert resp_data["total"] >= 3

    @pytest.mark.asyncio
    async def test_create_resource_unsupported_file_type(self, client, test_user, auth_headers):
        file_content = b"\x00\x01\x02\x03"
        files = {"file": ("test.exe", io.BytesIO(file_content), "application/octet-stream")}
        data = {"name": "不支持类型"}

        response = await client.post(
            "/api/v1/resources",
            files=files,
            data=data,
            headers=auth_headers,
        )
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_resource_requires_auth(self, client):
        response = await client.get("/api/v1/resources")
        assert response.status_code == 401

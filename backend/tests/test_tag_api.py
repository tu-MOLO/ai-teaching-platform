import pytest


class TestTagAPI:
    @pytest.mark.asyncio
    async def test_list_tags_empty(self, client, test_user, auth_headers):
        response = await client.get("/api/v1/tags", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0
        assert data["data"] == []

    @pytest.mark.asyncio
    async def test_create_tag(self, client, test_user, auth_headers):
        response = await client.post(
            "/api/v1/tags",
            json={"name": "Python", "description": "Python编程", "color": "#3776ab"},
            headers=auth_headers,
        )
        assert response.status_code == 201
        data = response.json()["data"]
        assert data["name"] == "Python"
        assert data["description"] == "Python编程"
        assert data["color"] == "#3776ab"
        assert "id" in data

    @pytest.mark.asyncio
    async def test_create_tag_duplicate_name(self, client, test_user, auth_headers):
        await client.post(
            "/api/v1/tags",
            json={"name": "重复标签", "color": "#ff0000"},
            headers=auth_headers,
        )
        response = await client.post(
            "/api/v1/tags",
            json={"name": "重复标签", "color": "#00ff00"},
            headers=auth_headers,
        )
        assert response.status_code == 409

    @pytest.mark.asyncio
    async def test_list_tags_with_data(self, client, test_user, auth_headers):
        await client.post(
            "/api/v1/tags",
            json={"name": "标签A", "color": "#111111"},
            headers=auth_headers,
        )
        await client.post(
            "/api/v1/tags",
            json={"name": "标签B", "color": "#222222"},
            headers=auth_headers,
        )
        response = await client.get("/api/v1/tags", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 2

    @pytest.mark.asyncio
    async def test_list_tags_pagination(self, client, test_user, auth_headers):
        for i in range(5):
            await client.post(
                "/api/v1/tags",
                json={"name": f"分页标签{i}", "color": f"#00000{i}"},
                headers=auth_headers,
            )
        response = await client.get("/api/v1/tags?page=1&page_size=2", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data["data"]) == 2
        assert data["page"] == 1
        assert data["page_size"] == 2

    @pytest.mark.asyncio
    async def test_get_tag_detail(self, client, test_user, auth_headers):
        create_resp = await client.post(
            "/api/v1/tags",
            json={"name": "详情标签", "description": "用于测试详情", "color": "#333333"},
            headers=auth_headers,
        )
        tag_id = create_resp.json()["data"]["id"]

        response = await client.get(f"/api/v1/tags/{tag_id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["id"] == tag_id
        assert data["name"] == "详情标签"
        assert data["description"] == "用于测试详情"

    @pytest.mark.asyncio
    async def test_get_tag_not_found(self, client, test_user, auth_headers):
        response = await client.get("/api/v1/tags/nonexistent-id", headers=auth_headers)
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_tag(self, client, test_user, auth_headers):
        create_resp = await client.post(
            "/api/v1/tags",
            json={"name": "更新前标签", "color": "#444444"},
            headers=auth_headers,
        )
        tag_id = create_resp.json()["data"]["id"]

        response = await client.put(
            f"/api/v1/tags/{tag_id}",
            json={"name": "更新后标签", "color": "#555555"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["name"] == "更新后标签"
        assert data["color"] == "#555555"

    @pytest.mark.asyncio
    async def test_update_tag_duplicate_name(self, client, test_user, auth_headers):
        await client.post(
            "/api/v1/tags",
            json={"name": "已存在标签", "color": "#666666"},
            headers=auth_headers,
        )
        create_resp = await client.post(
            "/api/v1/tags",
            json={"name": "另一个标签", "color": "#777777"},
            headers=auth_headers,
        )
        tag_id = create_resp.json()["data"]["id"]

        response = await client.put(
            f"/api/v1/tags/{tag_id}",
            json={"name": "已存在标签"},
            headers=auth_headers,
        )
        assert response.status_code == 409

    @pytest.mark.asyncio
    async def test_update_tag_not_found(self, client, test_user, auth_headers):
        response = await client.put(
            "/api/v1/tags/nonexistent-id",
            json={"name": "不存在"},
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_tag(self, client, test_user, auth_headers):
        create_resp = await client.post(
            "/api/v1/tags",
            json={"name": "待删除标签", "color": "#888888"},
            headers=auth_headers,
        )
        tag_id = create_resp.json()["data"]["id"]

        response = await client.delete(f"/api/v1/tags/{tag_id}", headers=auth_headers)
        assert response.status_code == 204

        get_resp = await client.get(f"/api/v1/tags/{tag_id}", headers=auth_headers)
        assert get_resp.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_tag_not_found(self, client, test_user, auth_headers):
        response = await client.delete("/api/v1/tags/nonexistent-id", headers=auth_headers)
        assert response.status_code == 404


class TestTagCoverageGaps:
    @pytest.mark.asyncio
    async def test_list_tags_with_pagination(self, client, test_user, auth_headers):
        for i in range(5):
            await client.post(
                "/api/v1/tags",
                json={"name": f"Gap Tag {i}", "color": f"#aa000{i}"},
                headers=auth_headers,
            )

        response = await client.get("/api/v1/tags?page=1&page_size=10", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        assert data["page"] == 1
        assert data["page_size"] == 10
        assert "pages" in data
        assert isinstance(data["data"], list)

    @pytest.mark.asyncio
    async def test_get_tag_by_id(self, client, test_user, auth_headers):
        create_resp = await client.post(
            "/api/v1/tags",
            json={"name": "Gap Detail Tag", "description": "Gap test", "color": "#bb1111"},
            headers=auth_headers,
        )
        tag_id = create_resp.json()["data"]["id"]

        response = await client.get(f"/api/v1/tags/{tag_id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["id"] == tag_id
        assert data["name"] == "Gap Detail Tag"
        assert data["description"] == "Gap test"
        assert data["color"] == "#bb1111"

    @pytest.mark.asyncio
    async def test_create_tag_duplicate_name_409(self, client, test_user, auth_headers):
        await client.post(
            "/api/v1/tags",
            json={"name": "Gap Dup Tag", "color": "#cc2222"},
            headers=auth_headers,
        )

        response = await client.post(
            "/api/v1/tags",
            json={"name": "Gap Dup Tag", "color": "#dd3333"},
            headers=auth_headers,
        )
        assert response.status_code == 409

    @pytest.mark.asyncio
    async def test_update_tag_success(self, client, test_user, auth_headers):
        create_resp = await client.post(
            "/api/v1/tags",
            json={"name": "Gap Update Before", "color": "#ee4444"},
            headers=auth_headers,
        )
        tag_id = create_resp.json()["data"]["id"]

        response = await client.put(
            f"/api/v1/tags/{tag_id}",
            json={"name": "Gap Update After", "color": "#ff5555"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["id"] == tag_id
        assert data["name"] == "Gap Update After"
        assert data["color"] == "#ff5555"

    @pytest.mark.asyncio
    async def test_update_tag_duplicate_name_409(self, client, test_user, auth_headers):
        await client.post(
            "/api/v1/tags",
            json={"name": "Gap Existing Tag", "color": "#116666"},
            headers=auth_headers,
        )
        create_resp = await client.post(
            "/api/v1/tags",
            json={"name": "Gap Other Tag", "color": "#117777"},
            headers=auth_headers,
        )
        tag_id = create_resp.json()["data"]["id"]

        response = await client.put(
            f"/api/v1/tags/{tag_id}",
            json={"name": "Gap Existing Tag"},
            headers=auth_headers,
        )
        assert response.status_code == 409

    @pytest.mark.asyncio
    async def test_delete_tag_success(self, client, test_user, auth_headers):
        create_resp = await client.post(
            "/api/v1/tags",
            json={"name": "Gap Delete Tag", "color": "#118888"},
            headers=auth_headers,
        )
        tag_id = create_resp.json()["data"]["id"]

        response = await client.delete(f"/api/v1/tags/{tag_id}", headers=auth_headers)
        assert response.status_code == 204

        get_resp = await client.get(f"/api/v1/tags/{tag_id}", headers=auth_headers)
        assert get_resp.status_code == 404

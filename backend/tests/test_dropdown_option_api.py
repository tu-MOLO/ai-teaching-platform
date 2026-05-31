import pytest


class TestDropdownOptionAPI:
    @pytest.mark.asyncio
    async def test_list_dropdown_options_empty(self, client, test_user, auth_headers):
        response = await client.get("/api/v1/dropdown-options", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0
        assert data["data"] == []

    @pytest.mark.asyncio
    async def test_create_dropdown_option(self, client, test_user, auth_headers):
        response = await client.post(
            "/api/v1/dropdown-options",
            json={
                "group_key": "subject",
                "label": "数学",
                "value": "math",
                "description": "数学学科",
                "sort_order": 1,
                "is_active": True,
            },
            headers=auth_headers,
        )
        assert response.status_code == 201
        data = response.json()["data"]
        assert data["group_key"] == "subject"
        assert data["label"] == "数学"
        assert data["value"] == "math"
        assert data["is_active"] is True
        assert "id" in data

    @pytest.mark.asyncio
    async def test_create_dropdown_option_duplicate(self, client, test_user, auth_headers):
        await client.post(
            "/api/v1/dropdown-options",
            json={
                "group_key": "subject",
                "label": "英语",
                "value": "english",
            },
            headers=auth_headers,
        )
        response = await client.post(
            "/api/v1/dropdown-options",
            json={
                "group_key": "subject",
                "label": "英语2",
                "value": "english",
            },
            headers=auth_headers,
        )
        assert response.status_code == 409

    @pytest.mark.asyncio
    async def test_list_dropdown_options_with_data(self, client, test_user, auth_headers):
        await client.post(
            "/api/v1/dropdown-options",
            json={"group_key": "grade", "label": "一年级", "value": "grade1", "sort_order": 1},
            headers=auth_headers,
        )
        await client.post(
            "/api/v1/dropdown-options",
            json={"group_key": "grade", "label": "二年级", "value": "grade2", "sort_order": 2},
            headers=auth_headers,
        )
        response = await client.get("/api/v1/dropdown-options", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 2

    @pytest.mark.asyncio
    async def test_list_dropdown_options_filter_by_group(self, client, test_user, auth_headers):
        await client.post(
            "/api/v1/dropdown-options",
            json={"group_key": "grade", "label": "三年级", "value": "grade3"},
            headers=auth_headers,
        )
        await client.post(
            "/api/v1/dropdown-options",
            json={"group_key": "semester", "label": "上学期", "value": "first"},
            headers=auth_headers,
        )
        response = await client.get("/api/v1/dropdown-options?group_key=grade", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for item in data["data"]:
            assert item["group_key"] == "grade"

    @pytest.mark.asyncio
    async def test_list_dropdown_options_active_only(self, client, test_user, auth_headers):
        create_resp = await client.post(
            "/api/v1/dropdown-options",
            json={"group_key": "status_test", "label": "活跃选项", "value": "active_opt", "is_active": True},
            headers=auth_headers,
        )
        await client.post(
            "/api/v1/dropdown-options",
            json={"group_key": "status_test", "label": "停用选项", "value": "inactive_opt", "is_active": False},
            headers=auth_headers,
        )
        response = await client.get("/api/v1/dropdown-options?group_key=status_test&active_only=true", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for item in data["data"]:
            assert item["is_active"] is True

    @pytest.mark.asyncio
    async def test_update_dropdown_option(self, client, test_user, auth_headers):
        create_resp = await client.post(
            "/api/v1/dropdown-options",
            json={"group_key": "subject", "label": "物理", "value": "physics"},
            headers=auth_headers,
        )
        option_id = create_resp.json()["data"]["id"]

        response = await client.put(
            f"/api/v1/dropdown-options/{option_id}",
            json={"label": "高级物理", "sort_order": 10},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["label"] == "高级物理"
        assert data["sort_order"] == 10

    @pytest.mark.asyncio
    async def test_update_dropdown_option_not_found(self, client, test_user, auth_headers):
        response = await client.put(
            "/api/v1/dropdown-options/nonexistent-id",
            json={"label": "不存在"},
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_dropdown_option(self, client, test_user, auth_headers):
        create_resp = await client.post(
            "/api/v1/dropdown-options",
            json={"group_key": "subject", "label": "化学", "value": "chemistry"},
            headers=auth_headers,
        )
        option_id = create_resp.json()["data"]["id"]

        response = await client.delete(f"/api/v1/dropdown-options/{option_id}", headers=auth_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_delete_dropdown_option_not_found(self, client, test_user, auth_headers):
        response = await client.delete("/api/v1/dropdown-options/nonexistent-id", headers=auth_headers)
        assert response.status_code == 404

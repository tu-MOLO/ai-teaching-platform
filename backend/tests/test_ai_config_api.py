import pytest


class TestAIConfigAPI:
    @pytest.mark.asyncio
    async def test_get_ai_config_default(self, client, test_user, auth_headers):
        response = await client.get("/api/v1/ai/config", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "provider" in data
        assert "model" in data
        assert "api_base" in data
        assert "is_active" in data

    @pytest.mark.asyncio
    async def test_update_ai_config(self, client, test_user, auth_headers):
        response = await client.put(
            "/api/v1/ai/config",
            json={
                "provider": "zhipu",
                "model": "glm-4",
                "api_base": "https://open.bigmodel.cn/api/paas/v4",
                "api_key": "test-api-key-for-testing",
            },
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["provider"] == "zhipu"
        assert data["model"] == "glm-4"

    @pytest.mark.asyncio
    async def test_update_ai_config_partial(self, client, test_user, auth_headers):
        response = await client.put(
            "/api/v1/ai/config",
            json={"model": "glm-4-flash"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["model"] == "glm-4-flash"

    @pytest.mark.asyncio
    async def test_test_ai_config_without_key(self, client, test_user, auth_headers):
        response = await client.post(
            "/api/v1/ai/config/test",
            json={
                "provider": "zhipu",
                "api_base": "https://open.bigmodel.cn/api/paas/v4",
                "model": "glm-4",
                "api_key": "invalid-key",
            },
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert "success" in data
        assert "message" in data

    @pytest.mark.asyncio
    async def test_reset_ai_config(self, client, test_user, auth_headers):
        await client.put(
            "/api/v1/ai/config",
            json={"provider": "zhipu", "model": "glm-4", "api_key": "test-key"},
            headers=auth_headers,
        )
        response = await client.delete("/api/v1/ai/config", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "provider" in data

    @pytest.mark.asyncio
    async def test_ai_config_requires_auth(self, client):
        response = await client.get("/api/v1/ai/config")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_ai_config_update_requires_auth(self, client):
        response = await client.put("/api/v1/ai/config", json={"model": "glm-4"})
        assert response.status_code == 401

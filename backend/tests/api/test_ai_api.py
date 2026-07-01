import pytest


class TestAIAPI:
    @pytest.mark.asyncio
    async def test_list_conversations_empty(self, client, test_user, auth_headers):
        response = await client.get("/api/v1/ai/conversations", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0
        assert data["data"] == []

    @pytest.mark.asyncio
    async def test_chat_without_api_key(self, client, test_user, auth_headers):
        response = await client.post(
            "/api/v1/ai/chat",
            json={"message": "你好", "stream": False},
            headers=auth_headers,
        )
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_delete_nonexistent_conversation(self, client, test_user, auth_headers):
        response = await client.delete(
            "/api/v1/ai/conversations/nonexistent-id", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_chat_requires_auth(self, client):
        response = await client.post(
            "/api/v1/ai/chat",
            json={"message": "你好", "stream": False},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_conversations_requires_auth(self, client):
        response = await client.get("/api/v1/ai/conversations")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_chat_empty_message(self, client, test_user, auth_headers):
        response = await client.post(
            "/api/v1/ai/chat",
            json={"message": "", "stream": False},
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_chat_message_too_long(self, client, test_user, auth_headers):
        response = await client.post(
            "/api/v1/ai/chat",
            json={"message": "x" * 2001, "stream": False},
            headers=auth_headers,
        )
        assert response.status_code == 422

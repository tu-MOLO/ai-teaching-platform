import pytest


class TestHealthCheck:
    @pytest.mark.asyncio
    async def test_health_check(self, client):
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] in ("healthy", "unhealthy")
        assert data["app"] == "AI Teaching Platform"


class TestAuthRegistration:
    @pytest.mark.asyncio
    async def test_register_success(self, client):
        response = await client.post("/api/v1/auth/register", json={
            "username": "newuser",
            "email": "new@example.com",
            "password": "SecurePass123!",
            "full_name": "New User",
            "security_question": "What is your pet name?",
            "security_answer": "Fluffy",
        })
        assert response.status_code == 201

    @pytest.mark.asyncio
    async def test_register_duplicate_username(self, client, test_user):
        response = await client.post("/api/v1/auth/register", json={
            "username": "testuser",
            "email": "another@example.com",
            "password": "SecurePass123!",
            "full_name": "Another User",
            "security_question": "What is your pet name?",
            "security_answer": "Fluffy",
        })
        assert response.status_code == 409

    @pytest.mark.asyncio
    async def test_register_weak_password(self, client):
        response = await client.post("/api/v1/auth/register", json={
            "username": "weakuser",
            "email": "weak@example.com",
            "password": "123",
            "full_name": "Weak User",
            "security_question": "What is your pet name?",
            "security_answer": "Fluffy",
        })
        assert response.status_code == 422


class TestAuthLogin:
    @pytest.mark.asyncio
    async def test_login_success(self, client, test_user):
        response = await client.post("/api/v1/auth/login", json={
            "username": "testuser",
            "password": "TestPass123!",
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "access_token" in data["token"]
        assert "refresh_token" in data["token"]
        assert "user" in data

    @pytest.mark.asyncio
    async def test_login_wrong_password(self, client, test_user):
        response = await client.post("/api/v1/auth/login", json={
            "username": "testuser",
            "password": "WrongPassword",
        })
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_login_nonexistent_user(self, client):
        response = await client.post("/api/v1/auth/login", json={
            "username": "nonexistent",
            "password": "SomePassword123!",
        })
        assert response.status_code == 401


class TestAuthMe:
    @pytest.mark.asyncio
    async def test_get_current_user(self, client, test_user):
        login_resp = await client.post("/api/v1/auth/login", json={
            "username": "testuser",
            "password": "TestPass123!",
        })
        token = login_resp.json()["token"]["access_token"]

        response = await client.get("/api/v1/auth/me", headers={
            "Authorization": f"Bearer {token}",
        })
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "testuser"
        assert data["email"] == "test@example.com"

    @pytest.mark.asyncio
    async def test_get_current_user_without_token(self, client):
        response = await client.get("/api/v1/auth/me")
        assert response.status_code == 401


class TestTokenRefresh:
    @pytest.mark.asyncio
    async def test_refresh_token_success(self, client, test_user):
        login_resp = await client.post("/api/v1/auth/login", json={
            "username": "testuser",
            "password": "TestPass123!",
        })
        refresh_token = login_resp.json()["token"]["refresh_token"]

        response = await client.post("/api/v1/auth/refresh", json={
            "refresh_token": refresh_token,
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data

    @pytest.mark.asyncio
    async def test_refresh_with_access_token(self, client, test_user):
        login_resp = await client.post("/api/v1/auth/login", json={
            "username": "testuser",
            "password": "TestPass123!",
        })
        access_token = login_resp.json()["token"]["access_token"]

        response = await client.post("/api/v1/auth/refresh", json={
            "refresh_token": access_token,
        })
        assert response.status_code == 401


class TestPasswordReset:
    @pytest.mark.asyncio
    async def test_get_security_question(self, client, test_user):
        response = await client.post("/api/v1/auth/password/reset/question", json={
            "username": "testuser",
        })
        assert response.status_code == 200
        data = response.json()
        assert "security_question" in data

    @pytest.mark.asyncio
    async def test_get_question_nonexistent_user(self, client):
        response = await client.post("/api/v1/auth/password/reset/question", json={
            "username": "nonexistent",
        })
        assert response.status_code == 404
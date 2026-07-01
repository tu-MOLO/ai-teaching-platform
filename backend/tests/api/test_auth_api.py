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
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "username": "newuser",
                "email": "new@example.com",
                "password": "SecurePass123!",
                "full_name": "New User",
                "security_question": "What is your pet name?",
                "security_answer": "Fluffy",
            },
        )
        assert response.status_code == 201

    @pytest.mark.asyncio
    async def test_register_duplicate_username(self, client, test_user):
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "username": "testuser",
                "email": "another@example.com",
                "password": "SecurePass123!",
                "full_name": "Another User",
                "security_question": "What is your pet name?",
                "security_answer": "Fluffy",
            },
        )
        assert response.status_code == 409

    @pytest.mark.asyncio
    async def test_register_weak_password(self, client):
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "username": "weakuser",
                "email": "weak@example.com",
                "password": "123",
                "full_name": "Weak User",
                "security_question": "What is your pet name?",
                "security_answer": "Fluffy",
            },
        )
        assert response.status_code == 422


class TestAuthLogin:
    @pytest.mark.asyncio
    async def test_login_success(self, client, test_user):
        response = await client.post(
            "/api/v1/auth/login",
            json={
                "username": "testuser",
                "password": "TestPass123!",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "access_token" in data["token"]
        assert "refresh_token" in data["token"]
        assert "user" in data

    @pytest.mark.asyncio
    async def test_login_wrong_password(self, client, test_user):
        response = await client.post(
            "/api/v1/auth/login",
            json={
                "username": "testuser",
                "password": "WrongPassword",
            },
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_login_nonexistent_user(self, client):
        response = await client.post(
            "/api/v1/auth/login",
            json={
                "username": "nonexistent",
                "password": "SomePassword123!",
            },
        )
        assert response.status_code == 401


class TestAuthMe:
    @pytest.mark.asyncio
    async def test_get_current_user(self, client, test_user):
        login_resp = await client.post(
            "/api/v1/auth/login",
            json={
                "username": "testuser",
                "password": "TestPass123!",
            },
        )
        token = login_resp.json()["token"]["access_token"]

        response = await client.get(
            "/api/v1/auth/me",
            headers={
                "Authorization": f"Bearer {token}",
            },
        )
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
        await client.post(
            "/api/v1/auth/login",
            json={
                "username": "testuser",
                "password": "TestPass123!",
            },
        )
        response = await client.post("/api/v1/auth/refresh")
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data

    @pytest.mark.asyncio
    async def test_refresh_with_access_token(self, client, test_user):
        login_resp = await client.post(
            "/api/v1/auth/login",
            json={
                "username": "testuser",
                "password": "TestPass123!",
            },
        )
        access_token = login_resp.json()["token"]["access_token"]

        client.cookies.clear()
        client.cookies.set("refresh_token", access_token, domain="test")

        response = await client.post("/api/v1/auth/refresh")
        assert response.status_code == 401


class TestPasswordReset:
    @pytest.mark.asyncio
    async def test_get_security_question(self, client, test_user):
        response = await client.post(
            "/api/v1/auth/password/reset/question",
            json={
                "username": "testuser",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "security_question" in data

    @pytest.mark.asyncio
    async def test_get_question_nonexistent_user(self, client):
        response = await client.post(
            "/api/v1/auth/password/reset/question",
            json={
                "username": "nonexistent",
            },
        )
        assert response.status_code == 200


class TestAuthLogout:
    @pytest.mark.asyncio
    async def test_logout_success(self, client, test_user):
        login_resp = await client.post(
            "/api/v1/auth/login",
            json={
                "username": "testuser",
                "password": "TestPass123!",
            },
        )
        token = login_resp.json()["token"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        response = await client.post("/api/v1/auth/logout", headers=headers)
        assert response.status_code == 200

        me_resp = await client.get("/api/v1/auth/me", headers=headers)
        assert me_resp.status_code == 401


class TestAuthChangePassword:
    @pytest.mark.asyncio
    async def test_change_password_success(self, client, test_user):
        login_resp = await client.post(
            "/api/v1/auth/login",
            json={
                "username": "testuser",
                "password": "TestPass123!",
            },
        )
        token = login_resp.json()["token"]["access_token"]

        response = await client.post(
            "/api/v1/auth/password/change",
            json={
                "current_password": "TestPass123!",
                "new_password": "NewPass456!",
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200

        login_resp2 = await client.post(
            "/api/v1/auth/login",
            json={
                "username": "testuser",
                "password": "NewPass456!",
            },
        )
        assert login_resp2.status_code == 200

    @pytest.mark.asyncio
    async def test_change_password_wrong_current(self, client, test_user):
        login_resp = await client.post(
            "/api/v1/auth/login",
            json={
                "username": "testuser",
                "password": "TestPass123!",
            },
        )
        token = login_resp.json()["token"]["access_token"]

        response = await client.post(
            "/api/v1/auth/password/change",
            json={
                "current_password": "WrongCurrent123!",
                "new_password": "NewPass456!",
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 400


class TestAuthRegistrationEdgeCases:
    @pytest.mark.asyncio
    async def test_register_duplicate_email(self, client, test_user):
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "username": "differentuser",
                "email": "test@example.com",
                "password": "SecurePass123!",
                "full_name": "Duplicate Email User",
                "security_question": "What is your pet name?",
                "security_answer": "Fluffy",
            },
        )
        assert response.status_code == 409


class TestAuthLoginEdgeCases:
    @pytest.mark.asyncio
    async def test_login_inactive_user(self, client, inactive_user):
        response = await client.post(
            "/api/v1/auth/login",
            json={
                "username": "inactiveuser",
                "password": "InactivePass123!",
            },
        )
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_login_locked_user(self, client, locked_user):
        response = await client.post(
            "/api/v1/auth/login",
            json={
                "username": "lockeduser",
                "password": "LockedPass123!",
            },
        )
        assert response.status_code == 403


class TestAuthTokenVersion:
    @pytest.mark.asyncio
    async def test_token_invalid_after_password_change(self, client, test_user):
        login_resp = await client.post(
            "/api/v1/auth/login",
            json={
                "username": "testuser",
                "password": "TestPass123!",
            },
        )
        token = login_resp.json()["token"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        me_resp = await client.get("/api/v1/auth/me", headers=headers)
        assert me_resp.status_code == 200

        await client.post(
            "/api/v1/auth/password/change",
            json={
                "current_password": "TestPass123!",
                "new_password": "ChangedPass789!",
            },
            headers=headers,
        )

        me_resp2 = await client.get("/api/v1/auth/me", headers=headers)
        assert me_resp2.status_code == 401


class TestLoginFullFlow:
    @pytest.mark.asyncio
    async def test_login_success_with_cookie_and_user_info(self, client, test_user):
        response = await client.post(
            "/api/v1/auth/login",
            json={
                "username": "testuser",
                "password": "TestPass123!",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        token_data = data["token"]
        assert "access_token" in token_data
        assert "refresh_token" in token_data
        assert token_data["token_type"] == "bearer"
        assert "expires_in" in token_data
        assert "refresh_expires_in" in token_data
        assert "user" in data
        assert data["user"]["username"] == "testuser"
        assert data["user"]["email"] == "test@example.com"
        assert data["user"]["is_active"] is True
        assert "set-cookie" in response.headers
        cookie_header = response.headers["set-cookie"]
        assert "refresh_token" in cookie_header

    @pytest.mark.asyncio
    async def test_login_with_remember_me_true(self, client, test_user):
        response = await client.post(
            "/api/v1/auth/login",
            json={
                "username": "testuser",
                "password": "TestPass123!",
                "remember_me": True,
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["token"]["refresh_expires_in"] == 7 * 24 * 3600


class TestRegisterFullFlow:
    @pytest.mark.asyncio
    async def test_register_success_returns_message(self, client):
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "username": "regflowuser",
                "email": "regflow@example.com",
                "password": "SecurePass123!",
                "full_name": "Reg Flow User",
                "security_question": "What is your pet name?",
                "security_answer": "Fluffy",
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["code"] == "success"
        assert "注册成功" in data["message"]


class TestRefreshTokenFullFlow:
    @pytest.mark.asyncio
    async def test_refresh_via_cookie(self, client, test_user):
        await client.post(
            "/api/v1/auth/login",
            json={
                "username": "testuser",
                "password": "TestPass123!",
            },
        )
        response = await client.post("/api/v1/auth/refresh")
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        assert "expires_in" in data
        assert "refresh_expires_in" in data

    @pytest.mark.asyncio
    async def test_refresh_no_cookie_returns_401(self, client):
        client.cookies.clear()
        response = await client.post("/api/v1/auth/refresh")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_refresh_expired_token_returns_401(self, client, test_user):
        from datetime import timedelta

        from app.core.security import create_refresh_token

        expired_token = create_refresh_token(
            subject=test_user.id,
            expires_delta=timedelta(days=-1),
            token_version=str(test_user.token_version),
        )
        client.cookies.clear()
        client.cookies.set("refresh_token", expired_token, domain="test")
        response = await client.post("/api/v1/auth/refresh")
        assert response.status_code == 401


class TestGetCurrentUserFullFlow:
    @pytest.mark.asyncio
    async def test_me_returns_user_with_permissions(self, client, test_user):
        login_resp = await client.post(
            "/api/v1/auth/login",
            json={
                "username": "testuser",
                "password": "TestPass123!",
            },
        )
        token = login_resp.json()["token"]["access_token"]
        response = await client.get(
            "/api/v1/auth/me",
            headers={
                "Authorization": f"Bearer {token}",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "testuser"
        assert data["email"] == "test@example.com"
        assert "id" in data
        assert "role" in data
        assert data["role"] == "teacher"
        assert "status" in data
        assert "is_active" in data


class TestLogoutFullFlow:
    @pytest.mark.asyncio
    async def test_logout_clears_cookie_and_invalidates_token(self, client, test_user):
        login_resp = await client.post(
            "/api/v1/auth/login",
            json={
                "username": "testuser",
                "password": "TestPass123!",
            },
        )
        token = login_resp.json()["token"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        response = await client.post("/api/v1/auth/logout", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["code"] == "success"

        me_resp = await client.get("/api/v1/auth/me", headers=headers)
        assert me_resp.status_code == 401


class TestPasswordResetFullFlow:
    @pytest.mark.asyncio
    async def test_security_question_returned(self, client, test_user):
        response = await client.post(
            "/api/v1/auth/password/reset/question",
            json={
                "username": "testuser",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "testuser"
        assert "security_question" in data
        assert data["is_legacy"] is False

    @pytest.mark.asyncio
    async def test_password_reset_success(self, client, test_user):
        response = await client.post(
            "/api/v1/auth/password/reset",
            json={
                "username": "testuser",
                "new_password": "ResetPass999!",
                "security_answer": "Fluffy",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["code"] == "success"

        login_resp = await client.post(
            "/api/v1/auth/login",
            json={
                "username": "testuser",
                "password": "ResetPass999!",
            },
        )
        assert login_resp.status_code == 200

    @pytest.mark.asyncio
    async def test_password_reset_wrong_answer(self, client, test_user):
        response = await client.post(
            "/api/v1/auth/password/reset",
            json={
                "username": "testuser",
                "new_password": "ResetPass999!",
                "security_answer": "WrongAnswer",
            },
        )
        assert response.status_code == 400


class TestChangePasswordFullFlow:
    @pytest.mark.asyncio
    async def test_change_password_success_flow(self, client, test_user):
        login_resp = await client.post(
            "/api/v1/auth/login",
            json={
                "username": "testuser",
                "password": "TestPass123!",
            },
        )
        token = login_resp.json()["token"]["access_token"]

        response = await client.post(
            "/api/v1/auth/password/change",
            json={
                "current_password": "TestPass123!",
                "new_password": "NewPass456!",
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200

        login_resp2 = await client.post(
            "/api/v1/auth/login",
            json={
                "username": "testuser",
                "password": "NewPass456!",
            },
        )
        assert login_resp2.status_code == 200

    @pytest.mark.asyncio
    async def test_change_password_wrong_current_flow(self, client, test_user):
        login_resp = await client.post(
            "/api/v1/auth/login",
            json={
                "username": "testuser",
                "password": "TestPass123!",
            },
        )
        token = login_resp.json()["token"]["access_token"]

        response = await client.post(
            "/api/v1/auth/password/change",
            json={
                "current_password": "WrongCurrent123!",
                "new_password": "NewPass456!",
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 400

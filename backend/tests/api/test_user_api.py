import pytest
import pytest_asyncio
import bcrypt

from app.models.user import User, UserRole


@pytest_asyncio.fixture(scope="function")
async def other_user(db_session):
    user = User(
        email="other_user@example.com",
        username="otheruser2",
        full_name="Other User 2",
        hashed_password=bcrypt.hashpw(
            "OtherPass123!".encode("utf-8"), bcrypt.gensalt()
        ).decode("utf-8"),
        role=UserRole.TEACHER,
        is_active=True,
        token_version=1,
        security_question="What is your pet name?",
        hashed_security_answer=bcrypt.hashpw(
            "Buddy".encode("utf-8"), bcrypt.gensalt()
        ).decode("utf-8"),
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture(scope="function")
async def other_auth_headers(client, other_user):
    login_resp = await client.post("/api/v1/auth/login", json={
        "username": "otheruser2",
        "password": "OtherPass123!",
    })
    token = login_resp.json()["token"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


class TestUserAPI:
    @pytest.mark.asyncio
    async def test_get_own_user(self, client, test_user, auth_headers):
        response = await client.get(f"/api/v1/users/{test_user.id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_user.id
        assert data["username"] == "testuser"
        assert data["email"] == "test@example.com"
        assert data["full_name"] == "Test User"
        assert data["role"] == "teacher"

    @pytest.mark.asyncio
    async def test_get_other_user_forbidden(self, client, test_user, other_user, auth_headers):
        response = await client.get(f"/api/v1/users/{other_user.id}", headers=auth_headers)
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_get_user_not_found(self, client, test_user, auth_headers):
        response = await client.get("/api/v1/users/nonexistent-id", headers=auth_headers)
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_update_own_user(self, client, test_user, auth_headers):
        response = await client.put(
            f"/api/v1/users/{test_user.id}",
            json={"full_name": "Updated Name", "bio": "Updated bio"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["full_name"] == "Updated Name"
        assert data["bio"] == "Updated bio"

    @pytest.mark.asyncio
    async def test_update_other_user_forbidden(self, client, test_user, other_user, auth_headers):
        response = await client.put(
            f"/api/v1/users/{other_user.id}",
            json={"full_name": "Hacked Name"},
            headers=auth_headers,
        )
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_update_user_duplicate_username(
    self, client, test_user, other_user, auth_headers):
        response = await client.put(
            f"/api/v1/users/{test_user.id}",
            json={"username": "otheruser2"},
            headers=auth_headers,
        )
        assert response.status_code == 409

    @pytest.mark.asyncio
    async def test_update_user_duplicate_email(self, client, test_user, other_user, auth_headers):
        response = await client.put(
            f"/api/v1/users/{test_user.id}",
            json={"email": "other_user@example.com"},
            headers=auth_headers,
        )
        assert response.status_code == 409

    @pytest.mark.asyncio
    async def test_update_user_with_same_username(self, client, test_user, auth_headers):
        response = await client.put(
            f"/api/v1/users/{test_user.id}",
            json={"username": "testuser", "full_name": "Same Username"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["full_name"] == "Same Username"

    @pytest.mark.asyncio
    async def test_update_user_with_same_email(self, client, test_user, auth_headers):
        response = await client.put(
            f"/api/v1/users/{test_user.id}",
            json={"email": "test@example.com", "bio": "Same email test"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["bio"] == "Same email test"

    @pytest.mark.asyncio
    async def test_update_user_not_found(self, client, test_user, auth_headers):
        response = await client.put(
            "/api/v1/users/nonexistent-id",
            json={"full_name": "Ghost"},
            headers=auth_headers,
        )
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_get_user_unauthenticated(self, client, test_user):
        response = await client.get(f"/api/v1/users/{test_user.id}")
        assert response.status_code == 401

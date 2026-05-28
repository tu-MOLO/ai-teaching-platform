import pytest
import pytest_asyncio
import bcrypt

from app.models.user import User


@pytest_asyncio.fixture(scope="function")
async def second_user(db_session):
    user = User(
        email="other@example.com",
        username="otheruser",
        full_name="Other User",
        hashed_password=bcrypt.hashpw(
            "OtherPass123!".encode("utf-8"), bcrypt.gensalt()
        ).decode("utf-8"),
        role="teacher",
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


class TestCourseAPI:
    @pytest.mark.asyncio
    async def test_create_course(self, client, test_user):
        login_resp = await client.post("/api/v1/auth/login", json={
            "username": "testuser",
            "password": "TestPass123!",
        })
        token = login_resp.json()["token"]["access_token"]

        response = await client.post("/api/v1/courses", json={
            "name": "Python Programming",
            "subject": "Computer Science",
            "grade": "Grade 10",
            "teacher": "Test User",
            "schedule": "Mon/Wed 09:00-10:30",
            "description": "Introduction to Python",
        }, headers={"Authorization": f"Bearer {token}"})

        assert response.status_code == 201
        data = response.json()["data"]
        assert data["name"] == "Python Programming"
        assert data["subject"] == "Computer Science"
        assert data["grade"] == "Grade 10"
        assert data["status"] == "draft"
        assert "id" in data
        assert "created_at" in data
        assert "updated_at" in data

    @pytest.mark.asyncio
    async def test_get_courses(self, client, test_user):
        login_resp = await client.post("/api/v1/auth/login", json={
            "username": "testuser",
            "password": "TestPass123!",
        })
        token = login_resp.json()["token"]["access_token"]

        await client.post("/api/v1/courses", json={
            "name": "Course A",
            "subject": "Math",
            "grade": "Grade 9",
            "teacher": "Test User",
        }, headers={"Authorization": f"Bearer {token}"})

        await client.post("/api/v1/courses", json={
            "name": "Course B",
            "subject": "English",
            "grade": "Grade 10",
            "teacher": "Test User",
        }, headers={"Authorization": f"Bearer {token}"})

        response = await client.get("/api/v1/courses", headers={
            "Authorization": f"Bearer {token}",
        })

        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 2
        assert data["page"] == 1
        assert "page_size" in data
        assert "pages" in data
        assert len(data["data"]) >= 2

    @pytest.mark.asyncio
    async def test_get_course(self, client, test_user):
        login_resp = await client.post("/api/v1/auth/login", json={
            "username": "testuser",
            "password": "TestPass123!",
        })
        token = login_resp.json()["token"]["access_token"]

        create_resp = await client.post("/api/v1/courses", json={
            "name": "Physics 101",
            "subject": "Physics",
            "grade": "Grade 11",
            "teacher": "Test User",
        }, headers={"Authorization": f"Bearer {token}"})
        course_id = create_resp.json()["data"]["id"]

        response = await client.get(f"/api/v1/courses/{course_id}", headers={
            "Authorization": f"Bearer {token}",
        })

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["id"] == course_id
        assert data["name"] == "Physics 101"
        assert data["subject"] == "Physics"
        assert data["grade"] == "Grade 11"

    @pytest.mark.asyncio
    async def test_update_course(self, client, test_user):
        login_resp = await client.post("/api/v1/auth/login", json={
            "username": "testuser",
            "password": "TestPass123!",
        })
        token = login_resp.json()["token"]["access_token"]

        create_resp = await client.post("/api/v1/courses", json={
            "name": "Biology",
            "subject": "Science",
            "grade": "Grade 8",
            "teacher": "Test User",
        }, headers={"Authorization": f"Bearer {token}"})
        course_id = create_resp.json()["data"]["id"]

        response = await client.put(f"/api/v1/courses/{course_id}", json={
            "name": "Advanced Biology",
            "status": "active",
        }, headers={"Authorization": f"Bearer {token}"})

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["id"] == course_id
        assert data["name"] == "Advanced Biology"
        assert data["status"] == "active"

    @pytest.mark.asyncio
    async def test_delete_course(self, client, test_user):
        login_resp = await client.post("/api/v1/auth/login", json={
            "username": "testuser",
            "password": "TestPass123!",
        })
        token = login_resp.json()["token"]["access_token"]

        create_resp = await client.post("/api/v1/courses", json={
            "name": "To Be Deleted",
            "subject": "Art",
            "grade": "Grade 7",
            "teacher": "Test User",
        }, headers={"Authorization": f"Bearer {token}"})
        course_id = create_resp.json()["data"]["id"]

        response = await client.delete(f"/api/v1/courses/{course_id}", headers={
            "Authorization": f"Bearer {token}",
        })

        assert response.status_code == 204

        get_resp = await client.get(f"/api/v1/courses/{course_id}", headers={
            "Authorization": f"Bearer {token}",
        })
        assert get_resp.status_code == 404

    @pytest.mark.asyncio
    async def test_cannot_access_other_user_course(self, client, test_user, second_user):
        login_resp = await client.post("/api/v1/auth/login", json={
            "username": "testuser",
            "password": "TestPass123!",
        })
        token_a = login_resp.json()["token"]["access_token"]

        create_resp = await client.post("/api/v1/courses", json={
            "name": "User A Course",
            "subject": "History",
            "grade": "Grade 10",
            "teacher": "Test User",
        }, headers={"Authorization": f"Bearer {token_a}"})
        course_id = create_resp.json()["data"]["id"]

        login_resp_b = await client.post("/api/v1/auth/login", json={
            "username": "otheruser",
            "password": "OtherPass123!",
        })
        token_b = login_resp_b.json()["token"]["access_token"]

        response = await client.get(f"/api/v1/courses/{course_id}", headers={
            "Authorization": f"Bearer {token_b}",
        })
        assert response.status_code == 404
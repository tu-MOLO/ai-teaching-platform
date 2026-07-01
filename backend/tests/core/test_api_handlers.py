import bcrypt
import pytest
import pytest_asyncio

from app.models.dropdown_option import DropdownOption
from app.models.lesson_template import LessonTemplate
from app.models.notification import Notification, NotificationType
from app.models.tag import Tag
from app.models.user import User, UserRole, UserStatus
from app.services.tags import TagService


@pytest.fixture(autouse=True)
def _reset_rate_limiter():
    from app.core.rate_limiter import rate_limiter

    rate_limiter._requests.clear()


@pytest_asyncio.fixture(autouse=True)
async def _setup_storage():
    import app.services.storage as storage_module
    from app.services.storage import LocalFileStorage

    storage_module._storage_instance = LocalFileStorage()
    yield
    storage_module._storage_instance = None


class TestAuthEndpoints:

    async def test_login_success(self, client, test_user):
        resp = await client.post(
            "/api/v1/auth/login",
            json={
                "username": "testuser",
                "password": "TestPass123!",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "token" in data
        assert "access_token" in data["token"]

    async def test_login_wrong_password(self, client, test_user):
        resp = await client.post(
            "/api/v1/auth/login",
            json={
                "username": "testuser",
                "password": "WrongPass123!",
            },
        )
        assert resp.status_code == 401

    async def test_login_inactive_user(self, client, db_session):
        user = User(
            email="inactive@example.com",
            username="inactiveuser",
            full_name="Inactive User",
            hashed_password=bcrypt.hashpw("InactivePass123!".encode(), bcrypt.gensalt()).decode(),
            role=UserRole.TEACHER,
            is_active=False,
            status=UserStatus.INACTIVE,
            token_version=1,
            security_question="Q",
            hashed_security_answer=bcrypt.hashpw("A".encode(), bcrypt.gensalt()).decode(),
        )
        db_session.add(user)
        await db_session.commit()
        resp = await client.post(
            "/api/v1/auth/login",
            json={
                "username": "inactiveuser",
                "password": "InactivePass123!",
            },
        )
        assert resp.status_code == 403

    async def test_login_locked_user(self, client, db_session):
        from datetime import datetime, timedelta, timezone

        user = User(
            email="locked@example.com",
            username="lockeduser",
            full_name="Locked User",
            hashed_password=bcrypt.hashpw("LockedPass123!".encode(), bcrypt.gensalt()).decode(),
            role=UserRole.TEACHER,
            is_active=True,
            failed_login_attempts=5,
            locked_until=datetime.now(timezone.utc) + timedelta(minutes=30),
            token_version=1,
            security_question="Q",
            hashed_security_answer=bcrypt.hashpw("A".encode(), bcrypt.gensalt()).decode(),
        )
        db_session.add(user)
        await db_session.commit()
        resp = await client.post(
            "/api/v1/auth/login",
            json={
                "username": "lockeduser",
                "password": "LockedPass123!",
            },
        )
        assert resp.status_code == 403

    async def test_login_nonexistent_user(self, client):
        resp = await client.post(
            "/api/v1/auth/login",
            json={
                "username": "nonexistent",
                "password": "SomePass123!",
            },
        )
        assert resp.status_code == 401

    async def test_login_with_email(self, client, test_user):
        resp = await client.post(
            "/api/v1/auth/login",
            json={
                "username": "test@example.com",
                "password": "TestPass123!",
            },
        )
        assert resp.status_code == 200

    async def test_login_remember_me(self, client, test_user):
        resp = await client.post(
            "/api/v1/auth/login",
            json={
                "username": "testuser",
                "password": "TestPass123!",
                "remember_me": True,
            },
        )
        assert resp.status_code == 200

    async def test_register_success(self, client, db_session):
        resp = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "newuser@example.com",
                "username": "newuser",
                "password": "NewPass123!",
                "full_name": "New User",
                "security_question": "您的母校名称是什么？",
                "security_answer": "TestSchool",
            },
        )
        assert resp.status_code == 201
        assert resp.json()["code"] == "success"

    async def test_register_duplicate_username(self, client, test_user):
        resp = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "another@example.com",
                "username": "testuser",
                "password": "NewPass123!",
                "full_name": "Dup User",
                "security_question": "您的母校名称是什么？",
                "security_answer": "TestSchool",
            },
        )
        assert resp.status_code == 409

    async def test_register_duplicate_email(self, client, test_user):
        resp = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "test@example.com",
                "username": "anotheruser",
                "password": "NewPass123!",
                "full_name": "Dup Email",
                "security_question": "您的母校名称是什么？",
                "security_answer": "TestSchool",
            },
        )
        assert resp.status_code == 409

    async def test_refresh_token_with_cookie(self, client, test_user):
        await client.post(
            "/api/v1/auth/login",
            json={
                "username": "testuser",
                "password": "TestPass123!",
            },
        )
        resp = await client.post("/api/v1/auth/refresh")
        assert resp.status_code == 200
        assert "access_token" in resp.json()

    async def test_refresh_token_without_cookie(self, client):
        resp = await client.post("/api/v1/auth/refresh")
        assert resp.status_code == 401

    async def test_refresh_token_invalid_type(self, client, test_user):
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
        resp = await client.post("/api/v1/auth/refresh")
        assert resp.status_code == 401

    async def test_refresh_token_expired(self, client, test_user):
        from datetime import datetime, timedelta, timezone

        import jwt as pyjwt

        from app.core.config import settings

        expired_token = pyjwt.encode(
            {
                "sub": test_user.id,
                "type": "refresh",
                "exp": datetime.now(timezone.utc) - timedelta(hours=1),
                "jti": str(test_user.token_version),
            },
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM,
        )
        client.cookies.clear()
        client.cookies.set("refresh_token", expired_token, domain="test")
        resp = await client.post("/api/v1/auth/refresh")
        assert resp.status_code == 401

    async def test_refresh_token_no_subject(self, client, test_user):
        from datetime import datetime, timedelta, timezone

        import jwt as pyjwt

        from app.core.config import settings

        no_sub_token = pyjwt.encode(
            {
                "type": "refresh",
                "exp": datetime.now(timezone.utc) + timedelta(days=1),
            },
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM,
        )
        client.cookies.clear()
        client.cookies.set("refresh_token", no_sub_token, domain="test")
        resp = await client.post("/api/v1/auth/refresh")
        assert resp.status_code == 401

    async def test_refresh_token_user_not_found(self, client, db_session):
        from datetime import timedelta

        from app.core.security import create_refresh_token

        token = create_refresh_token(
            subject="nonexistent-user-id",
            expires_delta=timedelta(days=1),
            token_version="1",
        )
        client.cookies.clear()
        client.cookies.set("refresh_token", token, domain="test")
        resp = await client.post("/api/v1/auth/refresh")
        assert resp.status_code == 401

    async def test_refresh_token_version_mismatch(self, client, test_user, db_session):
        login_resp = await client.post(
            "/api/v1/auth/login",
            json={
                "username": "testuser",
                "password": "TestPass123!",
            },
        )
        refresh_cookie = login_resp.cookies.get("refresh_token")
        test_user.increment_token_version()
        await db_session.commit()
        client.cookies.clear()
        client.cookies.set("refresh_token", refresh_cookie, domain="test")
        resp = await client.post("/api/v1/auth/refresh")
        assert resp.status_code == 401

    async def test_get_me_with_auth(self, client, auth_headers):
        resp = await client.get("/api/v1/auth/me", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["username"] == "testuser"

    async def test_get_me_without_auth(self, client):
        resp = await client.get("/api/v1/auth/me")
        assert resp.status_code == 401

    async def test_get_me_user_not_found(self, client, db_session):
        from datetime import timedelta

        from app.core.security import create_access_token

        token = create_access_token(
            subject="nonexistent-user-id",
            expires_delta=timedelta(minutes=30),
            token_version="1",
        )
        resp = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 401

    async def test_logout(self, client, auth_headers):
        resp = await client.post("/api/v1/auth/logout", headers=auth_headers)
        assert resp.status_code == 200

    async def test_password_change_success(self, client, auth_headers):
        resp = await client.post(
            "/api/v1/auth/password/change",
            json={
                "current_password": "TestPass123!",
                "new_password": "NewPass456!",
            },
            headers=auth_headers,
        )
        assert resp.status_code == 200

    async def test_password_change_wrong_current(self, client, auth_headers):
        resp = await client.post(
            "/api/v1/auth/password/change",
            json={
                "current_password": "WrongPass123!",
                "new_password": "NewPass456!",
            },
            headers=auth_headers,
        )
        assert resp.status_code == 400

    async def test_get_security_question(self, client, test_user):
        resp = await client.post(
            "/api/v1/auth/password/reset/question",
            json={
                "username": "testuser",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "security_question" in data

    async def test_get_security_question_not_found(self, client):
        resp = await client.post(
            "/api/v1/auth/password/reset/question",
            json={
                "username": "nonexistent",
            },
        )
        assert resp.status_code == 200

    async def test_password_reset_success(self, client, test_user):
        resp = await client.post(
            "/api/v1/auth/password/reset",
            json={
                "username": "testuser",
                "new_password": "ResetPass123!",
                "security_answer": "Fluffy",
            },
        )
        assert resp.status_code == 200

    async def test_password_reset_wrong_answer(self, client, test_user):
        resp = await client.post(
            "/api/v1/auth/password/reset",
            json={
                "username": "testuser",
                "new_password": "ResetPass123!",
                "security_answer": "WrongAnswer",
            },
        )
        assert resp.status_code == 400

    async def test_password_reset_user_not_found(self, client):
        resp = await client.post(
            "/api/v1/auth/password/reset",
            json={
                "username": "nonexistent",
                "new_password": "ResetPass123!",
                "security_answer": "Whatever",
            },
        )
        assert resp.status_code == 404


class TestCourseEndpoints:

    async def test_create_course(self, client, auth_headers):
        resp = await client.post(
            "/api/v1/courses",
            json={
                "name": "Math 101",
                "subject": "Math",
                "grade": "Grade 1",
                "teacher": "Test User",
                "schedule": "Mon 9:00",
                "description": "Basic math",
                "status": "draft",
            },
            headers=auth_headers,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["data"]["name"] == "Math 101"

    async def test_list_courses(self, client, auth_headers):
        resp = await client.get("/api/v1/courses", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "data" in data
        assert "total" in data

    async def test_list_courses_with_pagination(self, client, auth_headers):
        resp = await client.get("/api/v1/courses?page=1&page_size=10", headers=auth_headers)
        assert resp.status_code == 200

    async def test_list_courses_with_filters(self, client, auth_headers):
        resp = await client.get(
            "/api/v1/courses?keyword=Math&subject=Math&grade=Grade1", headers=auth_headers
        )
        assert resp.status_code == 200

    async def test_get_course_by_id(self, client, auth_headers):
        create_resp = await client.post(
            "/api/v1/courses",
            json={
                "name": "Science 101",
                "subject": "Science",
                "grade": "Grade 2",
                "teacher": "Test User",
            },
            headers=auth_headers,
        )
        course_id = create_resp.json()["data"]["id"]
        resp = await client.get(f"/api/v1/courses/{course_id}", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["data"]["id"] == course_id

    async def test_get_course_not_found(self, client, auth_headers):
        resp = await client.get("/api/v1/courses/nonexistent-id", headers=auth_headers)
        assert resp.status_code == 404

    async def test_update_course(self, client, auth_headers):
        create_resp = await client.post(
            "/api/v1/courses",
            json={
                "name": "History 101",
                "subject": "History",
                "grade": "Grade 3",
                "teacher": "Test User",
            },
            headers=auth_headers,
        )
        course_id = create_resp.json()["data"]["id"]
        resp = await client.put(
            f"/api/v1/courses/{course_id}",
            json={
                "name": "History 201",
            },
            headers=auth_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["data"]["name"] == "History 201"

    async def test_update_course_not_found(self, client, auth_headers):
        resp = await client.put(
            "/api/v1/courses/nonexistent-id",
            json={
                "name": "Updated",
            },
            headers=auth_headers,
        )
        assert resp.status_code == 404

    async def test_delete_course(self, client, auth_headers):
        create_resp = await client.post(
            "/api/v1/courses",
            json={
                "name": "Art 101",
                "subject": "Art",
                "grade": "Grade 4",
                "teacher": "Test User",
            },
            headers=auth_headers,
        )
        course_id = create_resp.json()["data"]["id"]
        resp = await client.delete(f"/api/v1/courses/{course_id}", headers=auth_headers)
        assert resp.status_code == 204

    async def test_delete_course_not_found(self, client, auth_headers):
        resp = await client.delete("/api/v1/courses/nonexistent-id", headers=auth_headers)
        assert resp.status_code == 404

    async def test_enroll_student(self, client, auth_headers, db_session):
        course_resp = await client.post(
            "/api/v1/courses",
            json={
                "name": "Enroll Course",
                "subject": "Test",
                "grade": "Grade 1",
                "teacher": "Test User",
            },
            headers=auth_headers,
        )
        course_id = course_resp.json()["data"]["id"]
        student_resp = await client.post(
            "/api/v1/students",
            json={
                "name": "Enroll Student",
                "gender": "male",
                "birth_date": "2015-05-01",
                "grade": "Grade 1",
                "class_name": "Class A",
            },
            headers=auth_headers,
        )
        student_id = student_resp.json()["data"]["id"]
        resp = await client.post(
            f"/api/v1/courses/{course_id}/students/{student_id}",
            headers=auth_headers,
        )
        assert resp.status_code == 201

    async def test_enroll_student_duplicate(self, client, auth_headers, db_session):
        course_resp = await client.post(
            "/api/v1/courses",
            json={
                "name": "Dup Enroll Course",
                "subject": "Test",
                "grade": "Grade 1",
                "teacher": "Test User",
            },
            headers=auth_headers,
        )
        course_id = course_resp.json()["data"]["id"]
        student_resp = await client.post(
            "/api/v1/students",
            json={
                "name": "Dup Enroll Student",
                "gender": "male",
                "birth_date": "2015-05-01",
                "grade": "Grade 1",
                "class_name": "Class A",
            },
            headers=auth_headers,
        )
        student_id = student_resp.json()["data"]["id"]
        await client.post(
            f"/api/v1/courses/{course_id}/students/{student_id}", headers=auth_headers
        )
        resp = await client.post(
            f"/api/v1/courses/{course_id}/students/{student_id}",
            headers=auth_headers,
        )
        assert resp.status_code == 409

    async def test_enroll_course_not_found(self, client, auth_headers):
        resp = await client.post(
            "/api/v1/courses/nonexistent-course/students/nonexistent-student",
            headers=auth_headers,
        )
        assert resp.status_code == 404

    async def test_enroll_student_not_found(self, client, auth_headers):
        course_resp = await client.post(
            "/api/v1/courses",
            json={
                "name": "Enroll NF Course",
                "subject": "Test",
                "grade": "Grade 1",
                "teacher": "Test User",
            },
            headers=auth_headers,
        )
        course_id = course_resp.json()["data"]["id"]
        resp = await client.post(
            f"/api/v1/courses/{course_id}/students/nonexistent-student",
            headers=auth_headers,
        )
        assert resp.status_code == 404

    async def test_unenroll_student(self, client, auth_headers, db_session):
        course_resp = await client.post(
            "/api/v1/courses",
            json={
                "name": "Unenroll Course",
                "subject": "Test",
                "grade": "Grade 1",
                "teacher": "Test User",
            },
            headers=auth_headers,
        )
        course_id = course_resp.json()["data"]["id"]
        student_resp = await client.post(
            "/api/v1/students",
            json={
                "name": "Unenroll Student",
                "gender": "female",
                "birth_date": "2015-05-01",
                "grade": "Grade 1",
                "class_name": "Class A",
            },
            headers=auth_headers,
        )
        student_id = student_resp.json()["data"]["id"]
        await client.post(
            f"/api/v1/courses/{course_id}/students/{student_id}", headers=auth_headers
        )
        resp = await client.delete(
            f"/api/v1/courses/{course_id}/students/{student_id}",
            headers=auth_headers,
        )
        assert resp.status_code == 204

    async def test_unenroll_course_not_found(self, client, auth_headers):
        resp = await client.delete(
            "/api/v1/courses/nonexistent-course/students/nonexistent-student",
            headers=auth_headers,
        )
        assert resp.status_code == 404

    async def test_unenroll_student_not_found(self, client, auth_headers):
        course_resp = await client.post(
            "/api/v1/courses",
            json={
                "name": "Unenroll NF Course",
                "subject": "Test",
                "grade": "Grade 1",
                "teacher": "Test User",
            },
            headers=auth_headers,
        )
        course_id = course_resp.json()["data"]["id"]
        resp = await client.delete(
            f"/api/v1/courses/{course_id}/students/nonexistent-student",
            headers=auth_headers,
        )
        assert resp.status_code == 404

    async def test_unenroll_not_enrolled(self, client, auth_headers):
        course_resp = await client.post(
            "/api/v1/courses",
            json={
                "name": "Unenroll NE Course",
                "subject": "Test",
                "grade": "Grade 1",
                "teacher": "Test User",
            },
            headers=auth_headers,
        )
        course_id = course_resp.json()["data"]["id"]
        student_resp = await client.post(
            "/api/v1/students",
            json={
                "name": "Unenroll NE Student",
                "gender": "male",
                "birth_date": "2015-05-01",
                "grade": "Grade 1",
                "class_name": "Class A",
            },
            headers=auth_headers,
        )
        student_id = student_resp.json()["data"]["id"]
        resp = await client.delete(
            f"/api/v1/courses/{course_id}/students/{student_id}",
            headers=auth_headers,
        )
        assert resp.status_code == 404

    async def test_get_course_students(self, client, auth_headers, db_session):
        course_resp = await client.post(
            "/api/v1/courses",
            json={
                "name": "Students List Course",
                "subject": "Test",
                "grade": "Grade 1",
                "teacher": "Test User",
            },
            headers=auth_headers,
        )
        course_id = course_resp.json()["data"]["id"]
        resp = await client.get(f"/api/v1/courses/{course_id}/students", headers=auth_headers)
        assert resp.status_code == 200

    async def test_get_course_students_not_found(self, client, auth_headers):
        resp = await client.get("/api/v1/courses/nonexistent-id/students", headers=auth_headers)
        assert resp.status_code == 404


class TestStudentEndpoints:

    async def test_create_student(self, client, auth_headers):
        resp = await client.post(
            "/api/v1/students",
            json={
                "name": "Test Student",
                "gender": "male",
                "birth_date": "2015-05-01",
                "grade": "Grade 1",
                "class_name": "Class A",
            },
            headers=auth_headers,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["data"]["name"] == "Test Student"

    async def test_create_student_is_active_default(self, client, auth_headers):
        resp = await client.post(
            "/api/v1/students",
            json={
                "name": "Active Default Student",
                "gender": "female",
                "birth_date": "2015-05-01",
                "grade": "Grade 1",
                "class_name": "Class A",
                "is_active": None,
            },
            headers=auth_headers,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["data"]["is_active"] is True

    async def test_create_student_birthday_not_yet(self, client, auth_headers):
        resp = await client.post(
            "/api/v1/students",
            json={
                "name": "Future Birthday Student",
                "gender": "male",
                "birth_date": "2015-12-25",
                "grade": "Grade 1",
                "class_name": "Class A",
            },
            headers=auth_headers,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["data"]["age"] is not None

    async def test_list_students(self, client, auth_headers):
        await client.post(
            "/api/v1/students",
            json={
                "name": "List Student",
                "gender": "male",
                "birth_date": "2015-03-15",
                "grade": "Grade 1",
                "class_name": "Class A",
            },
            headers=auth_headers,
        )
        resp = await client.get("/api/v1/students", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "data" in data
        assert "total" in data
        assert data["total"] >= 1

    async def test_list_students_with_filters(self, client, auth_headers):
        resp = await client.get(
            "/api/v1/students?keyword=Test&grade=Grade1&class_name=ClassA", headers=auth_headers
        )
        assert resp.status_code == 200

    async def test_get_student(self, client, auth_headers):
        create_resp = await client.post(
            "/api/v1/students",
            json={
                "name": "Get Student",
                "gender": "female",
                "birth_date": "2016-03-15",
                "grade": "Grade 2",
                "class_name": "Class B",
            },
            headers=auth_headers,
        )
        student_id = create_resp.json()["data"]["id"]
        resp = await client.get(f"/api/v1/students/{student_id}", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["data"]["id"] == student_id

    async def test_get_student_not_found(self, client, auth_headers):
        resp = await client.get("/api/v1/students/nonexistent-id", headers=auth_headers)
        assert resp.status_code == 404

    async def test_update_student(self, client, auth_headers):
        create_resp = await client.post(
            "/api/v1/students",
            json={
                "name": "Update Student",
                "gender": "male",
                "birth_date": "2015-01-01",
                "grade": "Grade 1",
                "class_name": "Class A",
            },
            headers=auth_headers,
        )
        student_id = create_resp.json()["data"]["id"]
        resp = await client.put(
            f"/api/v1/students/{student_id}",
            json={
                "name": "Updated Student",
            },
            headers=auth_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["data"]["name"] == "Updated Student"

    async def test_update_student_not_found(self, client, auth_headers):
        resp = await client.put(
            "/api/v1/students/nonexistent-id",
            json={
                "name": "Updated",
            },
            headers=auth_headers,
        )
        assert resp.status_code == 404

    async def test_delete_student(self, client, auth_headers):
        create_resp = await client.post(
            "/api/v1/students",
            json={
                "name": "Delete Student",
                "gender": "male",
                "birth_date": "2015-01-01",
                "grade": "Grade 1",
                "class_name": "Class A",
            },
            headers=auth_headers,
        )
        student_id = create_resp.json()["data"]["id"]
        resp = await client.delete(f"/api/v1/students/{student_id}", headers=auth_headers)
        assert resp.status_code == 204

    async def test_delete_student_not_found(self, client, auth_headers):
        resp = await client.delete("/api/v1/students/nonexistent-id", headers=auth_headers)
        assert resp.status_code == 404

    async def test_get_student_courses(self, client, auth_headers):
        create_resp = await client.post(
            "/api/v1/students",
            json={
                "name": "Courses Student",
                "gender": "male",
                "birth_date": "2015-01-01",
                "grade": "Grade 1",
                "class_name": "Class A",
            },
            headers=auth_headers,
        )
        student_id = create_resp.json()["data"]["id"]
        resp = await client.get(f"/api/v1/students/{student_id}/courses", headers=auth_headers)
        assert resp.status_code == 200

    async def test_get_student_courses_not_found(self, client, auth_headers):
        resp = await client.get("/api/v1/students/nonexistent-id/courses", headers=auth_headers)
        assert resp.status_code == 404

    async def test_export_student_portfolio(self, client, auth_headers):
        create_resp = await client.post(
            "/api/v1/students",
            json={
                "name": "Export Student",
                "gender": "male",
                "birth_date": "2015-01-01",
                "grade": "Grade 1",
                "class_name": "Class A",
            },
            headers=auth_headers,
        )
        student_id = create_resp.json()["data"]["id"]
        resp = await client.get(f"/api/v1/students/{student_id}/export", headers=auth_headers)
        assert resp.status_code == 200

    async def test_export_student_portfolio_not_found(self, client, auth_headers):
        resp = await client.get("/api/v1/students/nonexistent-id/export", headers=auth_headers)
        assert resp.status_code == 404


class TestTagEndpoints:

    async def test_list_tags(self, client, db_session):
        resp = await client.get("/api/v1/tags")
        assert resp.status_code == 200
        data = resp.json()
        assert "data" in data
        assert "total" in data

    async def test_create_tag(self, client, auth_headers, db_session):
        resp = await client.post(
            "/api/v1/tags",
            json={
                "name": "TestTag",
                "description": "A test tag",
                "color": "#FF0000",
            },
            headers=auth_headers,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["data"]["name"] == "TestTag"

    async def test_create_duplicate_tag(self, client, auth_headers, db_session):
        await client.post(
            "/api/v1/tags",
            json={
                "name": "DupTag",
                "color": "#00FF00",
            },
            headers=auth_headers,
        )
        resp = await client.post(
            "/api/v1/tags",
            json={
                "name": "DupTag",
                "color": "#0000FF",
            },
            headers=auth_headers,
        )
        assert resp.status_code == 409

    async def test_get_tag(self, client, auth_headers, db_session):
        create_resp = await client.post(
            "/api/v1/tags",
            json={
                "name": "GetTag",
                "color": "#123456",
            },
            headers=auth_headers,
        )
        tag_id = create_resp.json()["data"]["id"]
        resp = await client.get(f"/api/v1/tags/{tag_id}", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["data"]["id"] == tag_id

    async def test_get_tag_not_found(self, client, auth_headers):
        resp = await client.get("/api/v1/tags/nonexistent-id", headers=auth_headers)
        assert resp.status_code == 404

    async def test_update_tag(self, client, auth_headers, db_session):
        create_resp = await client.post(
            "/api/v1/tags",
            json={
                "name": "UpdateTag",
                "color": "#AAAAAA",
            },
            headers=auth_headers,
        )
        tag_id = create_resp.json()["data"]["id"]
        resp = await client.put(
            f"/api/v1/tags/{tag_id}",
            json={
                "name": "UpdatedTag",
                "color": "#BBBBBB",
            },
            headers=auth_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["data"]["name"] == "UpdatedTag"

    async def test_update_tag_duplicate_name(self, client, auth_headers, db_session):
        await client.post("/api/v1/tags", json={"name": "TagA"}, headers=auth_headers)
        create_resp = await client.post("/api/v1/tags", json={"name": "TagB"}, headers=auth_headers)
        tag_id = create_resp.json()["data"]["id"]
        resp = await client.put(
            f"/api/v1/tags/{tag_id}", json={"name": "TagA"}, headers=auth_headers
        )
        assert resp.status_code == 409

    async def test_update_tag_not_found(self, client, auth_headers):
        resp = await client.put(
            "/api/v1/tags/nonexistent-id", json={"name": "NewName"}, headers=auth_headers
        )
        assert resp.status_code == 404

    async def test_delete_tag(self, client, auth_headers, db_session):
        create_resp = await client.post(
            "/api/v1/tags",
            json={
                "name": "DeleteTag",
                "color": "#CCCCCC",
            },
            headers=auth_headers,
        )
        tag_id = create_resp.json()["data"]["id"]
        resp = await client.delete(f"/api/v1/tags/{tag_id}", headers=auth_headers)
        assert resp.status_code == 204

    async def test_delete_tag_not_found(self, client, auth_headers):
        resp = await client.delete("/api/v1/tags/nonexistent-id", headers=auth_headers)
        assert resp.status_code == 404

    async def test_list_tags_internal_error(self, client):
        from unittest.mock import patch

        with patch.object(TagService, "get_tags", side_effect=RuntimeError("db error")):
            resp = await client.get("/api/v1/tags")
            assert resp.status_code == 500

    async def test_get_tag_internal_error(self, client, auth_headers):
        from unittest.mock import patch

        with patch.object(TagService, "get_tag_by_id", side_effect=RuntimeError("db error")):
            resp = await client.get("/api/v1/tags/some-id", headers=auth_headers)
            assert resp.status_code == 500

    async def test_create_tag_internal_error(self, client, auth_headers):
        from unittest.mock import patch

        with patch.object(TagService, "get_tag_by_name", side_effect=RuntimeError("db error")):
            resp = await client.post(
                "/api/v1/tags", json={"name": "Fail Tag", "color": "#ff0000"}, headers=auth_headers
            )
            assert resp.status_code == 500

    async def test_update_tag_internal_error(self, client, auth_headers, db_session):
        from unittest.mock import patch

        tag = Tag(name="UpdateFail", color="#000000")
        db_session.add(tag)
        await db_session.commit()
        await db_session.refresh(tag)
        with (
            patch.object(TagService, "get_tag_by_id", return_value=tag),
            patch.object(TagService, "get_tag_by_name", return_value=None),
            patch.object(TagService, "update_tag", side_effect=RuntimeError("db error")),
        ):
            resp = await client.put(
                f"/api/v1/tags/{tag.id}", json={"name": "Fail"}, headers=auth_headers
            )
            assert resp.status_code == 500

    async def test_update_tag_not_found_after_update(self, client, auth_headers, db_session):
        from unittest.mock import patch

        tag = Tag(name="UpdateNull", color="#000000")
        db_session.add(tag)
        await db_session.commit()
        await db_session.refresh(tag)
        with (
            patch.object(TagService, "get_tag_by_id", return_value=tag),
            patch.object(TagService, "get_tag_by_name", return_value=None),
            patch.object(TagService, "update_tag", return_value=None),
        ):
            resp = await client.put(
                f"/api/v1/tags/{tag.id}", json={"name": "Null"}, headers=auth_headers
            )
            assert resp.status_code == 404

    async def test_delete_tag_internal_error(self, client, auth_headers, db_session):
        from unittest.mock import patch

        tag = Tag(name="DeleteFail", color="#000000")
        db_session.add(tag)
        await db_session.commit()
        await db_session.refresh(tag)
        with patch.object(TagService, "delete_tag", side_effect=RuntimeError("db error")):
            resp = await client.delete(f"/api/v1/tags/{tag.id}", headers=auth_headers)
            assert resp.status_code == 500


class TestNotificationEndpoints:

    async def _create_notification(self, db_session, user_id):
        notification = Notification(
            user_id=user_id,
            title="Test Notification",
            content="This is a test notification",
            type=NotificationType.SYSTEM,
            read=False,
        )
        db_session.add(notification)
        await db_session.commit()
        await db_session.refresh(notification)
        return notification

    async def test_list_notifications(self, client, auth_headers, test_user, db_session):
        await self._create_notification(db_session, test_user.id)
        resp = await client.get("/api/v1/notifications", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "data" in data
        assert "total" in data
        assert "unread_count" in data

    async def test_list_notifications_with_filters(
        self, client, auth_headers, test_user, db_session
    ):
        await self._create_notification(db_session, test_user.id)
        resp = await client.get(
            "/api/v1/notifications?type=system&read=false", headers=auth_headers
        )
        assert resp.status_code == 200

    async def test_get_notification(self, client, auth_headers, test_user, db_session):
        notification = await self._create_notification(db_session, test_user.id)
        resp = await client.get(f"/api/v1/notifications/{notification.id}", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["id"] == notification.id

    async def test_get_notification_not_found(self, client, auth_headers):
        resp = await client.get("/api/v1/notifications/nonexistent-id", headers=auth_headers)
        assert resp.status_code == 404

    async def test_mark_notification_as_read(self, client, auth_headers, test_user, db_session):
        notification = await self._create_notification(db_session, test_user.id)
        resp = await client.put(
            f"/api/v1/notifications/{notification.id}/read", headers=auth_headers
        )
        assert resp.status_code == 200

    async def test_mark_notification_as_read_not_found(self, client, auth_headers):
        resp = await client.put("/api/v1/notifications/nonexistent-id/read", headers=auth_headers)
        assert resp.status_code == 404

    async def test_mark_all_as_read(self, client, auth_headers, test_user, db_session):
        await self._create_notification(db_session, test_user.id)
        resp = await client.put("/api/v1/notifications/read-all", headers=auth_headers)
        assert resp.status_code == 200

    async def test_mark_batch_as_read(self, client, auth_headers, test_user, db_session):
        n1 = await self._create_notification(db_session, test_user.id)
        resp = await client.put(
            "/api/v1/notifications/read-batch",
            json={
                "ids": [n1.id],
            },
            headers=auth_headers,
        )
        assert resp.status_code == 200

    async def test_mark_batch_as_read_all(self, client, auth_headers, test_user, db_session):
        await self._create_notification(db_session, test_user.id)
        resp = await client.put(
            "/api/v1/notifications/read-batch",
            json={
                "ids": None,
            },
            headers=auth_headers,
        )
        assert resp.status_code == 200

    async def test_delete_notification(self, client, auth_headers, test_user, db_session):
        notification = await self._create_notification(db_session, test_user.id)
        resp = await client.delete(f"/api/v1/notifications/{notification.id}", headers=auth_headers)
        assert resp.status_code == 204

    async def test_delete_notification_not_found(self, client, auth_headers):
        resp = await client.delete("/api/v1/notifications/nonexistent-id", headers=auth_headers)
        assert resp.status_code == 404

    async def test_delete_all_read(self, client, auth_headers, test_user, db_session):
        notification = await self._create_notification(db_session, test_user.id)
        notification.read = True
        await db_session.commit()
        resp = await client.delete("/api/v1/notifications/read/all", headers=auth_headers)
        assert resp.status_code == 200

    async def test_get_unread_count(self, client, auth_headers, test_user, db_session):
        await self._create_notification(db_session, test_user.id)
        resp = await client.get("/api/v1/notifications/unread-count", headers=auth_headers)
        assert resp.status_code == 200
        assert "unread_count" in resp.json()

    async def test_get_notification_stats(self, client, auth_headers, test_user, db_session):
        await self._create_notification(db_session, test_user.id)
        resp = await client.get("/api/v1/notifications/stats", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "total" in data
        assert "unread" in data

    async def test_update_notification(self, client, auth_headers, test_user, db_session):
        notification = await self._create_notification(db_session, test_user.id)
        resp = await client.put(
            f"/api/v1/notifications/{notification.id}",
            json={
                "title": "Updated Title",
            },
            headers=auth_headers,
        )
        assert resp.status_code == 200

    async def test_update_notification_not_found(self, client, auth_headers):
        resp = await client.put(
            "/api/v1/notifications/nonexistent-id",
            json={
                "title": "Updated",
            },
            headers=auth_headers,
        )
        assert resp.status_code == 404


class TestResourceEndpoints:

    async def test_create_resource(self, client, auth_headers):
        file_content = b"Hello World, this is a test file."
        resp = await client.post(
            "/api/v1/resources",
            files={"file": ("test.txt", file_content, "text/plain")},
            data={"name": "Test Resource"},
            headers=auth_headers,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["data"]["name"] == "Test Resource"

    async def test_create_resource_unsupported_file(self, client, auth_headers):
        file_content = b"#!/bin/bash\necho hack"
        resp = await client.post(
            "/api/v1/resources",
            files={"file": ("test.exe", file_content, "application/octet-stream")},
            data={"name": "Bad Resource"},
            headers=auth_headers,
        )
        assert resp.status_code == 400

    async def test_list_resources(self, client, auth_headers):
        file_content = b"List resource test content."
        await client.post(
            "/api/v1/resources",
            files={"file": ("list_test.txt", file_content, "text/plain")},
            data={"name": "List Resource"},
            headers=auth_headers,
        )
        resp = await client.get("/api/v1/resources", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "data" in data
        assert "total" in data
        assert data["total"] >= 1

    async def test_list_resources_with_filters(self, client, auth_headers):
        resp = await client.get(
            "/api/v1/resources?keyword=Test&file_type=text", headers=auth_headers
        )
        assert resp.status_code == 200

    async def test_get_resource(self, client, auth_headers):
        file_content = b"Get resource test content."
        create_resp = await client.post(
            "/api/v1/resources",
            files={"file": ("get_test.txt", file_content, "text/plain")},
            data={"name": "Get Resource"},
            headers=auth_headers,
        )
        resource_id = create_resp.json()["data"]["id"]
        resp = await client.get(f"/api/v1/resources/{resource_id}", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["data"]["id"] == resource_id

    async def test_get_resource_not_found(self, client, auth_headers):
        resp = await client.get("/api/v1/resources/nonexistent-id", headers=auth_headers)
        assert resp.status_code == 404

    async def test_update_resource(self, client, auth_headers):
        file_content = b"Update resource test content."
        create_resp = await client.post(
            "/api/v1/resources",
            files={"file": ("update_test.txt", file_content, "text/plain")},
            data={"name": "Update Resource"},
            headers=auth_headers,
        )
        resource_id = create_resp.json()["data"]["id"]
        resp = await client.put(
            f"/api/v1/resources/{resource_id}",
            json={
                "name": "Updated Resource",
                "description": "Updated description",
            },
            headers=auth_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["data"]["name"] == "Updated Resource"

    async def test_update_resource_not_found(self, client, auth_headers):
        resp = await client.put(
            "/api/v1/resources/nonexistent-id",
            json={
                "name": "Updated",
            },
            headers=auth_headers,
        )
        assert resp.status_code == 404

    async def test_delete_resource(self, client, auth_headers):
        file_content = b"Delete resource test content."
        create_resp = await client.post(
            "/api/v1/resources",
            files={"file": ("delete_test.txt", file_content, "text/plain")},
            data={"name": "Delete Resource"},
            headers=auth_headers,
        )
        resource_id = create_resp.json()["data"]["id"]
        resp = await client.delete(f"/api/v1/resources/{resource_id}", headers=auth_headers)
        assert resp.status_code == 204

    async def test_delete_resource_not_found(self, client, auth_headers):
        resp = await client.delete("/api/v1/resources/nonexistent-id", headers=auth_headers)
        assert resp.status_code == 404

    async def test_get_resource_file(self, client, auth_headers):
        file_content = b"File download test content."
        create_resp = await client.post(
            "/api/v1/resources",
            files={"file": ("download_test.txt", file_content, "text/plain")},
            data={"name": "Download Resource"},
            headers=auth_headers,
        )
        resource_id = create_resp.json()["data"]["id"]
        resp = await client.get(f"/api/v1/resources/{resource_id}/file", headers=auth_headers)
        assert resp.status_code == 200

    async def test_get_resource_file_not_found(self, client, auth_headers):
        resp = await client.get("/api/v1/resources/nonexistent-id/file", headers=auth_headers)
        assert resp.status_code == 404

    async def test_create_resource_file_too_large(self, client, auth_headers):
        from unittest.mock import patch

        file_content = b"x" * 100
        with patch("app.api.v1.resources.settings") as mock_settings:
            mock_settings.MAX_UPLOAD_SIZE = 10
            resp = await client.post(
                "/api/v1/resources",
                files={"file": ("big.txt", file_content, "text/plain")},
                data={"name": "Big Resource"},
                headers=auth_headers,
            )
            assert resp.status_code == 400


class TestLessonPlanEndpoints:

    async def test_create_lesson_plan(self, client, auth_headers):
        resp = await client.post(
            "/api/v1/lesson-plans",
            json={
                "title": "Test Lesson Plan",
                "subject": "Math",
                "grade": "Grade 1",
                "duration": 45,
                "teaching_objectives": "Learn basics",
                "teaching_content": "Numbers 1-10",
            },
            headers=auth_headers,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["data"]["title"] == "Test Lesson Plan"

    async def test_list_lesson_plans(self, client, auth_headers):
        resp = await client.get("/api/v1/lesson-plans", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "data" in data
        assert "total" in data

    async def test_list_lesson_plans_with_filters(self, client, auth_headers):
        resp = await client.get(
            "/api/v1/lesson-plans?status_filter=draft&search=Test", headers=auth_headers
        )
        assert resp.status_code == 200

    async def test_get_lesson_plan(self, client, auth_headers):
        create_resp = await client.post(
            "/api/v1/lesson-plans",
            json={
                "title": "Get Lesson Plan",
                "subject": "Science",
                "grade": "Grade 2",
                "duration": 40,
            },
            headers=auth_headers,
        )
        plan_id = create_resp.json()["data"]["id"]
        resp = await client.get(f"/api/v1/lesson-plans/{plan_id}", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["data"]["id"] == plan_id

    async def test_get_lesson_plan_not_found(self, client, auth_headers):
        resp = await client.get("/api/v1/lesson-plans/nonexistent-id", headers=auth_headers)
        assert resp.status_code == 404

    async def test_update_lesson_plan(self, client, auth_headers):
        create_resp = await client.post(
            "/api/v1/lesson-plans",
            json={
                "title": "Update Lesson Plan",
                "subject": "English",
                "grade": "Grade 3",
                "duration": 50,
            },
            headers=auth_headers,
        )
        plan_id = create_resp.json()["data"]["id"]
        resp = await client.put(
            f"/api/v1/lesson-plans/{plan_id}",
            json={
                "title": "Updated Lesson Plan",
            },
            headers=auth_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["data"]["title"] == "Updated Lesson Plan"

    async def test_update_lesson_plan_not_found(self, client, auth_headers):
        resp = await client.put(
            "/api/v1/lesson-plans/nonexistent-id",
            json={
                "title": "Updated",
            },
            headers=auth_headers,
        )
        assert resp.status_code == 404

    async def test_delete_lesson_plan(self, client, auth_headers):
        create_resp = await client.post(
            "/api/v1/lesson-plans",
            json={
                "title": "Delete Lesson Plan",
                "subject": "Art",
                "grade": "Grade 4",
                "duration": 30,
            },
            headers=auth_headers,
        )
        plan_id = create_resp.json()["data"]["id"]
        resp = await client.delete(f"/api/v1/lesson-plans/{plan_id}", headers=auth_headers)
        assert resp.status_code == 204

    async def test_delete_lesson_plan_not_found(self, client, auth_headers):
        resp = await client.delete("/api/v1/lesson-plans/nonexistent-id", headers=auth_headers)
        assert resp.status_code == 404

    async def test_publish_lesson_plan(self, client, auth_headers):
        create_resp = await client.post(
            "/api/v1/lesson-plans",
            json={
                "title": "Publish Lesson Plan",
                "subject": "Music",
                "grade": "Grade 1",
                "duration": 45,
            },
            headers=auth_headers,
        )
        plan_id = create_resp.json()["data"]["id"]
        resp = await client.post(f"/api/v1/lesson-plans/{plan_id}/publish", headers=auth_headers)
        assert resp.status_code == 200

    async def test_publish_lesson_plan_not_found(self, client, auth_headers):
        resp = await client.post(
            "/api/v1/lesson-plans/nonexistent-id/publish", headers=auth_headers
        )
        assert resp.status_code == 404

    async def test_unpublish_lesson_plan(self, client, auth_headers):
        create_resp = await client.post(
            "/api/v1/lesson-plans",
            json={
                "title": "Unpublish Lesson Plan",
                "subject": "PE",
                "grade": "Grade 2",
                "duration": 60,
            },
            headers=auth_headers,
        )
        plan_id = create_resp.json()["data"]["id"]
        await client.post(f"/api/v1/lesson-plans/{plan_id}/publish", headers=auth_headers)
        resp = await client.post(f"/api/v1/lesson-plans/{plan_id}/unpublish", headers=auth_headers)
        assert resp.status_code == 200

    async def test_unpublish_lesson_plan_not_found(self, client, auth_headers):
        resp = await client.post(
            "/api/v1/lesson-plans/nonexistent-id/unpublish", headers=auth_headers
        )
        assert resp.status_code == 404

    async def test_archive_lesson_plan(self, client, auth_headers):
        create_resp = await client.post(
            "/api/v1/lesson-plans",
            json={
                "title": "Archive Lesson Plan",
                "subject": "History",
                "grade": "Grade 5",
                "duration": 45,
            },
            headers=auth_headers,
        )
        plan_id = create_resp.json()["data"]["id"]
        resp = await client.post(f"/api/v1/lesson-plans/{plan_id}/archive", headers=auth_headers)
        assert resp.status_code == 200

    async def test_archive_lesson_plan_not_found(self, client, auth_headers):
        resp = await client.post(
            "/api/v1/lesson-plans/nonexistent-id/archive", headers=auth_headers
        )
        assert resp.status_code == 404

    async def test_restore_lesson_plan(self, client, auth_headers):
        create_resp = await client.post(
            "/api/v1/lesson-plans",
            json={
                "title": "Restore Lesson Plan",
                "subject": "Geography",
                "grade": "Grade 6",
                "duration": 45,
            },
            headers=auth_headers,
        )
        plan_id = create_resp.json()["data"]["id"]
        await client.post(f"/api/v1/lesson-plans/{plan_id}/archive", headers=auth_headers)
        resp = await client.post(f"/api/v1/lesson-plans/{plan_id}/restore", headers=auth_headers)
        assert resp.status_code == 200

    async def test_restore_lesson_plan_not_found(self, client, auth_headers):
        resp = await client.post(
            "/api/v1/lesson-plans/nonexistent-id/restore", headers=auth_headers
        )
        assert resp.status_code == 404

    async def test_monthly_stats(self, client, auth_headers):
        resp = await client.get("/api/v1/lesson-plans/stats/monthly", headers=auth_headers)
        assert resp.status_code == 200

    async def test_monthly_stats_with_params(self, client, auth_headers):
        resp = await client.get(
            "/api/v1/lesson-plans/stats/monthly?year=2025&month=5", headers=auth_headers
        )
        assert resp.status_code == 200


class TestUserEndpoints:

    async def test_get_user_profile(self, client, auth_headers, test_user):
        resp = await client.get(f"/api/v1/users/{test_user.id}", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["username"] == "testuser"

    async def test_get_user_unauthorized(self, client, auth_headers, test_user, db_session):
        other_user = User(
            email="other@example.com",
            username="otheruser",
            full_name="Other User",
            hashed_password=bcrypt.hashpw("OtherPass123!".encode(), bcrypt.gensalt()).decode(),
            role=UserRole.TEACHER,
            is_active=True,
            token_version=1,
            security_question="Test question",
            hashed_security_answer=bcrypt.hashpw("answer".encode(), bcrypt.gensalt()).decode(),
        )
        db_session.add(other_user)
        await db_session.commit()
        await db_session.refresh(other_user)
        resp = await client.get(f"/api/v1/users/{other_user.id}", headers=auth_headers)
        assert resp.status_code == 403

    async def test_get_user_not_found(self, client, auth_headers, db_session):
        from datetime import timedelta

        from app.core.security import create_access_token

        token = create_access_token(
            subject="nonexistent-user-id",
            expires_delta=timedelta(minutes=30),
            token_version="1",
        )
        resp = await client.get(
            "/api/v1/users/nonexistent-user-id",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 401

    async def test_update_user_profile(self, client, auth_headers, test_user):
        resp = await client.put(
            f"/api/v1/users/{test_user.id}",
            json={
                "full_name": "Updated Name",
            },
            headers=auth_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["full_name"] == "Updated Name"

    async def test_update_user_unauthorized(self, client, auth_headers, test_user, db_session):
        other_user = User(
            email="unauth@example.com",
            username="unauthuser",
            full_name="Unauth User",
            hashed_password=bcrypt.hashpw("UnauthPass123!".encode(), bcrypt.gensalt()).decode(),
            role=UserRole.TEACHER,
            is_active=True,
            token_version=1,
            security_question="Test question",
            hashed_security_answer=bcrypt.hashpw("answer".encode(), bcrypt.gensalt()).decode(),
        )
        db_session.add(other_user)
        await db_session.commit()
        await db_session.refresh(other_user)
        resp = await client.put(
            f"/api/v1/users/{other_user.id}",
            json={
                "full_name": "Hacked Name",
            },
            headers=auth_headers,
        )
        assert resp.status_code == 403

    async def test_update_user_not_found(self, client, auth_headers, db_session):
        from datetime import timedelta

        from app.core.security import create_access_token

        token = create_access_token(
            subject="nonexistent-user-id",
            expires_delta=timedelta(minutes=30),
            token_version="1",
        )
        resp = await client.put(
            "/api/v1/users/nonexistent-user-id",
            json={"full_name": "Updated"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 401

    async def test_update_user_duplicate_username(
        self, client, auth_headers, test_user, db_session
    ):
        other_user = User(
            email="dupuser@example.com",
            username="dupusername",
            full_name="Dup User",
            hashed_password=bcrypt.hashpw("DupPass123!".encode(), bcrypt.gensalt()).decode(),
            role=UserRole.TEACHER,
            is_active=True,
            token_version=1,
            security_question="Test question",
            hashed_security_answer=bcrypt.hashpw("answer".encode(), bcrypt.gensalt()).decode(),
        )
        db_session.add(other_user)
        await db_session.commit()
        resp = await client.put(
            f"/api/v1/users/{test_user.id}",
            json={
                "username": "dupusername",
            },
            headers=auth_headers,
        )
        assert resp.status_code == 409

    async def test_update_user_duplicate_email(self, client, auth_headers, test_user, db_session):
        other_user = User(
            email="dupemail@example.com",
            username="dupemailuser",
            full_name="Dup Email User",
            hashed_password=bcrypt.hashpw("DupEmailPass123!".encode(), bcrypt.gensalt()).decode(),
            role=UserRole.TEACHER,
            is_active=True,
            token_version=1,
            security_question="Test question",
            hashed_security_answer=bcrypt.hashpw("answer".encode(), bcrypt.gensalt()).decode(),
        )
        db_session.add(other_user)
        await db_session.commit()
        resp = await client.put(
            f"/api/v1/users/{test_user.id}",
            json={
                "email": "dupemail@example.com",
            },
            headers=auth_headers,
        )
        assert resp.status_code == 409


class TestDropdownOptionEndpoints:

    async def test_list_dropdown_options(self, client, auth_headers):
        resp = await client.get("/api/v1/dropdown-options", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "data" in data
        assert "total" in data

    async def test_list_dropdown_options_with_group_key(self, client, auth_headers):
        resp = await client.get("/api/v1/dropdown-options?group_key=subject", headers=auth_headers)
        assert resp.status_code == 200

    async def test_create_dropdown_option(self, client, auth_headers):
        resp = await client.post(
            "/api/v1/dropdown-options",
            json={
                "group_key": "subject",
                "label": "Mathematics",
                "value": "math",
                "description": "Math subject",
                "sort_order": 1,
                "is_active": True,
            },
            headers=auth_headers,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["data"]["label"] == "Mathematics"

    async def test_create_dropdown_option_bad_request(self, client, auth_headers, db_session):
        option = DropdownOption(
            group_key="conflict_group",
            label="Conflict Option",
            value="conflict_value",
            sort_order=1,
            is_active=True,
        )
        db_session.add(option)
        await db_session.commit()
        resp = await client.post(
            "/api/v1/dropdown-options",
            json={
                "group_key": "conflict_group",
                "label": "Conflict Option",
                "value": "conflict_value",
                "sort_order": 1,
                "is_active": True,
            },
            headers=auth_headers,
        )
        assert resp.status_code == 409

    async def test_update_dropdown_option(self, client, auth_headers, db_session):
        option = DropdownOption(
            group_key="grade",
            label="Grade 1",
            value="grade_1",
            sort_order=1,
            is_active=True,
        )
        db_session.add(option)
        await db_session.commit()
        await db_session.refresh(option)
        resp = await client.put(
            f"/api/v1/dropdown-options/{option.id}",
            json={
                "label": "Grade 1 Updated",
            },
            headers=auth_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["data"]["label"] == "Grade 1 Updated"

    async def test_update_dropdown_option_not_found(self, client, auth_headers):
        resp = await client.put(
            "/api/v1/dropdown-options/nonexistent-id",
            json={
                "label": "Updated",
            },
            headers=auth_headers,
        )
        assert resp.status_code == 404

    async def test_update_dropdown_option_duplicate_value(self, client, auth_headers, db_session):
        option1 = DropdownOption(
            group_key="dup_group",
            label="Option 1",
            value="value_1",
            sort_order=1,
            is_active=True,
        )
        option2 = DropdownOption(
            group_key="dup_group",
            label="Option 2",
            value="value_2",
            sort_order=2,
            is_active=True,
        )
        db_session.add_all([option1, option2])
        await db_session.commit()
        await db_session.refresh(option2)
        resp = await client.put(
            f"/api/v1/dropdown-options/{option2.id}",
            json={
                "value": "value_1",
            },
            headers=auth_headers,
        )
        assert resp.status_code == 409

    async def test_delete_dropdown_option(self, client, auth_headers, db_session):
        option = DropdownOption(
            group_key="test_group",
            label="Test Option",
            value="test_value",
            sort_order=1,
            is_active=True,
        )
        db_session.add(option)
        await db_session.commit()
        await db_session.refresh(option)
        resp = await client.delete(f"/api/v1/dropdown-options/{option.id}", headers=auth_headers)
        assert resp.status_code == 200

    async def test_delete_dropdown_option_not_found(self, client, auth_headers):
        resp = await client.delete("/api/v1/dropdown-options/nonexistent-id", headers=auth_headers)
        assert resp.status_code == 404


class TestPortfolioEndpoints:

    async def _create_student(self, client, auth_headers):
        resp = await client.post(
            "/api/v1/students",
            json={
                "name": "Portfolio Student",
                "gender": "male",
                "birth_date": "2015-01-01",
                "grade": "Grade 1",
                "class_name": "Class A",
            },
            headers=auth_headers,
        )
        return resp.json()["data"]["id"]

    async def test_create_portfolio(self, client, auth_headers):
        student_id = await self._create_student(client, auth_headers)
        resp = await client.post(
            "/api/v1/portfolios",
            json={
                "student_id": student_id,
                "type": "work",
                "title": "Test Portfolio",
                "content": "Portfolio content",
                "cognitive_score": 80,
            },
            headers=auth_headers,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["data"]["title"] == "Test Portfolio"

    async def test_list_portfolios(self, client, auth_headers):
        resp = await client.get("/api/v1/portfolios", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "data" in data
        assert "total" in data

    async def test_list_portfolios_with_filters(self, client, auth_headers):
        resp = await client.get("/api/v1/portfolios?type=work", headers=auth_headers)
        assert resp.status_code == 200

    async def test_get_portfolio(self, client, auth_headers):
        student_id = await self._create_student(client, auth_headers)
        create_resp = await client.post(
            "/api/v1/portfolios",
            json={
                "student_id": student_id,
                "type": "observation",
                "title": "Get Portfolio",
                "content": "Content",
            },
            headers=auth_headers,
        )
        portfolio_id = create_resp.json()["data"]["id"]
        resp = await client.get(f"/api/v1/portfolios/{portfolio_id}", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["data"]["id"] == portfolio_id

    async def test_get_portfolio_not_found(self, client, auth_headers):
        resp = await client.get("/api/v1/portfolios/nonexistent-id", headers=auth_headers)
        assert resp.status_code == 404

    async def test_update_portfolio(self, client, auth_headers):
        student_id = await self._create_student(client, auth_headers)
        create_resp = await client.post(
            "/api/v1/portfolios",
            json={
                "student_id": student_id,
                "type": "evaluation",
                "title": "Update Portfolio",
                "content": "Old content",
            },
            headers=auth_headers,
        )
        portfolio_id = create_resp.json()["data"]["id"]
        resp = await client.put(
            f"/api/v1/portfolios/{portfolio_id}",
            json={
                "title": "Updated Portfolio",
                "content": "New content",
            },
            headers=auth_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["data"]["title"] == "Updated Portfolio"

    async def test_update_portfolio_not_found(self, client, auth_headers):
        resp = await client.put(
            "/api/v1/portfolios/nonexistent-id",
            json={
                "title": "Updated",
            },
            headers=auth_headers,
        )
        assert resp.status_code == 404

    async def test_delete_portfolio(self, client, auth_headers):
        student_id = await self._create_student(client, auth_headers)
        create_resp = await client.post(
            "/api/v1/portfolios",
            json={
                "student_id": student_id,
                "type": "milestone",
                "title": "Delete Portfolio",
                "content": "Content",
            },
            headers=auth_headers,
        )
        portfolio_id = create_resp.json()["data"]["id"]
        resp = await client.delete(f"/api/v1/portfolios/{portfolio_id}", headers=auth_headers)
        assert resp.status_code == 204

    async def test_delete_portfolio_not_found(self, client, auth_headers):
        resp = await client.delete("/api/v1/portfolios/nonexistent-id", headers=auth_headers)
        assert resp.status_code == 404


class TestLessonTemplateEndpoints:

    async def _create_template(self, db_session):
        template = LessonTemplate(
            name="Test Template",
            description="A test template",
            structure='{"sections": []}',
            is_default=False,
        )
        db_session.add(template)
        await db_session.commit()
        await db_session.refresh(template)
        return template

    async def test_list_lesson_templates(self, client, auth_headers, db_session):
        await self._create_template(db_session)
        resp = await client.get("/api/v1/lesson-templates", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "data" in data
        assert "total" in data

    async def test_get_lesson_template(self, client, auth_headers, db_session):
        template = await self._create_template(db_session)
        resp = await client.get(f"/api/v1/lesson-templates/{template.id}", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["data"]["id"] == template.id

    async def test_get_lesson_template_not_found(self, client, auth_headers):
        resp = await client.get("/api/v1/lesson-templates/nonexistent-id", headers=auth_headers)
        assert resp.status_code == 404


class TestReportEndpoints:

    async def test_get_dashboard_report(self, client, auth_headers):
        resp = await client.get("/api/v1/reports/dashboard", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "data" in data
        assert "totalCourses" in data["data"]
        assert "totalStudents" in data["data"]

    async def test_get_course_report(self, client, auth_headers):
        resp = await client.get("/api/v1/reports/courses", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "data" in data

    async def test_get_student_report(self, client, auth_headers):
        resp = await client.get("/api/v1/reports/students", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "data" in data

    async def test_get_monthly_trends(self, client, auth_headers):
        resp = await client.get("/api/v1/reports/trends", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "data" in data

    async def test_get_monthly_trends_with_months(self, client, auth_headers):
        resp = await client.get("/api/v1/reports/trends?months=3", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["data"]) == 3

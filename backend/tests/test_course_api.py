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


class TestCourseFiltering:
    @pytest.mark.asyncio
    async def test_filter_courses_by_subject(self, client, test_user):
        login_resp = await client.post("/api/v1/auth/login", json={
            "username": "testuser",
            "password": "TestPass123!",
        })
        token = login_resp.json()["token"]["access_token"]

        await client.post("/api/v1/courses", json={
            "name": "Math Course",
            "subject": "Math",
            "grade": "Grade 9",
            "teacher": "Test User",
        }, headers={"Authorization": f"Bearer {token}"})

        await client.post("/api/v1/courses", json={
            "name": "English Course",
            "subject": "English",
            "grade": "Grade 10",
            "teacher": "Test User",
        }, headers={"Authorization": f"Bearer {token}"})

        response = await client.get("/api/v1/courses", params={
            "subject": "Math",
        }, headers={"Authorization": f"Bearer {token}"})

        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1
        for course in data["data"]:
            assert course["subject"] == "Math"

    @pytest.mark.asyncio
    async def test_filter_courses_by_grade(self, client, test_user):
        login_resp = await client.post("/api/v1/auth/login", json={
            "username": "testuser",
            "password": "TestPass123!",
        })
        token = login_resp.json()["token"]["access_token"]

        await client.post("/api/v1/courses", json={
            "name": "Grade9 Course",
            "subject": "Science",
            "grade": "Grade 9",
            "teacher": "Test User",
        }, headers={"Authorization": f"Bearer {token}"})

        await client.post("/api/v1/courses", json={
            "name": "Grade10 Course",
            "subject": "History",
            "grade": "Grade 10",
            "teacher": "Test User",
        }, headers={"Authorization": f"Bearer {token}"})

        response = await client.get("/api/v1/courses", params={
            "grade": "Grade 10",
        }, headers={"Authorization": f"Bearer {token}"})

        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1
        for course in data["data"]:
            assert course["grade"] == "Grade 10"

    @pytest.mark.asyncio
    async def test_course_pagination(self, client, test_user):
        login_resp = await client.post("/api/v1/auth/login", json={
            "username": "testuser",
            "password": "TestPass123!",
        })
        token = login_resp.json()["token"]["access_token"]

        for i in range(3):
            await client.post("/api/v1/courses", json={
                "name": f"Pagination Course {i}",
                "subject": "Art",
                "grade": "Grade 7",
                "teacher": "Test User",
            }, headers={"Authorization": f"Bearer {token}"})

        response = await client.get("/api/v1/courses", params={
            "page": 1,
            "page_size": 2,
        }, headers={"Authorization": f"Bearer {token}"})

        assert response.status_code == 200
        data = response.json()
        assert data["page"] == 1
        assert data["page_size"] == 2
        assert len(data["data"]) <= 2
        assert data["pages"] >= 2


class TestCourseStudentAssociation:
    @pytest.mark.asyncio
    async def test_enroll_student_to_course(self, client, test_user):
        login_resp = await client.post("/api/v1/auth/login", json={
            "username": "testuser",
            "password": "TestPass123!",
        })
        token = login_resp.json()["token"]["access_token"]

        course_resp = await client.post("/api/v1/courses", json={
            "name": "Enroll Course",
            "subject": "Math",
            "grade": "Grade 9",
            "teacher": "Test User",
        }, headers={"Authorization": f"Bearer {token}"})
        course_id = course_resp.json()["data"]["id"]

        student_resp = await client.post("/api/v1/students", json={
            "name": "Enroll Student",
            "gender": "male",
            "birth_date": "2014-05-10",
            "grade": "Grade 5",
            "class_name": "Class 1",
        }, headers={"Authorization": f"Bearer {token}"})
        student_id = student_resp.json()["data"]["id"]

        response = await client.post(
            f"/api/v1/courses/{course_id}/students/{student_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 201
        data = response.json()["data"]
        assert data["course_id"] == course_id
        assert data["student_id"] == student_id
        assert data["enrolled"] is True

    @pytest.mark.asyncio
    async def test_enroll_duplicate_student(self, client, test_user):
        login_resp = await client.post("/api/v1/auth/login", json={
            "username": "testuser",
            "password": "TestPass123!",
        })
        token = login_resp.json()["token"]["access_token"]

        course_resp = await client.post("/api/v1/courses", json={
            "name": "Dup Enroll Course",
            "subject": "English",
            "grade": "Grade 8",
            "teacher": "Test User",
        }, headers={"Authorization": f"Bearer {token}"})
        course_id = course_resp.json()["data"]["id"]

        student_resp = await client.post("/api/v1/students", json={
            "name": "Dup Student",
            "gender": "female",
            "birth_date": "2013-08-22",
            "grade": "Grade 6",
            "class_name": "Class 3",
        }, headers={"Authorization": f"Bearer {token}"})
        student_id = student_resp.json()["data"]["id"]

        await client.post(
            f"/api/v1/courses/{course_id}/students/{student_id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        response = await client.post(
            f"/api/v1/courses/{course_id}/students/{student_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 409

    @pytest.mark.asyncio
    async def test_unenroll_student_from_course(self, client, test_user):
        login_resp = await client.post("/api/v1/auth/login", json={
            "username": "testuser",
            "password": "TestPass123!",
        })
        token = login_resp.json()["token"]["access_token"]

        course_resp = await client.post("/api/v1/courses", json={
            "name": "Unenroll Course",
            "subject": "Science",
            "grade": "Grade 7",
            "teacher": "Test User",
        }, headers={"Authorization": f"Bearer {token}"})
        course_id = course_resp.json()["data"]["id"]

        student_resp = await client.post("/api/v1/students", json={
            "name": "Unenroll Student",
            "gender": "male",
            "birth_date": "2014-01-15",
            "grade": "Grade 5",
            "class_name": "Class 2",
        }, headers={"Authorization": f"Bearer {token}"})
        student_id = student_resp.json()["data"]["id"]

        await client.post(
            f"/api/v1/courses/{course_id}/students/{student_id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        response = await client.delete(
            f"/api/v1/courses/{course_id}/students/{student_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 204

    @pytest.mark.asyncio
    async def test_get_course_students(self, client, test_user):
        login_resp = await client.post("/api/v1/auth/login", json={
            "username": "testuser",
            "password": "TestPass123!",
        })
        token = login_resp.json()["token"]["access_token"]

        course_resp = await client.post("/api/v1/courses", json={
            "name": "Students List Course",
            "subject": "History",
            "grade": "Grade 10",
            "teacher": "Test User",
        }, headers={"Authorization": f"Bearer {token}"})
        course_id = course_resp.json()["data"]["id"]

        student_resp = await client.post("/api/v1/students", json={
            "name": "Listed Student",
            "gender": "female",
            "birth_date": "2013-06-20",
            "grade": "Grade 6",
            "class_name": "Class 1",
        }, headers={"Authorization": f"Bearer {token}"})
        student_id = student_resp.json()["data"]["id"]

        await client.post(
            f"/api/v1/courses/{course_id}/students/{student_id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        response = await client.get(
            f"/api/v1/courses/{course_id}/students",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1
        assert len(data["data"]) >= 1


class TestCourseEdgeCases:
    @pytest.mark.asyncio
    async def test_update_nonexistent_course(self, client, test_user):
        login_resp = await client.post("/api/v1/auth/login", json={
            "username": "testuser",
            "password": "TestPass123!",
        })
        token = login_resp.json()["token"]["access_token"]

        response = await client.put("/api/v1/courses/nonexistent-id", json={
            "name": "Updated",
        }, headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_nonexistent_course(self, client, test_user):
        login_resp = await client.post("/api/v1/auth/login", json={
            "username": "testuser",
            "password": "TestPass123!",
        })
        token = login_resp.json()["token"]["access_token"]

        response = await client.delete("/api/v1/courses/nonexistent-id", headers={
            "Authorization": f"Bearer {token}",
        })
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_create_course_without_auth(self, client):
        response = await client.post("/api/v1/courses", json={
            "name": "No Auth Course",
            "subject": "Math",
            "grade": "Grade 9",
            "teacher": "Anonymous",
        })
        assert response.status_code == 401


class TestCourseCoverageGaps:
    @pytest.mark.asyncio
    async def test_create_course_success(self, client, auth_headers):
        response = await client.post("/api/v1/courses", json={
            "name": "Coverage Course",
            "subject": "Math",
            "grade": "Grade 9",
            "teacher": "Test User",
            "schedule": "Tue/Thu 10:00-11:30",
            "description": "Coverage test course",
        }, headers=auth_headers)
        assert response.status_code == 201
        data = response.json()["data"]
        assert data["name"] == "Coverage Course"
        assert data["subject"] == "Math"
        assert data["grade"] == "Grade 9"
        assert data["status"] == "draft"
        assert "id" in data
        assert "created_at" in data
        assert "updated_at" in data

    @pytest.mark.asyncio
    async def test_get_course_by_id(self, client, auth_headers):
        create_resp = await client.post("/api/v1/courses", json={
            "name": "Get By ID Course",
            "subject": "Physics",
            "grade": "Grade 11",
            "teacher": "Test User",
        }, headers=auth_headers)
        course_id = create_resp.json()["data"]["id"]

        response = await client.get(f"/api/v1/courses/{course_id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["id"] == course_id
        assert data["name"] == "Get By ID Course"
        assert data["subject"] == "Physics"
        assert data["grade"] == "Grade 11"

    @pytest.mark.asyncio
    async def test_list_courses_with_pagination(self, client, auth_headers):
        for i in range(3):
            await client.post("/api/v1/courses", json={
                "name": f"Page Course {i}",
                "subject": "Chemistry",
                "grade": "Grade 10",
                "teacher": "Test User",
            }, headers=auth_headers)

        response = await client.get("/api/v1/courses?page=1&page_size=10", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        assert data["page"] == 1
        assert data["page_size"] == 10
        assert "pages" in data
        assert isinstance(data["data"], list)

    @pytest.mark.asyncio
    async def test_update_course_success(self, client, auth_headers):
        create_resp = await client.post("/api/v1/courses", json={
            "name": "Before Update",
            "subject": "History",
            "grade": "Grade 8",
            "teacher": "Test User",
        }, headers=auth_headers)
        course_id = create_resp.json()["data"]["id"]

        response = await client.put(f"/api/v1/courses/{course_id}", json={
            "name": "After Update",
            "status": "active",
        }, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["id"] == course_id
        assert data["name"] == "After Update"
        assert data["status"] == "active"

    @pytest.mark.asyncio
    async def test_delete_course_success(self, client, auth_headers):
        create_resp = await client.post("/api/v1/courses", json={
            "name": "Delete Coverage Course",
            "subject": "Art",
            "grade": "Grade 7",
            "teacher": "Test User",
        }, headers=auth_headers)
        course_id = create_resp.json()["data"]["id"]

        response = await client.delete(f"/api/v1/courses/{course_id}", headers=auth_headers)
        assert response.status_code == 204

    @pytest.mark.asyncio
    async def test_enroll_student_success(self, client, auth_headers):
        course_resp = await client.post("/api/v1/courses", json={
            "name": "Enroll Coverage Course",
            "subject": "Math",
            "grade": "Grade 9",
            "teacher": "Test User",
        }, headers=auth_headers)
        course_id = course_resp.json()["data"]["id"]

        student_resp = await client.post("/api/v1/students", json={
            "name": "Enroll Coverage Student",
            "gender": "male",
            "birth_date": "2014-05-10",
            "grade": "Grade 5",
            "class_name": "Class 1",
        }, headers=auth_headers)
        student_id = student_resp.json()["data"]["id"]

        response = await client.post(
            f"/api/v1/courses/{course_id}/students/{student_id}",
            headers=auth_headers,
        )
        assert response.status_code == 201
        data = response.json()["data"]
        assert data["course_id"] == course_id
        assert data["student_id"] == student_id
        assert data["enrolled"] is True

    @pytest.mark.asyncio
    async def test_unenroll_student_success(self, client, auth_headers):
        course_resp = await client.post("/api/v1/courses", json={
            "name": "Unenroll Coverage Course",
            "subject": "English",
            "grade": "Grade 8",
            "teacher": "Test User",
        }, headers=auth_headers)
        course_id = course_resp.json()["data"]["id"]

        student_resp = await client.post("/api/v1/students", json={
            "name": "Unenroll Coverage Student",
            "gender": "female",
            "birth_date": "2013-08-22",
            "grade": "Grade 6",
            "class_name": "Class 3",
        }, headers=auth_headers)
        student_id = student_resp.json()["data"]["id"]

        await client.post(
            f"/api/v1/courses/{course_id}/students/{student_id}",
            headers=auth_headers,
        )

        response = await client.delete(
            f"/api/v1/courses/{course_id}/students/{student_id}",
            headers=auth_headers,
        )
        assert response.status_code == 204

    @pytest.mark.asyncio
    async def test_get_course_students_list(self, client, auth_headers):
        course_resp = await client.post("/api/v1/courses", json={
            "name": "Students Coverage Course",
            "subject": "Science",
            "grade": "Grade 7",
            "teacher": "Test User",
        }, headers=auth_headers)
        course_id = course_resp.json()["data"]["id"]

        student_resp = await client.post("/api/v1/students", json={
            "name": "Coverage Course Student",
            "gender": "male",
            "birth_date": "2014-01-15",
            "grade": "Grade 5",
            "class_name": "Class 2",
        }, headers=auth_headers)
        student_id = student_resp.json()["data"]["id"]

        await client.post(
            f"/api/v1/courses/{course_id}/students/{student_id}",
            headers=auth_headers,
        )

        response = await client.get(
            f"/api/v1/courses/{course_id}/students",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1
        assert len(data["data"]) >= 1
        assert "page" in data
        assert "page_size" in data
        assert "pages" in data
import pytest
import pytest_asyncio
import bcrypt

from app.models.user import User


class TestStudentAPI:
    @pytest.mark.asyncio
    async def test_create_student(self, client, test_user):
        login_resp = await client.post("/api/v1/auth/login", json={
            "username": "testuser",
            "password": "TestPass123!",
        })
        token = login_resp.json()["token"]["access_token"]

        response = await client.post("/api/v1/students", json={
            "name": "Zhang Wei",
            "gender": "male",
            "birth_date": "2015-03-15",
            "grade": "Grade 4",
            "class_name": "Class 2",
            "parent_contact": "13800138000",
        }, headers={"Authorization": f"Bearer {token}"})

        assert response.status_code == 201
        data = response.json()["data"]
        assert data["name"] == "Zhang Wei"
        assert data["gender"] == "male"
        assert data["grade"] == "Grade 4"
        assert data["class_name"] == "Class 2"
        assert "id" in data
        assert "progress" in data
        assert "age" in data

    @pytest.mark.asyncio
    async def test_get_students(self, client, test_user):
        login_resp = await client.post("/api/v1/auth/login", json={
            "username": "testuser",
            "password": "TestPass123!",
        })
        token = login_resp.json()["token"]["access_token"]

        await client.post("/api/v1/students", json={
            "name": "Student A",
            "gender": "male",
            "birth_date": "2014-05-10",
            "grade": "Grade 5",
            "class_name": "Class 1",
        }, headers={"Authorization": f"Bearer {token}"})

        await client.post("/api/v1/students", json={
            "name": "Student B",
            "gender": "female",
            "birth_date": "2013-08-22",
            "grade": "Grade 6",
            "class_name": "Class 3",
        }, headers={"Authorization": f"Bearer {token}"})

        response = await client.get("/api/v1/students", headers={
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
    async def test_get_student(self, client, test_user):
        login_resp = await client.post("/api/v1/auth/login", json={
            "username": "testuser",
            "password": "TestPass123!",
        })
        token = login_resp.json()["token"]["access_token"]

        create_resp = await client.post("/api/v1/students", json={
            "name": "Li Ming",
            "gender": "male",
            "birth_date": "2012-11-03",
            "grade": "Grade 7",
            "class_name": "Class 1",
        }, headers={"Authorization": f"Bearer {token}"})
        student_id = create_resp.json()["data"]["id"]

        response = await client.get(f"/api/v1/students/{student_id}", headers={
            "Authorization": f"Bearer {token}",
        })

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["id"] == student_id
        assert data["name"] == "Li Ming"
        assert data["grade"] == "Grade 7"
        assert data["class_name"] == "Class 1"

    @pytest.mark.asyncio
    async def test_update_student(self, client, test_user):
        login_resp = await client.post("/api/v1/auth/login", json={
            "username": "testuser",
            "password": "TestPass123!",
        })
        token = login_resp.json()["token"]["access_token"]

        create_resp = await client.post("/api/v1/students", json={
            "name": "Wang Fang",
            "gender": "female",
            "birth_date": "2014-07-19",
            "grade": "Grade 5",
            "class_name": "Class 2",
        }, headers={"Authorization": f"Bearer {token}"})
        student_id = create_resp.json()["data"]["id"]

        response = await client.put(f"/api/v1/students/{student_id}", json={
            "name": "Wang Fang Updated",
            "grade": "Grade 6",
        }, headers={"Authorization": f"Bearer {token}"})

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["id"] == student_id
        assert data["name"] == "Wang Fang Updated"
        assert data["grade"] == "Grade 6"

    @pytest.mark.asyncio
    async def test_delete_student(self, client, test_user):
        login_resp = await client.post("/api/v1/auth/login", json={
            "username": "testuser",
            "password": "TestPass123!",
        })
        token = login_resp.json()["token"]["access_token"]

        create_resp = await client.post("/api/v1/students", json={
            "name": "To Delete",
            "gender": "male",
            "birth_date": "2013-01-10",
            "grade": "Grade 6",
            "class_name": "Class 4",
        }, headers={"Authorization": f"Bearer {token}"})
        student_id = create_resp.json()["data"]["id"]

        response = await client.delete(f"/api/v1/students/{student_id}", headers={
            "Authorization": f"Bearer {token}",
        })

        assert response.status_code == 204

        get_resp = await client.get(f"/api/v1/students/{student_id}", headers={
            "Authorization": f"Bearer {token}",
        })
        assert get_resp.status_code == 404

    @pytest.mark.asyncio
    async def test_get_student_progress(self, client, test_user):
        login_resp = await client.post("/api/v1/auth/login", json={
            "username": "testuser",
            "password": "TestPass123!",
        })
        token = login_resp.json()["token"]["access_token"]

        create_resp = await client.post("/api/v1/students", json={
            "name": "Progress Student",
            "gender": "male",
            "birth_date": "2014-04-20",
            "grade": "Grade 5",
            "class_name": "Class 3",
        }, headers={"Authorization": f"Bearer {token}"})
        student_id = create_resp.json()["data"]["id"]

        await client.post("/api/v1/portfolios", json={
            "student_id": student_id,
            "type": "evaluation",
            "title": "Mid-term Evaluation",
            "cognitive_score": 80,
            "skill_score": 70,
            "creativity_score": 90,
            "cooperation_score": 60,
            "attention_score": 85,
        }, headers={"Authorization": f"Bearer {token}"})

        response = await client.get(f"/api/v1/students/{student_id}", headers={
            "Authorization": f"Bearer {token}",
        })

        assert response.status_code == 200
        data = response.json()["data"]
        assert "progress" in data
        assert data["progress"] == 77


@pytest_asyncio.fixture(scope="function")
async def second_user(db_session):
    user = User(
        email="student_other@example.com",
        username="studentother",
        full_name="Student Other User",
        hashed_password=bcrypt.hashpw(
            "StudentOther123!".encode("utf-8"), bcrypt.gensalt()
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


class TestStudentFiltering:
    @pytest.mark.asyncio
    async def test_filter_students_by_grade(self, client, test_user):
        login_resp = await client.post("/api/v1/auth/login", json={
            "username": "testuser",
            "password": "TestPass123!",
        })
        token = login_resp.json()["token"]["access_token"]

        await client.post("/api/v1/students", json={
            "name": "Grade5 Student",
            "gender": "male",
            "birth_date": "2014-05-10",
            "grade": "Grade 5",
            "class_name": "Class 1",
        }, headers={"Authorization": f"Bearer {token}"})

        await client.post("/api/v1/students", json={
            "name": "Grade6 Student",
            "gender": "female",
            "birth_date": "2013-08-22",
            "grade": "Grade 6",
            "class_name": "Class 3",
        }, headers={"Authorization": f"Bearer {token}"})

        response = await client.get("/api/v1/students", params={
            "grade": "Grade 5",
        }, headers={"Authorization": f"Bearer {token}"})

        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1
        for student in data["data"]:
            assert student["grade"] == "Grade 5"

    @pytest.mark.asyncio
    async def test_student_pagination(self, client, test_user):
        login_resp = await client.post("/api/v1/auth/login", json={
            "username": "testuser",
            "password": "TestPass123!",
        })
        token = login_resp.json()["token"]["access_token"]

        for i in range(3):
            await client.post("/api/v1/students", json={
                "name": f"Pagination Student {i}",
                "gender": "male",
                "birth_date": "2014-01-10",
                "grade": "Grade 5",
                "class_name": "Class 1",
            }, headers={"Authorization": f"Bearer {token}"})

        response = await client.get("/api/v1/students", params={
            "page": 1,
            "page_size": 2,
        }, headers={"Authorization": f"Bearer {token}"})

        assert response.status_code == 200
        data = response.json()
        assert data["page"] == 1
        assert data["page_size"] == 2
        assert len(data["data"]) <= 2
        assert data["pages"] >= 2


class TestStudentEdgeCases:
    @pytest.mark.asyncio
    async def test_get_nonexistent_student(self, client, test_user):
        login_resp = await client.post("/api/v1/auth/login", json={
            "username": "testuser",
            "password": "TestPass123!",
        })
        token = login_resp.json()["token"]["access_token"]

        response = await client.get("/api/v1/students/nonexistent-id", headers={
            "Authorization": f"Bearer {token}",
        })
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_nonexistent_student(self, client, test_user):
        login_resp = await client.post("/api/v1/auth/login", json={
            "username": "testuser",
            "password": "TestPass123!",
        })
        token = login_resp.json()["token"]["access_token"]

        response = await client.put("/api/v1/students/nonexistent-id", json={
            "name": "Updated",
        }, headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_nonexistent_student(self, client, test_user):
        login_resp = await client.post("/api/v1/auth/login", json={
            "username": "testuser",
            "password": "TestPass123!",
        })
        token = login_resp.json()["token"]["access_token"]

        response = await client.delete("/api/v1/students/nonexistent-id", headers={
            "Authorization": f"Bearer {token}",
        })
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_create_student_without_auth(self, client):
        response = await client.post("/api/v1/students", json={
            "name": "No Auth Student",
            "gender": "male",
            "birth_date": "2014-05-10",
            "grade": "Grade 5",
            "class_name": "Class 1",
        })
        assert response.status_code == 401


class TestStudentCrossUser:
    @pytest.mark.asyncio
    async def test_cannot_access_other_user_student(self, client, test_user, second_user):
        login_resp = await client.post("/api/v1/auth/login", json={
            "username": "testuser",
            "password": "TestPass123!",
        })
        token_a = login_resp.json()["token"]["access_token"]

        student_resp = await client.post("/api/v1/students", json={
            "name": "User A Student",
            "gender": "male",
            "birth_date": "2014-05-10",
            "grade": "Grade 5",
            "class_name": "Class 1",
        }, headers={"Authorization": f"Bearer {token_a}"})
        student_id = student_resp.json()["data"]["id"]

        login_resp_b = await client.post("/api/v1/auth/login", json={
            "username": "studentother",
            "password": "StudentOther123!",
        })
        token_b = login_resp_b.json()["token"]["access_token"]

        response = await client.get(f"/api/v1/students/{student_id}", headers={
            "Authorization": f"Bearer {token_b}",
        })
        assert response.status_code == 404


class TestStudentCoverageGaps:
    @pytest.mark.asyncio
    async def test_create_student_is_active_default(self, client, auth_headers):
        response = await client.post("/api/v1/students", json={
            "name": "Active Default Student",
            "gender": "male",
            "birth_date": "2014-05-10",
            "grade": "Grade 5",
            "class_name": "Class 1",
        }, headers=auth_headers)
        assert response.status_code == 201
        data = response.json()["data"]
        assert data["is_active"] is True

    @pytest.mark.asyncio
    async def test_get_student_with_age(self, client, auth_headers):
        create_resp = await client.post("/api/v1/students", json={
            "name": "Age Test Student",
            "gender": "female",
            "birth_date": "2012-11-03",
            "grade": "Grade 7",
            "class_name": "Class 1",
        }, headers=auth_headers)
        student_id = create_resp.json()["data"]["id"]

        response = await client.get(f"/api/v1/students/{student_id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["id"] == student_id
        assert "age" in data
        assert isinstance(data["age"], int)
        assert data["age"] > 0

    @pytest.mark.asyncio
    async def test_list_students_with_pagination(self, client, auth_headers):
        for i in range(3):
            await client.post("/api/v1/students", json={
                "name": f"Pag Student {i}",
                "gender": "male",
                "birth_date": "2014-01-10",
                "grade": "Grade 5",
                "class_name": "Class 1",
            }, headers=auth_headers)

        response = await client.get("/api/v1/students?page=1&page_size=10", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        assert data["page"] == 1
        assert data["page_size"] == 10
        assert "pages" in data
        assert isinstance(data["data"], list)

    @pytest.mark.asyncio
    async def test_update_student_success(self, client, auth_headers):
        create_resp = await client.post("/api/v1/students", json={
            "name": "Update Coverage Student",
            "gender": "female",
            "birth_date": "2014-07-19",
            "grade": "Grade 5",
            "class_name": "Class 2",
        }, headers=auth_headers)
        student_id = create_resp.json()["data"]["id"]

        response = await client.put(f"/api/v1/students/{student_id}", json={
            "name": "Updated Coverage Student",
            "grade": "Grade 6",
        }, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["id"] == student_id
        assert data["name"] == "Updated Coverage Student"
        assert data["grade"] == "Grade 6"

    @pytest.mark.asyncio
    async def test_delete_student_success(self, client, auth_headers):
        create_resp = await client.post("/api/v1/students", json={
            "name": "Delete Coverage Student",
            "gender": "male",
            "birth_date": "2013-01-10",
            "grade": "Grade 6",
            "class_name": "Class 4",
        }, headers=auth_headers)
        student_id = create_resp.json()["data"]["id"]

        response = await client.delete(f"/api/v1/students/{student_id}", headers=auth_headers)
        assert response.status_code == 204

    @pytest.mark.asyncio
    async def test_get_student_courses(self, client, auth_headers):
        student_resp = await client.post("/api/v1/students", json={
            "name": "Courses Student",
            "gender": "male",
            "birth_date": "2014-05-10",
            "grade": "Grade 5",
            "class_name": "Class 1",
        }, headers=auth_headers)
        student_id = student_resp.json()["data"]["id"]

        course_resp = await client.post("/api/v1/courses", json={
            "name": "Student Course",
            "subject": "Math",
            "grade": "Grade 5",
            "teacher": "Test User",
        }, headers=auth_headers)
        course_id = course_resp.json()["data"]["id"]

        await client.post(
            f"/api/v1/courses/{course_id}/students/{student_id}",
            headers=auth_headers,
        )

        response = await client.get(f"/api/v1/students/{student_id}/courses", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1
        assert len(data["data"]) >= 1
        assert "page" in data
        assert "page_size" in data
        assert "pages" in data

    @pytest.mark.asyncio
    async def test_export_student_portfolio(self, client, auth_headers):
        create_resp = await client.post("/api/v1/students", json={
            "name": "Export Student",
            "gender": "female",
            "birth_date": "2013-06-20",
            "grade": "Grade 6",
            "class_name": "Class 3",
        }, headers=auth_headers)
        student_id = create_resp.json()["data"]["id"]

        response = await client.get(f"/api/v1/students/{student_id}/export", headers=auth_headers)
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/pdf"


class TestCalculateAge:
    def test_calculate_age_with_valid_date(self):
        from app.api.v1.students import calculate_age
        from datetime import date

        birth = date(2014, 5, 10)
        age = calculate_age(birth)
        assert isinstance(age, int)
        assert age > 0

    def test_calculate_age_with_none(self):
        from app.api.v1.students import calculate_age

        assert calculate_age(None) is None

    def test_calculate_age_birthday_not_reached(self):
        from app.api.v1.students import calculate_age
        from datetime import date

        today = date.today()
        future_month = today.month + 1 if today.month < 12 else 1
        future_year = today.year if today.month < 12 else today.year + 1
        birth = date(today.year - 10, future_month, 1)
        age = calculate_age(birth)
        assert age == 9
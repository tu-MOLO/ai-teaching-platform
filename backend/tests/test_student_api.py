import pytest


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
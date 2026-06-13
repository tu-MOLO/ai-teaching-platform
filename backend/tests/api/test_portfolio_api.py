import pytest


class TestPortfolioAPI:
    @pytest.mark.asyncio
    async def test_create_portfolio(self, client, test_user):
        login_resp = await client.post("/api/v1/auth/login", json={
            "username": "testuser",
            "password": "TestPass123!",
        })
        token = login_resp.json()["token"]["access_token"]

        student_resp = await client.post("/api/v1/students", json={
            "name": "Portfolio Student",
            "gender": "female",
            "birth_date": "2014-06-15",
            "grade": "Grade 5",
            "class_name": "Class 1",
        }, headers={"Authorization": f"Bearer {token}"})
        student_id = student_resp.json()["data"]["id"]

        response = await client.post("/api/v1/portfolios", json={
            "student_id": student_id,
            "type": "work",
            "title": "Math Homework Week 1",
            "content": "Excellent performance in algebra",
            "cognitive_score": 90,
            "skill_score": 85,
            "creativity_score": 78,
            "cooperation_score": 80,
            "attention_score": 92,
        }, headers={"Authorization": f"Bearer {token}"})

        assert response.status_code == 201
        data = response.json()["data"]
        assert data["student_id"] == student_id
        assert data["type"] == "work"
        assert data["title"] == "Math Homework Week 1"
        assert data["cognitive_score"] == 90
        assert data["skill_score"] == 85
        assert "id" in data
        assert "created_at" in data

    @pytest.mark.asyncio
    async def test_get_portfolios(self, client, test_user):
        login_resp = await client.post("/api/v1/auth/login", json={
            "username": "testuser",
            "password": "TestPass123!",
        })
        token = login_resp.json()["token"]["access_token"]

        student_resp = await client.post("/api/v1/students", json={
            "name": "List Student",
            "gender": "male",
            "birth_date": "2013-12-01",
            "grade": "Grade 6",
            "class_name": "Class 2",
        }, headers={"Authorization": f"Bearer {token}"})
        student_id = student_resp.json()["data"]["id"]

        await client.post("/api/v1/portfolios", json={
            "student_id": student_id,
            "type": "observation",
            "title": "Classroom Observation 1",
        }, headers={"Authorization": f"Bearer {token}"})

        await client.post("/api/v1/portfolios", json={
            "student_id": student_id,
            "type": "milestone",
            "title": "Completed Chapter 5",
        }, headers={"Authorization": f"Bearer {token}"})

        response = await client.get("/api/v1/portfolios", headers={
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
    async def test_get_portfolio(self, client, test_user):
        login_resp = await client.post("/api/v1/auth/login", json={
            "username": "testuser",
            "password": "TestPass123!",
        })
        token = login_resp.json()["token"]["access_token"]

        student_resp = await client.post("/api/v1/students", json={
            "name": "Single Portfolio Student",
            "gender": "female",
            "birth_date": "2015-02-28",
            "grade": "Grade 4",
            "class_name": "Class 3",
        }, headers={"Authorization": f"Bearer {token}"})
        student_id = student_resp.json()["data"]["id"]

        create_resp = await client.post("/api/v1/portfolios", json={
            "student_id": student_id,
            "type": "evaluation",
            "title": "Weekly Evaluation",
            "content": "Good progress in reading comprehension",
            "creativity_score": 88,
        }, headers={"Authorization": f"Bearer {token}"})
        portfolio_id = create_resp.json()["data"]["id"]

        response = await client.get(f"/api/v1/portfolios/{portfolio_id}", headers={
            "Authorization": f"Bearer {token}",
        })

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["id"] == portfolio_id
        assert data["title"] == "Weekly Evaluation"
        assert data["type"] == "evaluation"
        assert data["student_id"] == student_id

    @pytest.mark.asyncio
    async def test_update_portfolio(self, client, test_user):
        login_resp = await client.post("/api/v1/auth/login", json={
            "username": "testuser",
            "password": "TestPass123!",
        })
        token = login_resp.json()["token"]["access_token"]

        student_resp = await client.post("/api/v1/students", json={
            "name": "Update Portfolio Student",
            "gender": "male",
            "birth_date": "2014-09-10",
            "grade": "Grade 5",
            "class_name": "Class 4",
        }, headers={"Authorization": f"Bearer {token}"})
        student_id = student_resp.json()["data"]["id"]

        create_resp = await client.post("/api/v1/portfolios", json={
            "student_id": student_id,
            "type": "work",
            "title": "Original Title",
            "cognitive_score": 70,
        }, headers={"Authorization": f"Bearer {token}"})
        portfolio_id = create_resp.json()["data"]["id"]

        response = await client.put(f"/api/v1/portfolios/{portfolio_id}", json={
            "title": "Updated Title",
            "cognitive_score": 95,
        }, headers={"Authorization": f"Bearer {token}"})

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["id"] == portfolio_id
        assert data["title"] == "Updated Title"
        assert data["cognitive_score"] == 95

    @pytest.mark.asyncio
    async def test_delete_portfolio(self, client, test_user):
        login_resp = await client.post("/api/v1/auth/login", json={
            "username": "testuser",
            "password": "TestPass123!",
        })
        token = login_resp.json()["token"]["access_token"]

        student_resp = await client.post("/api/v1/students", json={
            "name": "Delete Portfolio Student",
            "gender": "female",
            "birth_date": "2015-08-20",
            "grade": "Grade 4",
            "class_name": "Class 1",
        }, headers={"Authorization": f"Bearer {token}"})
        student_id = student_resp.json()["data"]["id"]

        create_resp = await client.post("/api/v1/portfolios", json={
            "student_id": student_id,
            "type": "observation",
            "title": "To Be Archived",
        }, headers={"Authorization": f"Bearer {token}"})
        portfolio_id = create_resp.json()["data"]["id"]

        response = await client.delete(f"/api/v1/portfolios/{portfolio_id}", headers={
            "Authorization": f"Bearer {token}",
        })

        assert response.status_code == 204

        get_resp = await client.get(f"/api/v1/portfolios/{portfolio_id}", headers={
            "Authorization": f"Bearer {token}",
        })
        assert get_resp.status_code == 404


class TestPortfolioFiltering:
    @pytest.mark.asyncio
    async def test_filter_portfolios_by_student_id(self, client, test_user):
        login_resp = await client.post("/api/v1/auth/login", json={
            "username": "testuser",
            "password": "TestPass123!",
        })
        token = login_resp.json()["token"]["access_token"]

        student_a_resp = await client.post("/api/v1/students", json={
            "name": "Filter Student A",
            "gender": "male",
            "birth_date": "2014-03-10",
            "grade": "Grade 5",
            "class_name": "Class 1",
        }, headers={"Authorization": f"Bearer {token}"})
        student_a_id = student_a_resp.json()["data"]["id"]

        student_b_resp = await client.post("/api/v1/students", json={
            "name": "Filter Student B",
            "gender": "female",
            "birth_date": "2013-07-15",
            "grade": "Grade 6",
            "class_name": "Class 2",
        }, headers={"Authorization": f"Bearer {token}"})
        student_b_id = student_b_resp.json()["data"]["id"]

        await client.post("/api/v1/portfolios", json={
            "student_id": student_a_id,
            "type": "work",
            "title": "Student A Work",
        }, headers={"Authorization": f"Bearer {token}"})

        await client.post("/api/v1/portfolios", json={
            "student_id": student_b_id,
            "type": "observation",
            "title": "Student B Observation",
        }, headers={"Authorization": f"Bearer {token}"})

        response = await client.get("/api/v1/portfolios", params={
            "student_id": student_a_id,
        }, headers={"Authorization": f"Bearer {token}"})

        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1
        for portfolio in data["data"]:
            assert portfolio["student_id"] == student_a_id

    @pytest.mark.asyncio
    async def test_filter_portfolios_by_type(self, client, test_user):
        login_resp = await client.post("/api/v1/auth/login", json={
            "username": "testuser",
            "password": "TestPass123!",
        })
        token = login_resp.json()["token"]["access_token"]

        student_resp = await client.post("/api/v1/students", json={
            "name": "Type Filter Student",
            "gender": "male",
            "birth_date": "2014-11-05",
            "grade": "Grade 5",
            "class_name": "Class 3",
        }, headers={"Authorization": f"Bearer {token}"})
        student_id = student_resp.json()["data"]["id"]

        await client.post("/api/v1/portfolios", json={
            "student_id": student_id,
            "type": "work",
            "title": "Work Portfolio",
        }, headers={"Authorization": f"Bearer {token}"})

        await client.post("/api/v1/portfolios", json={
            "student_id": student_id,
            "type": "evaluation",
            "title": "Evaluation Portfolio",
        }, headers={"Authorization": f"Bearer {token}"})

        response = await client.get("/api/v1/portfolios", params={
            "type": "work",
        }, headers={"Authorization": f"Bearer {token}"})

        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1
        for portfolio in data["data"]:
            assert portfolio["type"] == "work"

    @pytest.mark.asyncio
    async def test_portfolio_pagination(self, client, test_user):
        login_resp = await client.post("/api/v1/auth/login", json={
            "username": "testuser",
            "password": "TestPass123!",
        })
        token = login_resp.json()["token"]["access_token"]

        student_resp = await client.post("/api/v1/students", json={
            "name": "Pagination Portfolio Student",
            "gender": "female",
            "birth_date": "2015-02-10",
            "grade": "Grade 4",
            "class_name": "Class 2",
        }, headers={"Authorization": f"Bearer {token}"})
        student_id = student_resp.json()["data"]["id"]

        for i in range(3):
            await client.post("/api/v1/portfolios", json={
                "student_id": student_id,
                "type": "work",
                "title": f"Pagination Portfolio {i}",
            }, headers={"Authorization": f"Bearer {token}"})

        response = await client.get("/api/v1/portfolios", params={
            "page": 1,
            "page_size": 2,
        }, headers={"Authorization": f"Bearer {token}"})

        assert response.status_code == 200
        data = response.json()
        assert data["page"] == 1
        assert data["page_size"] == 2
        assert len(data["data"]) <= 2
        assert data["pages"] >= 2


class TestPortfolioEdgeCases:
    @pytest.mark.asyncio
    async def test_get_nonexistent_portfolio(self, client, test_user):
        login_resp = await client.post("/api/v1/auth/login", json={
            "username": "testuser",
            "password": "TestPass123!",
        })
        token = login_resp.json()["token"]["access_token"]

        response = await client.get("/api/v1/portfolios/nonexistent-id", headers={
            "Authorization": f"Bearer {token}",
        })
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_nonexistent_portfolio(self, client, test_user):
        login_resp = await client.post("/api/v1/auth/login", json={
            "username": "testuser",
            "password": "TestPass123!",
        })
        token = login_resp.json()["token"]["access_token"]

        response = await client.put("/api/v1/portfolios/nonexistent-id", json={
            "title": "Updated",
        }, headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_nonexistent_portfolio(self, client, test_user):
        login_resp = await client.post("/api/v1/auth/login", json={
            "username": "testuser",
            "password": "TestPass123!",
        })
        token = login_resp.json()["token"]["access_token"]

        response = await client.delete("/api/v1/portfolios/nonexistent-id", headers={
            "Authorization": f"Bearer {token}",
        })
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_create_portfolio_without_auth(self, client):
        response = await client.post("/api/v1/portfolios", json={
            "student_id": "nonexistent-student-id",
            "type": "work",
            "title": "No Auth Portfolio",
        })
        assert response.status_code == 401

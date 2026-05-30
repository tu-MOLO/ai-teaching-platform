import pytest


class TestLessonPlanAPI:
    @pytest.mark.asyncio
    async def test_create_lesson_plan(self, client, test_user):
        login_resp = await client.post("/api/v1/auth/login", json={
            "username": "testuser",
            "password": "TestPass123!",
        })
        token = login_resp.json()["token"]["access_token"]

        response = await client.post("/api/v1/lesson-plans", json={
            "title": "Unit 1: Introduction to Algebra",
            "subject": "Math",
            "grade": "Grade 7",
            "duration": 45,
            "teaching_objectives": "Understand basic algebraic expressions",
            "teaching_content": "Variables, constants, and simple equations",
        }, headers={"Authorization": f"Bearer {token}"})

        assert response.status_code == 201
        data = response.json()["data"]
        assert data["title"] == "Unit 1: Introduction to Algebra"
        assert data["subject"] == "Math"
        assert data["grade"] == "Grade 7"
        assert data["duration"] == 45
        assert data["status"] == "draft"
        assert "id" in data
        assert "created_at" in data
        assert "updated_at" in data

    @pytest.mark.asyncio
    async def test_get_lesson_plans(self, client, test_user):
        login_resp = await client.post("/api/v1/auth/login", json={
            "username": "testuser",
            "password": "TestPass123!",
        })
        token = login_resp.json()["token"]["access_token"]

        await client.post("/api/v1/lesson-plans", json={
            "title": "Plan A",
            "subject": "English",
            "grade": "Grade 8",
            "duration": 40,
        }, headers={"Authorization": f"Bearer {token}"})

        await client.post("/api/v1/lesson-plans", json={
            "title": "Plan B",
            "subject": "Science",
            "grade": "Grade 9",
            "duration": 50,
        }, headers={"Authorization": f"Bearer {token}"})

        response = await client.get("/api/v1/lesson-plans", headers={
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
    async def test_get_lesson_plan(self, client, test_user):
        login_resp = await client.post("/api/v1/auth/login", json={
            "username": "testuser",
            "password": "TestPass123!",
        })
        token = login_resp.json()["token"]["access_token"]

        create_resp = await client.post("/api/v1/lesson-plans", json={
            "title": "Physics: Newton's Laws",
            "subject": "Physics",
            "grade": "Grade 10",
            "duration": 60,
        }, headers={"Authorization": f"Bearer {token}"})
        plan_id = create_resp.json()["data"]["id"]

        response = await client.get(f"/api/v1/lesson-plans/{plan_id}", headers={
            "Authorization": f"Bearer {token}",
        })

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["id"] == plan_id
        assert data["title"] == "Physics: Newton's Laws"
        assert data["subject"] == "Physics"
        assert data["grade"] == "Grade 10"

    @pytest.mark.asyncio
    async def test_update_lesson_plan(self, client, test_user):
        login_resp = await client.post("/api/v1/auth/login", json={
            "username": "testuser",
            "password": "TestPass123!",
        })
        token = login_resp.json()["token"]["access_token"]

        create_resp = await client.post("/api/v1/lesson-plans", json={
            "title": "Original Plan",
            "subject": "History",
            "grade": "Grade 8",
            "duration": 35,
        }, headers={"Authorization": f"Bearer {token}"})
        plan_id = create_resp.json()["data"]["id"]

        response = await client.put(f"/api/v1/lesson-plans/{plan_id}", json={
            "title": "Updated History Plan",
            "duration": 45,
            "teaching_objectives": "Understand ancient civilizations",
        }, headers={"Authorization": f"Bearer {token}"})

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["id"] == plan_id
        assert data["title"] == "Updated History Plan"
        assert data["duration"] == 45
        assert data["teaching_objectives"] == "Understand ancient civilizations"

    @pytest.mark.asyncio
    async def test_publish_lesson_plan(self, client, test_user):
        login_resp = await client.post("/api/v1/auth/login", json={
            "username": "testuser",
            "password": "TestPass123!",
        })
        token = login_resp.json()["token"]["access_token"]

        create_resp = await client.post("/api/v1/lesson-plans", json={
            "title": "Plan to Publish",
            "subject": "Geography",
            "grade": "Grade 6",
            "duration": 40,
        }, headers={"Authorization": f"Bearer {token}"})
        plan_id = create_resp.json()["data"]["id"]

        response = await client.post(f"/api/v1/lesson-plans/{plan_id}/publish", headers={
            "Authorization": f"Bearer {token}",
        })

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["id"] == plan_id
        assert data["status"] == "published"

    @pytest.mark.asyncio
    async def test_unpublish_lesson_plan(self, client, test_user):
        login_resp = await client.post("/api/v1/auth/login", json={
            "username": "testuser",
            "password": "TestPass123!",
        })
        token = login_resp.json()["token"]["access_token"]

        create_resp = await client.post("/api/v1/lesson-plans", json={
            "title": "Plan to Unpublish",
            "subject": "Art",
            "grade": "Grade 5",
            "duration": 30,
        }, headers={"Authorization": f"Bearer {token}"})
        plan_id = create_resp.json()["data"]["id"]

        await client.post(f"/api/v1/lesson-plans/{plan_id}/publish", headers={
            "Authorization": f"Bearer {token}",
        })

        response = await client.post(f"/api/v1/lesson-plans/{plan_id}/unpublish", headers={
            "Authorization": f"Bearer {token}",
        })

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["id"] == plan_id
        assert data["status"] == "draft"

    @pytest.mark.asyncio
    async def test_archive_lesson_plan(self, client, test_user):
        login_resp = await client.post("/api/v1/auth/login", json={
            "username": "testuser",
            "password": "TestPass123!",
        })
        token = login_resp.json()["token"]["access_token"]

        create_resp = await client.post("/api/v1/lesson-plans", json={
            "title": "Plan to Archive",
            "subject": "Music",
            "grade": "Grade 4",
            "duration": 25,
        }, headers={"Authorization": f"Bearer {token}"})
        plan_id = create_resp.json()["data"]["id"]

        response = await client.post(f"/api/v1/lesson-plans/{plan_id}/archive", headers={
            "Authorization": f"Bearer {token}",
        })

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["id"] == plan_id
        assert data["status"] == "archived"

    @pytest.mark.asyncio
    async def test_delete_lesson_plan(self, client, test_user):
        login_resp = await client.post("/api/v1/auth/login", json={
            "username": "testuser",
            "password": "TestPass123!",
        })
        token = login_resp.json()["token"]["access_token"]

        create_resp = await client.post("/api/v1/lesson-plans", json={
            "title": "Plan to Delete",
            "subject": "PE",
            "grade": "Grade 7",
            "duration": 30,
        }, headers={"Authorization": f"Bearer {token}"})
        plan_id = create_resp.json()["data"]["id"]

        response = await client.delete(f"/api/v1/lesson-plans/{plan_id}", headers={
            "Authorization": f"Bearer {token}",
        })

        assert response.status_code == 204

        get_resp = await client.get(f"/api/v1/lesson-plans/{plan_id}", headers={
            "Authorization": f"Bearer {token}",
        })
        assert get_resp.status_code == 404


class TestLessonPlanFiltering:
    @pytest.mark.asyncio
    async def test_filter_lesson_plans_by_subject(self, client, test_user):
        login_resp = await client.post("/api/v1/auth/login", json={
            "username": "testuser",
            "password": "TestPass123!",
        })
        token = login_resp.json()["token"]["access_token"]

        await client.post("/api/v1/lesson-plans", json={
            "title": "Math Plan",
            "subject": "Math",
            "grade": "Grade 7",
            "duration": 40,
        }, headers={"Authorization": f"Bearer {token}"})

        await client.post("/api/v1/lesson-plans", json={
            "title": "English Plan",
            "subject": "English",
            "grade": "Grade 8",
            "duration": 45,
        }, headers={"Authorization": f"Bearer {token}"})

        response = await client.get("/api/v1/lesson-plans", params={
            "search": "Math",
        }, headers={"Authorization": f"Bearer {token}"})

        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1
        for plan in data["data"]:
            assert "Math" in plan["title"] or "Math" in plan["subject"]

    @pytest.mark.asyncio
    async def test_lesson_plan_pagination(self, client, test_user):
        login_resp = await client.post("/api/v1/auth/login", json={
            "username": "testuser",
            "password": "TestPass123!",
        })
        token = login_resp.json()["token"]["access_token"]

        for i in range(3):
            await client.post("/api/v1/lesson-plans", json={
                "title": f"Pagination Plan {i}",
                "subject": "Art",
                "grade": "Grade 5",
                "duration": 30,
            }, headers={"Authorization": f"Bearer {token}"})

        response = await client.get("/api/v1/lesson-plans", params={
            "page": 1,
            "page_size": 2,
        }, headers={"Authorization": f"Bearer {token}"})

        assert response.status_code == 200
        data = response.json()
        assert data["page"] == 1
        assert data["page_size"] == 2
        assert len(data["data"]) <= 2
        assert data["pages"] >= 2


class TestLessonPlanStateTransitions:
    @pytest.mark.asyncio
    async def test_publish_already_published_plan(self, client, test_user):
        login_resp = await client.post("/api/v1/auth/login", json={
            "username": "testuser",
            "password": "TestPass123!",
        })
        token = login_resp.json()["token"]["access_token"]

        create_resp = await client.post("/api/v1/lesson-plans", json={
            "title": "Already Published",
            "subject": "Geography",
            "grade": "Grade 6",
            "duration": 40,
        }, headers={"Authorization": f"Bearer {token}"})
        plan_id = create_resp.json()["data"]["id"]

        await client.post(f"/api/v1/lesson-plans/{plan_id}/publish", headers={
            "Authorization": f"Bearer {token}",
        })

        response = await client.post(f"/api/v1/lesson-plans/{plan_id}/publish", headers={
            "Authorization": f"Bearer {token}",
        })

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["status"] == "published"

    @pytest.mark.asyncio
    async def test_unpublish_draft_plan(self, client, test_user):
        login_resp = await client.post("/api/v1/auth/login", json={
            "username": "testuser",
            "password": "TestPass123!",
        })
        token = login_resp.json()["token"]["access_token"]

        create_resp = await client.post("/api/v1/lesson-plans", json={
            "title": "Draft Plan",
            "subject": "Music",
            "grade": "Grade 4",
            "duration": 25,
        }, headers={"Authorization": f"Bearer {token}"})
        plan_id = create_resp.json()["data"]["id"]

        response = await client.post(f"/api/v1/lesson-plans/{plan_id}/unpublish", headers={
            "Authorization": f"Bearer {token}",
        })

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["status"] == "draft"


class TestLessonPlanEdgeCases:
    @pytest.mark.asyncio
    async def test_get_nonexistent_lesson_plan(self, client, test_user):
        login_resp = await client.post("/api/v1/auth/login", json={
            "username": "testuser",
            "password": "TestPass123!",
        })
        token = login_resp.json()["token"]["access_token"]

        response = await client.get("/api/v1/lesson-plans/nonexistent-id", headers={
            "Authorization": f"Bearer {token}",
        })
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_nonexistent_lesson_plan(self, client, test_user):
        login_resp = await client.post("/api/v1/auth/login", json={
            "username": "testuser",
            "password": "TestPass123!",
        })
        token = login_resp.json()["token"]["access_token"]

        response = await client.put("/api/v1/lesson-plans/nonexistent-id", json={
            "title": "Updated",
        }, headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_nonexistent_lesson_plan(self, client, test_user):
        login_resp = await client.post("/api/v1/auth/login", json={
            "username": "testuser",
            "password": "TestPass123!",
        })
        token = login_resp.json()["token"]["access_token"]

        response = await client.delete("/api/v1/lesson-plans/nonexistent-id", headers={
            "Authorization": f"Bearer {token}",
        })
        assert response.status_code == 404
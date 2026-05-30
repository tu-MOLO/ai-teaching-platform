import pytest
import pytest_asyncio

from app.models.lesson_template import LessonTemplate


@pytest_asyncio.fixture(scope="function")
async def seed_templates(db_session):
    templates = []
    for i in range(3):
        t = LessonTemplate(
            name=f"模板{i}",
            description=f"模板描述{i}",
            structure='{"sections": []}',
            is_default=(i == 0),
        )
        db_session.add(t)
        templates.append(t)
    await db_session.commit()
    for t in templates:
        await db_session.refresh(t)
    return templates


class TestLessonTemplateAPI:
    @pytest.mark.asyncio
    async def test_list_templates_empty(self, client, test_user, auth_headers):
        response = await client.get("/api/v1/lesson-templates", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0
        assert data["data"] == []

    @pytest.mark.asyncio
    async def test_list_templates_with_data(self, client, test_user, auth_headers, seed_templates):
        response = await client.get("/api/v1/lesson-templates", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 3
        assert len(data["data"]) == 3

    @pytest.mark.asyncio
    async def test_list_templates_pagination(self, client, test_user, auth_headers, seed_templates):
        response = await client.get("/api/v1/lesson-templates?page=1&page_size=2", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data["data"]) == 2
        assert data["total"] == 3
        assert data["pages"] == 2
        assert data["page"] == 1

    @pytest.mark.asyncio
    async def test_get_template_detail(self, client, test_user, auth_headers, seed_templates):
        template_id = seed_templates[0].id
        response = await client.get(f"/api/v1/lesson-templates/{template_id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["id"] == template_id
        assert data["name"] == "模板0"
        assert data["is_default"] is True

    @pytest.mark.asyncio
    async def test_get_template_not_found(self, client, test_user, auth_headers):
        response = await client.get("/api/v1/lesson-templates/nonexistent-id", headers=auth_headers)
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_template_has_structure_field(self, client, test_user, auth_headers, seed_templates):
        template_id = seed_templates[1].id
        response = await client.get(f"/api/v1/lesson-templates/{template_id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()["data"]
        assert "structure" in data
        assert data["structure"] == '{"sections": []}'

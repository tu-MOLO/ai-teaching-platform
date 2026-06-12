import pytest


class TestReportAPI:
    @pytest.mark.asyncio
    async def test_get_dashboard(self, client, test_user, auth_headers):
        response = await client.get("/api/v1/reports/dashboard", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()["data"]
        assert "totalCourses" in data
        assert "totalStudents" in data

    @pytest.mark.asyncio
    async def test_get_course_statistics(self, client, test_user, auth_headers):
        response = await client.get("/api/v1/reports/courses", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()["data"]
        assert isinstance(data, dict)

    @pytest.mark.asyncio
    async def test_get_student_statistics(self, client, test_user, auth_headers):
        response = await client.get("/api/v1/reports/students", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()["data"]
        assert isinstance(data, dict)

    @pytest.mark.asyncio
    async def test_get_monthly_trends_default(self, client, test_user, auth_headers):
        response = await client.get("/api/v1/reports/trends", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()["data"]
        assert isinstance(data, list)

    @pytest.mark.asyncio
    async def test_get_monthly_trends_with_months(self, client, test_user, auth_headers):
        response = await client.get("/api/v1/reports/trends?months=3", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()["data"]
        assert isinstance(data, list)

    @pytest.mark.asyncio
    async def test_get_monthly_trends_invalid_months(self, client, test_user, auth_headers):
        response = await client.get("/api/v1/reports/trends?months=0", headers=auth_headers)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_get_monthly_trends_months_too_large(self, client, test_user, auth_headers):
        response = await client.get("/api/v1/reports/trends?months=13", headers=auth_headers)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_reports_require_auth(self, client):
        response = await client.get("/api/v1/reports/dashboard")
        assert response.status_code == 401

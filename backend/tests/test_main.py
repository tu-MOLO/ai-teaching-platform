import pytest
from fastapi import FastAPI

from app.main import create_application, register_routers, register_exception_handlers
from app.core.exceptions import BusinessException, ErrorCode


class TestCreateApplication:
    def test_returns_fastapi_app(self):
        app = create_application()
        assert isinstance(app, FastAPI)

    def test_app_has_title(self):
        app = create_application()
        assert app.title is not None
        assert len(app.title) > 0

    def test_app_has_version(self):
        app = create_application()
        assert app.version is not None


class TestRegisterRouters:
    def test_health_endpoint_registered(self):
        app = create_application()
        routes = [route.path for route in app.routes]
        assert "/health" in routes

    def test_root_endpoint_registered(self):
        app = create_application()
        routes = [route.path for route in app.routes]
        assert "/" in routes

    def test_api_router_registered(self):
        app = create_application()
        routes = [route.path for route in app.routes]
        api_routes = [r for r in routes if r.startswith("/api/v1")]
        assert len(api_routes) > 0


class TestExceptionHandlers:
    @pytest.mark.asyncio
    async def test_business_exception_handler(self, client, db_session):
        from fastapi import Request
        from fastapi.responses import JSONResponse

        app = create_application()
        register_exception_handlers(app)

        exc = BusinessException(
            error_code=ErrorCode.INVALID_PARAMETER,
            message="参数无效",
            status_code=400,
        )

        handler = None
        for handler_key in app.exception_handlers:
            if handler_key is BusinessException:
                handler = app.exception_handlers[handler_key]
                break

        assert handler is not None

    @pytest.mark.asyncio
    async def test_health_endpoint(self, client):
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "checks" in data

    @pytest.mark.asyncio
    async def test_root_endpoint(self, client):
        response = await client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "name" in data
        assert "version" in data

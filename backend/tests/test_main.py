import pytest
from fastapi import FastAPI

from app.core.exceptions import BusinessException
from app.main import create_application, register_exception_handlers


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


def _collect_route_paths(app: FastAPI) -> list[str]:
    """Recursively collect route paths from app.routes, handling _IncludedRouter objects."""

    def _recurse(routes, prefix: str = "") -> list[str]:
        paths: list[str] = []
        for route in routes:
            route_type = type(route).__name__
            if hasattr(route, "path"):
                paths.append(prefix + route.path)
            elif route_type == "_IncludedRouter":
                ctx = getattr(route, "include_context", None)
                sub_prefix = getattr(ctx, "prefix", "") if ctx else ""
                sub_router = getattr(route, "original_router", None)
                if sub_router and hasattr(sub_router, "routes"):
                    paths.extend(_recurse(sub_router.routes, prefix + sub_prefix))
        return paths

    return _recurse(app.routes)


class TestRegisterRouters:
    def test_health_endpoint_registered(self):
        app = create_application()
        routes = _collect_route_paths(app)
        assert "/health" in routes

    def test_root_endpoint_registered(self):
        app = create_application()
        routes = _collect_route_paths(app)
        assert "/" in routes

    def test_api_router_registered(self):
        app = create_application()
        routes = _collect_route_paths(app)
        api_routes = [r for r in routes if r.startswith("/api/v1")]
        assert len(api_routes) > 0


class TestExceptionHandlers:
    @pytest.mark.asyncio
    async def test_business_exception_handler(self, client, db_session):
        pass

        app = create_application()
        register_exception_handlers(app)

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

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import FastAPI, HTTPException
from httpx import ASGITransport, AsyncClient

from app.core.exceptions import BusinessException, ErrorCode
from app.main import create_application


class TestCreateApplication:
    def test_returns_fastapi_instance(self):
        app = create_application()
        assert isinstance(app, FastAPI)

    def test_app_title_matches_settings(self):
        app = create_application()
        assert app.title == "AI Teaching Platform"

    def test_app_has_lifespan(self):
        app = create_application()
        assert app.router.lifespan_context is not None


class TestHealthEndpoint:
    @pytest.mark.asyncio
    async def test_health_returns_healthy(self, client):
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["app"] == "AI Teaching Platform"
        assert "version" in data
        assert "timestamp" in data
        assert "checks" in data

    @pytest.mark.asyncio
    async def test_health_database_check(self, client):
        response = await client.get("/health")
        data = response.json()
        assert "database" in data["checks"]

    @pytest.mark.asyncio
    async def test_health_cache_check(self, client):
        response = await client.get("/health")
        data = response.json()
        assert "cache" in data["checks"]


class TestRootEndpoint:
    @pytest.mark.asyncio
    async def test_root_returns_api_info(self, client):
        response = await client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "AI Teaching Platform"
        assert "version" in data
        assert "api_prefix" in data
        assert data["health_check"] == "/health"


class TestDetailedHealthEndpoint:
    @pytest.mark.asyncio
    async def test_detailed_health_in_debug(self, client):
        response = await client.get("/health/detailed")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "environment" in data
        assert "configuration" in data


class TestCORSMiddleware:
    @pytest.mark.asyncio
    async def test_cors_headers_in_debug_mode(self, client):
        response = await client.options(
            "/health",
            headers={
                "Origin": "http://localhost:5173/",
                "Access-Control-Request-Method": "GET",
            },
        )
        assert response.status_code == 200
        assert "access-control-allow-origin" in response.headers

    @pytest.mark.asyncio
    async def test_cors_production_mode(self):
        with patch("app.main.settings") as mock_settings:
            mock_settings.DEBUG = False
            mock_settings.APP_NAME = "AI Teaching Platform"
            mock_settings.APP_VERSION = "1.0.0"
            mock_settings.BACKEND_CORS_ORIGINS = ["https://example.com"]
            mock_settings.MAX_UPLOAD_SIZE = 100 * 1024 * 1024
            mock_settings.API_V1_STR = "/api/v1"

            app = create_application()
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                response = await ac.options(
                    "/health",
                    headers={
                        "Origin": "https://example.com",
                        "Access-Control-Request-Method": "GET",
                    },
                )
                assert "access-control-allow-origin" in response.headers


class TestSecurityHeaders:
    @pytest.mark.asyncio
    async def test_security_headers_present(self, client):
        response = await client.get("/health")
        assert response.headers.get("x-content-type-options") == "nosniff"
        assert response.headers.get("x-frame-options") == "DENY"
        assert response.headers.get("x-xss-protection") == "1; mode=block"


class TestBodySizeMiddleware:
    @pytest.mark.asyncio
    async def test_rejects_oversized_body(self):
        with patch("app.main.settings") as mock_settings:
            mock_settings.DEBUG = True
            mock_settings.APP_NAME = "AI Teaching Platform"
            mock_settings.APP_VERSION = "1.0.0"
            mock_settings.BACKEND_CORS_ORIGINS = []
            mock_settings.MAX_UPLOAD_SIZE = 100
            mock_settings.API_V1_STR = "/api/v1"

            app = create_application()
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                response = await ac.post(
                    "/api/v1/auth/login",
                    content="x" * 200,
                    headers={
                        "Content-Type": "application/json",
                        "Content-Length": "200",
                    },
                )
                assert response.status_code == 413


class TestExceptionHandlers:
    @pytest.mark.asyncio
    async def test_business_exception_handler(self, test_app):
        @test_app.get("/test-business-exception")
        async def raise_business():
            raise BusinessException(
                error_code=ErrorCode.INVALID_PARAMETER,
                message="参数无效",
                status_code=400,
            )

        transport = ASGITransport(app=test_app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.get("/test-business-exception")
            assert response.status_code == 400
            data = response.json()
            assert "error" in data
            assert "request_id" in data

    @pytest.mark.asyncio
    async def test_business_exception_with_details(self, test_app):
        @test_app.get("/test-business-exception-details")
        async def raise_business_with_details():
            raise BusinessException(
                error_code=ErrorCode.DATA_VALIDATION_ERROR,
                message="验证失败",
                status_code=422,
                details={"field": "email", "reason": "格式错误"},
            )

        transport = ASGITransport(app=test_app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.get("/test-business-exception-details")
            assert response.status_code == 422
            data = response.json()
            assert "details" in data
            assert data["details"]["field"] == "email"

    @pytest.mark.asyncio
    async def test_http_exception_handler(self, test_app):
        @test_app.get("/test-http-exception")
        async def raise_http():
            raise HTTPException(status_code=404, detail="Not found")

        transport = ASGITransport(app=test_app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.get("/test-http-exception")
            assert response.status_code == 404
            data = response.json()
            assert "error" in data
            assert "request_id" in data

    @pytest.mark.asyncio
    async def test_http_500_exception_masked_in_production(self):
        with patch("app.main.settings") as mock_settings:
            mock_settings.DEBUG = False
            mock_settings.APP_NAME = "AI Teaching Platform"
            mock_settings.APP_VERSION = "1.0.0"
            mock_settings.BACKEND_CORS_ORIGINS = []
            mock_settings.MAX_UPLOAD_SIZE = 100 * 1024 * 1024
            mock_settings.API_V1_STR = "/api/v1"

            app = create_application()

            @app.get("/test-500-masked")
            async def raise_500():
                raise HTTPException(status_code=500, detail="Internal DB connection string")

            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                response = await ac.get("/test-500-masked")
                assert response.status_code == 500
                data = response.json()
                assert data["message"] == "服务器内部错误"

    @pytest.mark.asyncio
    async def test_general_exception_handler(self, test_app):
        handler = None
        for handler_key in test_app.exception_handlers:
            if handler_key is Exception:
                handler = test_app.exception_handlers[handler_key]
                break

        assert handler is not None

        mock_request = MagicMock()
        exc = RuntimeError("Unexpected error")
        response = await handler(mock_request, exc)
        assert response.status_code == 500
        data = response.body.decode()
        import json

        parsed = json.loads(data)
        assert "error" in parsed
        assert "request_id" in parsed

    @pytest.mark.asyncio
    async def test_validation_exception_handler(self, test_app):
        from pydantic import BaseModel

        class TestModel(BaseModel):
            name: str
            age: int

        @test_app.post("/test-validation-error")
        async def validation_endpoint(data: TestModel):
            return data

        transport = ASGITransport(app=test_app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.post(
                "/test-validation-error",
                json={"name": "test"},
            )
            assert response.status_code == 422
            data = response.json()
            assert "errors" in data
            assert "request_id" in data


class TestLifespan:
    @pytest.mark.asyncio
    async def test_startup_initializes_rate_limiter(self):
        from app.main import lifespan

        with patch("app.main.init_rate_limiter") as mock_init:
            with patch("app.main.setup_soft_delete_filter") as mock_soft_delete:
                with patch("app.core.config.settings") as mock_settings:
                    mock_settings.DEBUG = True
                    mock_settings.APP_NAME = "AI Teaching Platform"
                    mock_settings.APP_VERSION = "1.0.0"
                    mock_settings.REDIS_URL = None

                    app = create_application()
                    async with lifespan(app):
                        pass

                    mock_init.assert_called_once()
                    mock_soft_delete.assert_called_once()

    @pytest.mark.asyncio
    async def test_shutdown_closes_database(self):
        from app.main import lifespan

        with patch("app.main.close_db", new_callable=AsyncMock) as mock_close:
            with patch("app.main.init_rate_limiter"):
                with patch("app.main.setup_soft_delete_filter"):
                    with patch("app.core.config.settings") as mock_settings:
                        mock_settings.DEBUG = True
                        mock_settings.APP_NAME = "AI Teaching Platform"
                        mock_settings.APP_VERSION = "1.0.0"

                        app = create_application()
                        async with lifespan(app):
                            pass

                        mock_close.assert_awaited()


class TestRequireInternalIp:
    @pytest.mark.asyncio
    async def test_allows_in_debug_mode(self):
        from unittest.mock import MagicMock

        from fastapi import Request

        from app.main import require_internal_ip

        with patch("app.main.settings") as mock_settings:
            mock_settings.DEBUG = True
            request = MagicMock(spec=Request)
            result = await require_internal_ip(request)
            assert result is None

    @pytest.mark.asyncio
    async def test_allows_internal_ip(self):
        from unittest.mock import MagicMock

        from fastapi import Request

        from app.main import require_internal_ip

        with patch("app.main.settings") as mock_settings:
            mock_settings.DEBUG = False
            request = MagicMock(spec=Request)
            request.client = MagicMock()
            request.client.host = "192.168.1.1"
            result = await require_internal_ip(request)
            assert result is None

    @pytest.mark.asyncio
    async def test_rejects_external_ip(self):
        from unittest.mock import MagicMock

        from fastapi import Request

        from app.main import require_internal_ip

        with patch("app.main.settings") as mock_settings:
            mock_settings.DEBUG = False
            request = MagicMock(spec=Request)
            request.client = MagicMock()
            request.client.host = "8.8.8.8"
            with pytest.raises(HTTPException) as exc_info:
                await require_internal_ip(request)
            assert exc_info.value.status_code == 403

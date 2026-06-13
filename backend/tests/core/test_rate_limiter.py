from unittest.mock import MagicMock, AsyncMock, patch

import pytest
from fastapi import HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials

from app.core.rate_limiter import (
    RateLimiter,
    RateLimitDependency,
    RedisRateLimiter,
    rate_limit,
    rate_limit_dep,
    init_rate_limiter,
)


@pytest.fixture
def limiter():
    return RateLimiter()


@pytest.fixture
def configured_limiter(limiter):
    limiter.configure("test", requests=3, window=60)
    return limiter


class TestConfigure:
    def test_add_config(self, limiter):
        limiter.configure("login", requests=5, window=60)
        assert "login" in limiter._configs
        assert limiter._configs["login"].requests == 5
        assert limiter._configs["login"].window == 60

    def test_add_config_with_key_func(self, limiter):
        def key_func(req):
            return "custom"
        limiter.configure("custom", requests=10, window=30, key_func=key_func)
        assert limiter._configs["custom"].key_func is key_func

    def test_overwrite_config(self, limiter):
        limiter.configure("login", requests=5, window=60)
        limiter.configure("login", requests=10, window=120)
        assert limiter._configs["login"].requests == 10
        assert limiter._configs["login"].window == 120


class TestIsAllowed:
    def test_under_limit_returns_true(self, configured_limiter):
        allowed, info = configured_limiter.is_allowed("key1", "test")
        assert allowed is True
        assert info["limit"] == 3
        assert info["remaining"] == 2
        assert info["retry_after"] == 0

    def test_over_limit_returns_false(self, configured_limiter):
        for _ in range(3):
            configured_limiter.is_allowed("key1", "test")
        allowed, info = configured_limiter.is_allowed("key1", "test")
        assert allowed is False
        assert info["remaining"] == 0
        assert info["retry_after"] >= 1

    def test_info_dict_contains_expected_keys(self, configured_limiter):
        allowed, info = configured_limiter.is_allowed("key1", "test")
        assert "limit" in info
        assert "remaining" in info
        assert "reset_time" in info
        assert "retry_after" in info

    def test_unknown_config_returns_true(self, limiter):
        allowed, info = limiter.is_allowed("key1", "nonexistent")
        assert allowed is True
        assert info == {}

    def test_remaining_decrements(self, configured_limiter):
        _, info1 = configured_limiter.is_allowed("key1", "test")
        assert info1["remaining"] == 2
        _, info2 = configured_limiter.is_allowed("key1", "test")
        assert info2["remaining"] == 1
        _, info3 = configured_limiter.is_allowed("key1", "test")
        assert info3["remaining"] == 0

    def test_different_keys_independent(self, configured_limiter):
        for _ in range(3):
            configured_limiter.is_allowed("key1", "test")
        allowed, _ = configured_limiter.is_allowed("key2", "test")
        assert allowed is True


class TestReset:
    def test_clears_request_history(self, configured_limiter):
        for _ in range(3):
            configured_limiter.is_allowed("key1", "test")
        configured_limiter.reset("key1")
        allowed, _ = configured_limiter.is_allowed("key1", "test")
        assert allowed is True

    def test_reset_nonexistent_key_no_error(self, limiter):
        limiter.reset("nonexistent_key")


class TestGetClientIp:
    def test_x_forwarded_for(self, limiter):
        request = MagicMock(spec=Request)
        request.headers = {"X-Forwarded-For": "1.2.3.4, 5.6.7.8"}
        request.client = MagicMock()
        request.client.host = "9.9.9.9"
        ip = limiter._get_client_ip(request)
        assert ip == "1.2.3.4"

    def test_x_real_ip(self, limiter):
        request = MagicMock(spec=Request)
        request.headers = {"X-Real-IP": "1.2.3.4"}
        request.client = MagicMock()
        request.client.host = "9.9.9.9"
        ip = limiter._get_client_ip(request)
        assert ip == "1.2.3.4"

    def test_fallback_to_client_host(self, limiter):
        request = MagicMock(spec=Request)
        request.headers = {}
        request.client = MagicMock()
        request.client.host = "9.9.9.9"
        ip = limiter._get_client_ip(request)
        assert ip == "9.9.9.9"

    def test_no_client_returns_unknown(self, limiter):
        request = MagicMock(spec=Request)
        request.headers = {}
        request.client = None
        ip = limiter._get_client_ip(request)
        assert ip == "unknown"

    def test_x_forwarded_for_takes_priority_over_x_real_ip(self, limiter):
        request = MagicMock(spec=Request)
        request.headers = {"X-Forwarded-For": "1.2.3.4", "X-Real-IP": "5.6.7.8"}
        request.client = MagicMock()
        request.client.host = "9.9.9.9"
        ip = limiter._get_client_ip(request)
        assert ip == "1.2.3.4"


class TestGenerateKey:
    def test_with_credentials(self, limiter):
        limiter.configure("test", requests=5, window=60)
        request = MagicMock(spec=Request)
        request.headers = {}
        request.client = MagicMock()
        request.client.host = "1.2.3.4"
        credentials = MagicMock(spec=HTTPAuthorizationCredentials)
        credentials.credentials = "token123"
        key = limiter._generate_key(request, "test", credentials)
        assert key == "test:token123"

    def test_without_credentials(self, limiter):
        limiter.configure("test", requests=5, window=60)
        request = MagicMock(spec=Request)
        request.headers = {}
        request.client = MagicMock()
        request.client.host = "1.2.3.4"
        key = limiter._generate_key(request, "test")
        assert key == "test:1.2.3.4"

    def test_custom_key_func(self, limiter):
        limiter.configure("test", requests=5, window=60, key_func=lambda r: "custom_key")
        request = MagicMock(spec=Request)
        key = limiter._generate_key(request, "test")
        assert key == "custom_key"


class TestRateLimitDependency:
    @pytest.mark.asyncio
    async def test_raises_429_when_over_limit(self):
        limiter = RateLimiter()
        limiter.configure("dep_test", requests=1, window=60)

        import app.core.rate_limiter as rl_module
        original = rl_module.rate_limiter
        rl_module.rate_limiter = limiter

        try:
            dep = RateLimitDependency("dep_test")
            request = MagicMock(spec=Request)
            request.headers = {}
            request.client = MagicMock()
            request.client.host = "1.2.3.4"
            request.state = MagicMock()

            await dep(request)

            with pytest.raises(HTTPException) as exc_info:
                await dep(request)
            assert exc_info.value.status_code == 429
        finally:
            rl_module.rate_limiter = original
            RateLimitDependency._instances.pop("dep_test", None)

    @pytest.mark.asyncio
    async def test_allows_when_under_limit(self):
        limiter = RateLimiter()
        limiter.configure("dep_test2", requests=5, window=60)

        import app.core.rate_limiter as rl_module
        original = rl_module.rate_limiter
        rl_module.rate_limiter = limiter

        try:
            dep = RateLimitDependency("dep_test2")
            request = MagicMock(spec=Request)
            request.headers = {}
            request.client = MagicMock()
            request.client.host = "1.2.3.4"
            request.state = MagicMock()

            await dep(request)
        finally:
            rl_module.rate_limiter = original
            RateLimitDependency._instances.pop("dep_test2", None)

    @pytest.mark.asyncio
    async def test_sets_rate_limit_info_on_request_state(self):
        limiter = RateLimiter()
        limiter.configure("dep_test3", requests=5, window=60)

        import app.core.rate_limiter as rl_module
        original = rl_module.rate_limiter
        rl_module.rate_limiter = limiter

        try:
            dep = RateLimitDependency("dep_test3")
            request = MagicMock(spec=Request)
            request.headers = {}
            request.client = MagicMock()
            request.client.host = "1.2.3.4"
            request.state = MagicMock()

            await dep(request)
            assert request.state.rate_limit_info is not None
        finally:
            rl_module.rate_limiter = original
            RateLimitDependency._instances.pop("dep_test3", None)

    @pytest.mark.asyncio
    async def test_429_headers_contain_rate_limit_info(self):
        limiter = RateLimiter()
        limiter.configure("dep_test4", requests=1, window=60)

        import app.core.rate_limiter as rl_module
        original = rl_module.rate_limiter
        rl_module.rate_limiter = limiter

        try:
            dep = RateLimitDependency("dep_test4")
            request = MagicMock(spec=Request)
            request.headers = {}
            request.client = MagicMock()
            request.client.host = "1.2.3.4"
            request.state = MagicMock()

            await dep(request)

            with pytest.raises(HTTPException) as exc_info:
                await dep(request)
            assert exc_info.value.status_code == 429
            assert "X-RateLimit-Limit" in exc_info.value.headers
            assert "Retry-After" in exc_info.value.headers
        finally:
            rl_module.rate_limiter = original
            RateLimitDependency._instances.pop("dep_test4", None)

    @pytest.mark.asyncio
    async def test_custom_limits(self):
        limiter = RateLimiter()
        limiter.configure("dep_test5", requests=10, window=120)

        import app.core.rate_limiter as rl_module
        original = rl_module.rate_limiter
        rl_module.rate_limiter = limiter

        try:
            dep = RateLimitDependency("dep_test5")
            request = MagicMock(spec=Request)
            request.headers = {}
            request.client = MagicMock()
            request.client.host = "1.2.3.4"
            request.state = MagicMock()

            await dep(request)
            assert request.state.rate_limit_info["limit"] == 10
            assert request.state.rate_limit_info["remaining"] == 9
        finally:
            rl_module.rate_limiter = original
            RateLimitDependency._instances.pop("dep_test5", None)

    @pytest.mark.asyncio
    async def test_singleton_same_config_name(self):
        dep1 = RateLimitDependency("dep_test6")
        dep2 = RateLimitDependency("dep_test6")
        assert dep1 is dep2
        RateLimitDependency._instances.pop("dep_test6", None)

    @pytest.mark.asyncio
    async def test_with_redis_backend(self):
        mock_pipe = MagicMock()
        mock_pipe.execute = AsyncMock(return_value=(0, 0, 1, True))
        mock_pipe.__aenter__ = AsyncMock(return_value=mock_pipe)
        mock_pipe.__aexit__ = AsyncMock(return_value=False)

        mock_redis = MagicMock()
        mock_redis.pipeline = MagicMock(return_value=mock_pipe)

        redis_limiter = RedisRateLimiter(mock_redis)
        redis_limiter.configure("dep_test7", requests=5, window=60)

        import app.core.rate_limiter as rl_module
        original = rl_module.rate_limiter
        rl_module.rate_limiter = redis_limiter

        try:
            dep = RateLimitDependency("dep_test7")
            request = MagicMock(spec=Request)
            request.headers = {}
            request.client = MagicMock()
            request.client.host = "1.2.3.4"
            request.state = MagicMock()

            await dep(request)
            assert request.state.rate_limit_info is not None
        finally:
            rl_module.rate_limiter = original
            RateLimitDependency._instances.pop("dep_test7", None)

    @pytest.mark.asyncio
    async def test_redis_backend_rate_exceeded(self):
        mock_pipe = MagicMock()
        mock_pipe.execute = AsyncMock(return_value=(0, 5, 6, True))
        mock_pipe.__aenter__ = AsyncMock(return_value=mock_pipe)
        mock_pipe.__aexit__ = AsyncMock(return_value=False)

        mock_redis = MagicMock()
        mock_redis.pipeline = MagicMock(return_value=mock_pipe)
        mock_redis.zrange = AsyncMock(return_value=[[b"12345", 12345.0]])

        redis_limiter = RedisRateLimiter(mock_redis)
        redis_limiter.configure("dep_test8", requests=5, window=60)

        import app.core.rate_limiter as rl_module
        original = rl_module.rate_limiter
        rl_module.rate_limiter = redis_limiter

        try:
            dep = RateLimitDependency("dep_test8")
            request = MagicMock(spec=Request)
            request.headers = {}
            request.client = MagicMock()
            request.client.host = "1.2.3.4"
            request.state = MagicMock()

            with pytest.raises(HTTPException) as exc_info:
                await dep(request)
            assert exc_info.value.status_code == 429
        finally:
            rl_module.rate_limiter = original
            RateLimitDependency._instances.pop("dep_test8", None)

    @pytest.mark.asyncio
    async def test_key_generation_uses_client_ip(self):
        limiter = RateLimiter()
        limiter.configure("dep_test9", requests=5, window=60)

        import app.core.rate_limiter as rl_module
        original = rl_module.rate_limiter
        rl_module.rate_limiter = limiter

        try:
            dep = RateLimitDependency("dep_test9")
            request = MagicMock(spec=Request)
            request.headers = {"X-Forwarded-For": "10.0.0.1"}
            request.client = MagicMock()
            request.client.host = "1.2.3.4"
            request.state = MagicMock()

            await dep(request)
            assert "dep_test9:10.0.0.1" in limiter._requests
        finally:
            rl_module.rate_limiter = original
            RateLimitDependency._instances.pop("dep_test9", None)


class TestRedisRateLimiter:
    def test_init_stores_redis_client(self):
        mock_redis = MagicMock()
        limiter = RedisRateLimiter(mock_redis)
        assert limiter.redis is mock_redis

    @pytest.mark.asyncio
    async def test_is_allowed_async_under_limit(self):
        mock_pipe = MagicMock()
        mock_pipe.execute = AsyncMock(return_value=(0, 0, 1, True))
        mock_pipe.__aenter__ = AsyncMock(return_value=mock_pipe)
        mock_pipe.__aexit__ = AsyncMock(return_value=False)

        mock_redis = MagicMock()
        mock_redis.pipeline = MagicMock(return_value=mock_pipe)

        limiter = RedisRateLimiter(mock_redis)
        limiter.configure("test", requests=5, window=60)

        allowed, info = await limiter.is_allowed_async("test:key1", "test")
        assert allowed is True
        assert info["limit"] == 5
        assert info["remaining"] == 4
        assert info["retry_after"] == 0

    @pytest.mark.asyncio
    async def test_is_allowed_async_over_limit(self):
        mock_pipe = MagicMock()
        mock_pipe.execute = AsyncMock(return_value=(0, 5, 6, True))
        mock_pipe.__aenter__ = AsyncMock(return_value=mock_pipe)
        mock_pipe.__aexit__ = AsyncMock(return_value=False)

        mock_redis = MagicMock()
        mock_redis.pipeline = MagicMock(return_value=mock_pipe)
        mock_redis.zrange = AsyncMock(return_value=[[b"12345", 12345.0]])

        limiter = RedisRateLimiter(mock_redis)
        limiter.configure("test", requests=5, window=60)

        allowed, info = await limiter.is_allowed_async("test:key1", "test")
        assert allowed is False
        assert info["remaining"] == 0
        assert info["retry_after"] >= 1

    @pytest.mark.asyncio
    async def test_is_allowed_async_unknown_config(self):
        mock_redis = MagicMock()
        limiter = RedisRateLimiter(mock_redis)

        allowed, info = await limiter.is_allowed_async("test:key1", "nonexistent")
        assert allowed is True
        assert info == {}

    @pytest.mark.asyncio
    async def test_is_allowed_async_fallback_on_exception(self):
        mock_pipe = MagicMock()
        mock_pipe.execute = AsyncMock(side_effect=Exception("Redis error"))
        mock_pipe.__aenter__ = AsyncMock(return_value=mock_pipe)
        mock_pipe.__aexit__ = AsyncMock(return_value=False)

        mock_redis = MagicMock()
        mock_redis.pipeline = MagicMock(return_value=mock_pipe)

        limiter = RedisRateLimiter(mock_redis)
        limiter.configure("test", requests=5, window=60)

        allowed, info = await limiter.is_allowed_async("test:key1", "test")
        assert allowed is True
        assert info["limit"] == 5

    @pytest.mark.asyncio
    async def test_is_allowed_async_over_limit_empty_zrange(self):
        mock_pipe = MagicMock()
        mock_pipe.execute = AsyncMock(return_value=(0, 5, 6, True))
        mock_pipe.__aenter__ = AsyncMock(return_value=mock_pipe)
        mock_pipe.__aexit__ = AsyncMock(return_value=False)

        mock_redis = MagicMock()
        mock_redis.pipeline = MagicMock(return_value=mock_pipe)
        mock_redis.zrange = AsyncMock(return_value=[])

        limiter = RedisRateLimiter(mock_redis)
        limiter.configure("test", requests=5, window=60)

        allowed, info = await limiter.is_allowed_async("test:key1", "test")
        assert allowed is False
        assert info["retry_after"] >= 1


class TestRateLimitDecorator:
    @pytest.mark.asyncio
    async def test_allows_under_limit(self):
        limiter = RateLimiter()
        limiter.configure("decorator_test", requests=5, window=60)

        import app.core.rate_limiter as rl_module
        original = rl_module.rate_limiter
        rl_module.rate_limiter = limiter

        try:
            @rate_limit("decorator_test")
            async def my_view(request: Request):
                return "ok"

            mock_req = MagicMock()
            mock_req.headers = {}
            mock_req.client = MagicMock()
            mock_req.client.host = "1.2.3.4"
            mock_req.state = MagicMock()

            result = await my_view(request=mock_req)
            assert result == "ok"
        finally:
            rl_module.rate_limiter = original

    @pytest.mark.asyncio
    async def test_raises_429_over_limit(self):
        limiter = RateLimiter()
        limiter.configure("decorator_test2", requests=1, window=60)

        import app.core.rate_limiter as rl_module
        original = rl_module.rate_limiter
        rl_module.rate_limiter = limiter

        try:
            @rate_limit("decorator_test2")
            async def my_view(request: Request):
                return "ok"

            mock_req = MagicMock()
            mock_req.headers = {}
            mock_req.client = MagicMock()
            mock_req.client.host = "1.2.3.4"
            mock_req.state = MagicMock()

            await my_view(request=mock_req)

            with pytest.raises(HTTPException) as exc_info:
                await my_view(request=mock_req)
            assert exc_info.value.status_code == 429
        finally:
            rl_module.rate_limiter = original

    @pytest.mark.asyncio
    async def test_raises_500_without_request(self):
        limiter = RateLimiter()
        limiter.configure("decorator_test3", requests=5, window=60)

        import app.core.rate_limiter as rl_module
        original = rl_module.rate_limiter
        rl_module.rate_limiter = limiter

        try:
            @rate_limit("decorator_test3")
            async def my_view():
                return "ok"

            with pytest.raises(HTTPException) as exc_info:
                await my_view()
            assert exc_info.value.status_code == 500
        finally:
            rl_module.rate_limiter = original

    @pytest.mark.asyncio
    async def test_finds_request_in_kwargs(self):
        limiter = RateLimiter()
        limiter.configure("decorator_test4", requests=5, window=60)

        import app.core.rate_limiter as rl_module
        original = rl_module.rate_limiter
        rl_module.rate_limiter = limiter

        try:
            @rate_limit("decorator_test4")
            async def my_view(request: Request):
                return "ok"

            mock_req = MagicMock()
            mock_req.headers = {}
            mock_req.client = MagicMock()
            mock_req.client.host = "1.2.3.4"
            mock_req.state = MagicMock()

            result = await my_view(request=mock_req)
            assert result == "ok"
        finally:
            rl_module.rate_limiter = original

    @pytest.mark.asyncio
    async def test_sets_rate_limit_info_on_request_state(self):
        limiter = RateLimiter()
        limiter.configure("decorator_test5", requests=5, window=60)

        import app.core.rate_limiter as rl_module
        original = rl_module.rate_limiter
        rl_module.rate_limiter = limiter

        try:
            @rate_limit("decorator_test5")
            async def my_view(request: Request):
                return "ok"

            mock_req = MagicMock()
            mock_req.headers = {}
            mock_req.client = MagicMock()
            mock_req.client.host = "1.2.3.4"
            mock_req.state = MagicMock()

            await my_view(request=mock_req)
            assert mock_req.state.rate_limit_info is not None
        finally:
            rl_module.rate_limiter = original


class TestRateLimitDep:
    def test_returns_dependency_instance(self):
        dep = rate_limit_dep("test_dep_func")
        assert isinstance(dep, RateLimitDependency)
        assert dep.config_name == "test_dep_func"
        RateLimitDependency._instances.pop("test_dep_func", None)


class TestInitRateLimiter:
    def test_fallback_to_memory_when_no_redis(self):
        import app.core.rate_limiter as rl_module
        original = rl_module.rate_limiter

        with patch("app.core.config.settings") as mock_settings:
            mock_settings.REDIS_URL = None
            rl_module.rate_limiter = RateLimiter()
            init_rate_limiter()
            assert isinstance(rl_module.rate_limiter, RateLimiter)
            assert "login" in rl_module.rate_limiter._configs
            assert rl_module.rate_limiter._configs["login"].requests == 5

        rl_module.rate_limiter = original

    def test_configs_are_applied(self):
        import app.core.rate_limiter as rl_module
        original = rl_module.rate_limiter

        rl_module.rate_limiter = RateLimiter()
        init_rate_limiter()

        assert rl_module.rate_limiter._configs["login"].requests == 5
        assert rl_module.rate_limiter._configs["register"].requests == 3
        assert rl_module.rate_limiter._configs["password_reset"].requests == 3
        assert rl_module.rate_limiter._configs["api"].requests == 100
        assert rl_module.rate_limiter._configs["strict"].requests == 10

        rl_module.rate_limiter = original

    def test_redis_init_when_url_set(self):
        import app.core.rate_limiter as rl_module
        original = rl_module.rate_limiter

        with patch("app.core.config.settings") as mock_settings:
            mock_settings.REDIS_URL = "redis://localhost:6379"
            with patch("redis.asyncio.from_url") as mock_from_url:
                mock_redis = MagicMock()
                mock_from_url.return_value = mock_redis

                rl_module.rate_limiter = RateLimiter()
                init_rate_limiter()
                assert isinstance(rl_module.rate_limiter, RedisRateLimiter)
                assert rl_module.rate_limiter.redis is mock_redis

        rl_module.rate_limiter = original

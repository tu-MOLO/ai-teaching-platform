from unittest.mock import MagicMock, patch

import pytest

from app.core.performance import (
    PaginationHelper,
    PerformanceMonitor,
    QueryOptimizer,
    SimpleMemoryCache,
    cached,
    get_cache,
    invalidate_cache,
)


@pytest.fixture
def cache():
    return SimpleMemoryCache(default_ttl=300, max_size=3)


@pytest.fixture(autouse=True)
def reset_global_cache():
    import app.core.performance as perf_module

    original = perf_module._cache_instance
    perf_module._cache_instance = None
    yield
    perf_module._cache_instance = original


class TestSimpleMemoryCacheGet:
    def test_hit(self, cache):
        cache.set("k1", "v1")
        assert cache.get("k1") == "v1"

    def test_miss(self, cache):
        assert cache.get("nonexistent") is None

    def test_expired(self, cache):
        with patch("app.core.performance.time") as mock_time:
            mock_time.time.return_value = 100.0
            cache.set("k1", "v1", ttl=10)
            mock_time.time.return_value = 111.0
            assert cache.get("k1") is None

    def test_expired_key_is_deleted(self, cache):
        with patch("app.core.performance.time") as mock_time:
            mock_time.time.return_value = 100.0
            cache.set("k1", "v1", ttl=10)
            mock_time.time.return_value = 111.0
            cache.get("k1")
            assert "k1" not in cache._cache


class TestSimpleMemoryCacheSet:
    def test_new_key(self, cache):
        cache.set("k1", "v1")
        assert cache.get("k1") == "v1"
        assert "k1" in cache._order

    def test_overwrite(self, cache):
        cache.set("k1", "v1")
        cache.set("k1", "v2")
        assert cache.get("k1") == "v2"
        assert cache._order.count("k1") == 1

    def test_with_ttl(self, cache):
        with patch("app.core.performance.time") as mock_time:
            mock_time.time.return_value = 100.0
            cache.set("k1", "v1", ttl=60)
            assert cache._ttl["k1"] == 160.0

    def test_capacity_limit_triggers_eviction(self, cache):
        cache.set("k1", "v1")
        cache.set("k2", "v2")
        cache.set("k3", "v3")
        cache.set("k4", "v4")
        assert "k1" not in cache._cache
        assert "k4" in cache._cache
        assert len(cache._cache) == 3


class TestSimpleMemoryCacheDelete:
    def test_exists(self, cache):
        cache.set("k1", "v1")
        cache.delete("k1")
        assert cache.get("k1") is None
        assert "k1" not in cache._order

    def test_not_exists(self, cache):
        cache.delete("nonexistent")


class TestSimpleMemoryCacheClear:
    def test_clear(self, cache):
        cache.set("k1", "v1")
        cache.set("k2", "v2")
        cache.clear()
        assert cache._cache == {}
        assert cache._ttl == {}
        assert cache._order == []


class TestSimpleMemoryCacheCleanupExpired:
    def test_returns_count(self, cache):
        with patch("app.core.performance.time") as mock_time:
            mock_time.time.return_value = 100.0
            cache.set("k1", "v1", ttl=10)
            cache.set("k2", "v2", ttl=10)
            cache.set("k3", "v3", ttl=500)
            mock_time.time.return_value = 120.0
            count = cache.cleanup_expired()
            assert count == 2
            assert cache.get("k3") == "v3"

    def test_no_expired(self, cache):
        with patch("app.core.performance.time") as mock_time:
            mock_time.time.return_value = 100.0
            cache.set("k1", "v1", ttl=300)
            mock_time.time.return_value = 200.0
            count = cache.cleanup_expired()
            assert count == 0


class TestSimpleMemoryCacheEvictOldest:
    def test_evict_oldest(self, cache):
        cache.set("k1", "v1")
        cache.set("k2", "v2")
        cache._evict_oldest()
        assert "k1" not in cache._cache
        assert "k2" in cache._cache

    def test_evict_oldest_empty(self):
        c = SimpleMemoryCache()
        c._evict_oldest()


class TestCachedDecorator:
    @pytest.mark.asyncio
    async def test_cache_miss_executes_function(self):
        call_count = 0

        @cached(ttl=60)
        async def my_func(x):
            nonlocal call_count
            call_count += 1
            return x * 2

        result = await my_func(5)
        assert result == 10
        assert call_count == 1

    @pytest.mark.asyncio
    async def test_cache_hit_returns_cached_value(self):
        call_count = 0

        @cached(ttl=60)
        async def my_func(x):
            nonlocal call_count
            call_count += 1
            return x * 2

        await my_func(5)
        result = await my_func(5)
        assert result == 10
        assert call_count == 1

    @pytest.mark.asyncio
    async def test_custom_key_func(self):
        @cached(ttl=60, key_func=lambda x: f"custom:{x}")
        async def my_func(x):
            return x * 2

        result = await my_func(5)
        assert result == 10
        cache = get_cache()
        assert cache.get("custom:5") == 10

    @pytest.mark.asyncio
    async def test_cache_clear(self):
        @cached(ttl=60)
        async def my_func(x):
            return x * 2

        await my_func(5)
        my_func.cache_clear()
        cache = get_cache()
        assert cache.get("my_func") is None


class TestInvalidateCache:
    def test_pattern_matching_deletion(self):
        cache = get_cache()
        cache.set("user:1", "a")
        cache.set("user:2", "b")
        cache.set("course:1", "c")
        invalidate_cache("user")
        assert cache.get("user:1") is None
        assert cache.get("user:2") is None
        assert cache.get("course:1") == "c"


class TestPaginationHelperCalculateOffset:
    def test_page_1(self):
        assert PaginationHelper.calculate_offset(1, 10) == 0

    def test_page_2(self):
        assert PaginationHelper.calculate_offset(2, 10) == 10

    def test_page_3_page_size_20(self):
        assert PaginationHelper.calculate_offset(3, 20) == 40

    def test_page_1_page_size_1(self):
        assert PaginationHelper.calculate_offset(1, 1) == 0


class TestPaginationHelperCalculateTotalPages:
    def test_exact(self):
        assert PaginationHelper.calculate_total_pages(100, 10) == 10

    def test_with_remainder(self):
        assert PaginationHelper.calculate_total_pages(95, 10) == 10

    def test_zero(self):
        assert PaginationHelper.calculate_total_pages(0, 10) == 0

    def test_less_than_page_size(self):
        assert PaginationHelper.calculate_total_pages(5, 10) == 1


class TestPaginationHelperGetPageRange:
    def test_middle(self):
        result = PaginationHelper.get_page_range(5, 10, window=2)
        assert result == [3, 4, 5, 6, 7]

    def test_near_start(self):
        result = PaginationHelper.get_page_range(1, 10, window=2)
        assert result == [1, 2, 3]

    def test_near_end(self):
        result = PaginationHelper.get_page_range(10, 10, window=2)
        assert result == [8, 9, 10]

    def test_single_page(self):
        result = PaginationHelper.get_page_range(1, 1, window=2)
        assert result == [1]


class TestQueryOptimizer:
    def test_selectinload_chain_with_paths(self):
        with patch("sqlalchemy.orm.selectinload") as mock_selectinload:
            mock_option = MagicMock()
            mock_selectinload.return_value = mock_option
            mock_option.selectinload.return_value = mock_option
            result = QueryOptimizer.selectinload_chain("portfolios", "attachments")
            mock_selectinload.assert_called_once_with("portfolios")
            mock_option.selectinload.assert_called_once_with("attachments")
            assert result is mock_option

    def test_selectinload_chain_empty_returns_none(self):
        result = QueryOptimizer.selectinload_chain()
        assert result is None


class TestPerformanceMonitorMeasureExecutionTime:
    def test_normal_operation(self):
        with PerformanceMonitor.measure_execution_time("test_op", threshold_ms=1000):
            pass

    def test_slow_operation_above_threshold(self):
        with patch("app.core.performance.time") as mock_time:
            mock_time.time.side_effect = [0.0, 2.0]
            with PerformanceMonitor.measure_execution_time("slow_op", threshold_ms=1000):
                pass


class TestGetCache:
    def test_returns_singleton(self):
        c1 = get_cache()
        c2 = get_cache()
        assert c1 is c2

    def test_returns_simple_memory_cache_instance(self):
        c = get_cache()
        assert isinstance(c, SimpleMemoryCache)

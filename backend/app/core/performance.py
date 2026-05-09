"""
性能优化工具模块
提供查询优化、性能监控和缓存功能
"""
import functools
import time
from contextlib import contextmanager
from typing import Optional, Callable, Any, List, TypeVar

from sqlalchemy import event
from sqlalchemy.orm import selectinload, joinedload

from app.core.logging import get_logger

logger = get_logger(__name__)

T = TypeVar("T")


class QueryOptimizer:
    """查询优化器"""
    
    @staticmethod
    def selectinload_chain(*paths: str):
        """
        构建 selectinload 链
        
        使用示例：
            stmt = select(Student).options(
                QueryOptimizer.selectinload_chain("portfolios", "attachments")
            )
        
        Args:
            paths: 关联路径
            
        Returns:
            selectinload 选项
        """
        if not paths:
            return None
        
        from sqlalchemy.orm import selectinload
        
        option = selectinload(paths[0])
        for path in paths[1:]:
            option = option.selectinload(path)
        
        return option


class PerformanceMonitor:
    """性能监控器"""
    
    # 慢查询阈值（毫秒）
    SLOW_QUERY_THRESHOLD = 1000
    
    @staticmethod
    def setup_sql_logging(engine):
        """
        设置 SQL 执行时间监控
        
        Args:
            engine: SQLAlchemy 引擎
        """
        @event.listens_for(engine, "before_cursor_execute")
        def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
            context._query_start_time = time.time()
        
        @event.listens_for(engine, "after_cursor_execute")
        def after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
            total_time = (time.time() - context._query_start_time) * 1000
            
            # 记录慢查询
            if total_time > PerformanceMonitor.SLOW_QUERY_THRESHOLD:
                logger.warning(
                    f"Slow query detected ({total_time:.2f}ms): {statement[:200]}..."
                )
            
            # 记录调试信息
            logger.debug(f"Query executed in {total_time:.2f}ms")
    
    @staticmethod
    @contextmanager
    def measure_execution_time(operation_name: str, threshold_ms: int = 1000):
        """
        上下文管理器：测量代码执行时间
        
        使用示例：
            with PerformanceMonitor.measure_execution_time("complex_operation"):
                result = complex_operation()
        
        Args:
            operation_name: 操作名称
            threshold_ms: 慢操作阈值（毫秒）
        """
        start_time = time.time()
        try:
            yield
        finally:
            elapsed_ms = (time.time() - start_time) * 1000
            
            if elapsed_ms > threshold_ms:
                logger.warning(
                    f"Slow operation detected: {operation_name} took {elapsed_ms:.2f}ms"
                )
            else:
                logger.debug(f"Operation {operation_name} took {elapsed_ms:.2f}ms")


class SimpleMemoryCache:
    """
    简单内存缓存
    适用于开发和测试环境，生产环境建议使用 Redis
    """
    
    def __init__(self, default_ttl: int = 300):
        """
        初始化缓存
        
        Args:
            default_ttl: 默认过期时间（秒）
        """
        self._cache: dict = {}
        self._ttl: dict = {}
        self._default_ttl = default_ttl
    
    def get(self, key: str) -> Optional[Any]:
        """获取缓存值"""
        if key in self._cache:
            # 检查是否过期
            if time.time() < self._ttl.get(key, 0):
                return self._cache[key]
            else:
                # 清理过期数据
                self.delete(key)
        return None
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """设置缓存值"""
        self._cache[key] = value
        self._ttl[key] = time.time() + (ttl or self._default_ttl)
    
    def delete(self, key: str) -> None:
        """删除缓存值"""
        self._cache.pop(key, None)
        self._ttl.pop(key, None)
    
    def clear(self) -> None:
        """清空缓存"""
        self._cache.clear()
        self._ttl.clear()
    
    def cleanup_expired(self) -> int:
        """清理过期数据，返回清理数量"""
        now = time.time()
        expired_keys = [k for k, v in self._ttl.items() if v < now]
        for key in expired_keys:
            self.delete(key)
        return len(expired_keys)


# 全局缓存实例
_cache_instance: Optional[SimpleMemoryCache] = None


def get_cache() -> SimpleMemoryCache:
    """获取全局缓存实例"""
    global _cache_instance
    if _cache_instance is None:
        _cache_instance = SimpleMemoryCache()
    return _cache_instance


def cached(ttl: int = 300, key_func: Optional[Callable] = None):
    """
    缓存装饰器
    
    使用示例：
        @cached(ttl=60)
        async def get_user_by_id(db, user_id: str):
            return await db.get(User, user_id)
    
    Args:
        ttl: 缓存过期时间（秒）
        key_func: 自定义缓存键生成函数
        
    Returns:
        装饰器函数
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            cache = get_cache()
            
            # 生成缓存键
            if key_func:
                cache_key = key_func(*args, **kwargs)
            else:
                # 默认使用函数名和参数生成键
                key_parts = [func.__name__]
                key_parts.extend(str(arg) for arg in args)
                key_parts.extend(f"{k}={v}" for k, v in sorted(kwargs.items()))
                cache_key = ":".join(key_parts)
            
            # 尝试从缓存获取
            cached_value = cache.get(cache_key)
            if cached_value is not None:
                logger.debug(f"Cache hit: {cache_key}")
                return cached_value
            
            # 执行函数
            result = await func(*args, **kwargs)
            
            # 存入缓存
            cache.set(cache_key, result, ttl)
            logger.debug(f"Cache set: {cache_key}")
            
            return result
        
        # 添加清除缓存的方法
        wrapper.cache_clear = lambda: get_cache().delete(
            ":".join([func.__name__])
        )
        
        return wrapper
    return decorator


def invalidate_cache(pattern: str):
    """
    清除匹配模式的缓存
    
    Args:
        pattern: 缓存键模式
    """
    cache = get_cache()
    keys_to_delete = [k for k in cache._cache.keys() if pattern in k]
    for key in keys_to_delete:
        cache.delete(key)
    logger.info(f"Invalidated {len(keys_to_delete)} cache entries matching '{pattern}'")


class PaginationHelper:
    """分页辅助类"""
    
    @staticmethod
    def calculate_offset(page: int, page_size: int) -> int:
        """计算分页偏移量"""
        return (page - 1) * page_size
    
    @staticmethod
    def calculate_total_pages(total: int, page_size: int) -> int:
        """计算总页数"""
        return (total + page_size - 1) // page_size
    
    @staticmethod
    def get_page_range(current_page: int, total_pages: int, window: int = 2) -> List[int]:
        """
        获取分页导航范围
        
        Args:
            current_page: 当前页
            total_pages: 总页数
            window: 窗口大小
            
        Returns:
            页码列表
        """
        start = max(1, current_page - window)
        end = min(total_pages, current_page + window)
        
        return list(range(start, end + 1))

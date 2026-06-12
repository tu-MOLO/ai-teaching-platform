"""
请求频率限制模块
防止暴力破解和 API 滥用
支持内存和 Redis 两种后端
"""
import asyncio
import time
from dataclasses import dataclass
from functools import wraps
from typing import Optional, Callable, Dict, List

from fastapi import Request, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials


@dataclass
class RateLimitConfig:
    """限流配置"""
    requests: int  # 允许的最大请求数
    window: int    # 时间窗口（秒）
    key_func: Optional[Callable] = None  # 自定义键生成函数


class RateLimiter:
    """基于内存的请求频率限制器（单进程）"""

    def __init__(self):
        self._requests: Dict[str, List[float]] = {}
        self._configs: Dict[str, RateLimitConfig] = {}

    def configure(self, name: str, requests: int, window: int, key_func: Optional[Callable] = None):
        self._configs[name] = RateLimitConfig(
            requests=requests,
            window=window,
            key_func=key_func
        )

    def _get_client_ip(self, request: Request) -> str:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        if request.client:
            return request.client.host
        return "unknown"

    def _generate_key(self, request: Request, config_name: str,
                      credentials: Optional[HTTPAuthorizationCredentials] = None) -> str:
        config = self._configs.get(config_name)
        if config and config.key_func:
            return config.key_func(request)
        if credentials:
            return f"{config_name}:{credentials.credentials}"
        client_ip = self._get_client_ip(request)
        return f"{config_name}:{client_ip}"

    def is_allowed(self, key: str, config_name: str) -> tuple[bool, dict]:
        config = self._configs.get(config_name)
        if not config:
            return True, {}

        now = time.time()
        window_start = now - config.window

        requests = self._requests.get(key, [])
        requests = [ts for ts in requests if ts > window_start]

        if len(requests) >= config.requests:
            reset_time = min(requests) + config.window if requests else now
            retry_after = int(reset_time - now)
            return False, {
                "limit": config.requests,
                "remaining": 0,
                "reset_time": reset_time,
                "retry_after": max(1, retry_after)
            }

        requests.append(now)
        self._requests[key] = requests

        remaining = config.requests - len(requests)
        reset_time = now + config.window

        return True, {
            "limit": config.requests,
            "remaining": max(0, remaining),
            "reset_time": reset_time,
            "retry_after": 0
        }

    def reset(self, key: str):
        if key in self._requests:
            del self._requests[key]


class RedisRateLimiter(RateLimiter):
    """基于 Redis 的分布式请求频率限制器（多进程/多实例安全）"""

    def __init__(self, redis_client):
        super().__init__()
        self.redis = redis_client

    async def is_allowed_async(self, key: str, config_name: str) -> tuple[bool, dict]:
        config = self._configs.get(config_name)
        if not config:
            return True, {}

        now = time.time()
        window_start = now - config.window
        window_key = f"ratelimit:{key}"

        try:
            async with self.redis.pipeline() as pipe:
                pipe.zremrangebyscore(window_key, 0, window_start)
                pipe.zcard(window_key)
                pipe.zadd(window_key, {str(now): now})
                pipe.expire(window_key, config.window + 1)
                _, count, _, _ = await pipe.execute()

            if count >= config.requests:
                last = await self.redis.zrange(window_key, 0, 0, withscores=True)
                oldest_ts = last[0][1] if last else now
                reset_time = oldest_ts + config.window
                retry_after = max(1, int(reset_time - now))
                return False, {
                    "limit": config.requests,
                    "remaining": 0,
                    "reset_time": reset_time,
                    "retry_after": retry_after
                }

            remaining = config.requests - count - 1
            return True, {
                "limit": config.requests,
                "remaining": max(0, remaining),
                "reset_time": now + config.window,
                "retry_after": 0
            }
        except Exception:
            return await asyncio.to_thread(self.is_allowed, key, config_name)


# 全局限流器实例
rate_limiter = RateLimiter()


def rate_limit(config_name: str):
    """
    限流装饰器

    使用示例：
        @router.post("/login")
        @rate_limit("login")
        async def login(request: Request, ...):
            ...
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # 从参数中获取 request 和 credentials
            request = kwargs.get('request')
            credentials = kwargs.get('credentials')

            # 如果参数中没有，尝试从 args 中查找
            if not request:
                for arg in args:
                    if isinstance(arg, Request):
                        request = arg
                        break

            if not request:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Rate limiting requires Request parameter"
                )

            # 生成限流键
            key = rate_limiter._generate_key(request, config_name, credentials)

            # 检查限流
            allowed, info = rate_limiter.is_allowed(key, config_name)

            if not allowed:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"请求过于频繁，请 {info['retry_after']} 秒后重试",
                    headers={
                        "X-RateLimit-Limit": str(info["limit"]),
                        "X-RateLimit-Remaining": str(info["remaining"]),
                        "X-RateLimit-Reset": str(int(info["reset_time"])),
                        "Retry-After": str(info["retry_after"])
                    }
                )

            # 添加限流信息到响应头（通过 request state）
            request.state.rate_limit_info = info

            return await func(*args, **kwargs)
        return wrapper
    return decorator


class RateLimitDependency:
    """限流依赖类 - 支持内存和 Redis 后端"""

    _instances: dict = {}

    def __new__(cls, config_name: str):
        if config_name not in cls._instances:
            cls._instances[config_name] = super().__new__(cls)
            cls._instances[config_name]._initialized = False
            cls._instances[config_name].config_name = config_name
        return cls._instances[config_name]

    def __init__(self, config_name: str):
        if getattr(self, '_initialized', False):
            return
        self.config_name = config_name
        self._initialized = True

    async def __call__(self, request: Request) -> None:
        key = rate_limiter._generate_key(request, self.config_name)
        if isinstance(rate_limiter, RedisRateLimiter):
            allowed, info = await rate_limiter.is_allowed_async(key, self.config_name)
        else:
            allowed, info = rate_limiter.is_allowed(key, self.config_name)
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"请求过于频繁，请 {info['retry_after']} 秒后重试",
                headers={
                    "X-RateLimit-Limit": str(info["limit"]),
                    "X-RateLimit-Remaining": str(info["remaining"]),
                    "X-RateLimit-Reset": str(int(info["reset_time"])),
                    "Retry-After": str(info["retry_after"]),
                },
            )
        request.state.rate_limit_info = info


# 预创建的限流依赖实例
rate_limit_login = RateLimitDependency("login")
rate_limit_register = RateLimitDependency("register")
rate_limit_password_reset = RateLimitDependency("password_reset")
rate_limit_api = RateLimitDependency("api")
rate_limit_strict = RateLimitDependency("strict")


def rate_limit_dep(config_name: str):
    """
    获取限流依赖

    使用示例：
        @router.post("/login")
        async def login(
            ...,
            _: None = Depends(rate_limit_dep("login")),
        ):
            ...
    """
    return RateLimitDependency(config_name)


def init_rate_limiter():
    """
    初始化限流器配置，优先使用 Redis，不可用时回退到内存
    """
    global rate_limiter

    configs = [
        ("login", 5, 60),
        ("register", 3, 3600),
        ("password_reset", 3, 3600),
        ("api", 100, 60),
        ("strict", 10, 60),
    ]

    try:
        from app.core.config import settings
        if settings.REDIS_URL:
            import redis.asyncio as aioredis
            redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=False)
            rate_limiter = RedisRateLimiter(redis_client)
            from app.core.logging import get_logger
            get_logger(__name__).info("Redis rate limiter initialized")
        else:
            raise ImportError("No REDIS_URL configured")
    except Exception:
        from app.core.logging import get_logger
        get_logger(__name__).warning(
            "Redis unavailable, using in-memory rate limiter (single-worker only)")

    for name, requests, window in configs:
        rate_limiter.configure(name=name, requests=requests, window=window)

"""
请求频率限制模块
防止暴力破解和 API 滥用
"""
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
    """基于内存的请求频率限制器"""
    
    def __init__(self):
        # 存储请求记录: {key: [(timestamp, count), ...]}
        self._requests: Dict[str, List[float]] = {}
        self._configs: Dict[str, RateLimitConfig] = {}
    
    def configure(self, name: str, requests: int, window: int, key_func: Optional[Callable] = None):
        """
        配置限流规则
        
        Args:
            name: 规则名称
            requests: 时间窗口内允许的最大请求数
            window: 时间窗口（秒）
            key_func: 自定义键生成函数
        """
        self._configs[name] = RateLimitConfig(
            requests=requests,
            window=window,
            key_func=key_func
        )
    
    def _get_client_ip(self, request: Request) -> str:
        """获取客户端 IP"""
        # 优先从 X-Forwarded-For 获取（代理环境）
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        
        # 从 X-Real-IP 获取
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        # 直接从连接获取
        if request.client:
            return request.client.host
        
        return "unknown"
    
    def _generate_key(self, request: Request, config_name: str, credentials: Optional[HTTPAuthorizationCredentials] = None) -> str:
        """生成限流键"""
        config = self._configs.get(config_name)
        
        # 使用自定义键生成函数
        if config and config.key_func:
            return config.key_func(request)
        
        # 优先使用用户 ID（已登录用户）
        if credentials:
            return f"{config_name}:{credentials.credentials}"
        
        # 使用 IP 地址（未登录用户）
        client_ip = self._get_client_ip(request)
        return f"{config_name}:{client_ip}"
    
    def is_allowed(self, key: str, config_name: str) -> tuple[bool, dict]:
        """
        检查请求是否被允许
        
        Args:
            key: 限流键
            config_name: 配置名称
            
        Returns:
            (是否允许, 限流信息)
        """
        config = self._configs.get(config_name)
        if not config:
            return True, {}
        
        now = time.time()
        window_start = now - config.window
        
        # 获取该键的请求记录
        requests = self._requests.get(key, [])
        
        # 清理过期的请求记录
        requests = [ts for ts in requests if ts > window_start]
        
        # 检查是否超过限制
        if len(requests) >= config.requests:
            # 计算重置时间
            reset_time = min(requests) + config.window if requests else now
            retry_after = int(reset_time - now)
            
            return False, {
                "limit": config.requests,
                "remaining": 0,
                "reset_time": reset_time,
                "retry_after": max(1, retry_after)
            }
        
        # 记录当前请求
        requests.append(now)
        self._requests[key] = requests
        
        # 计算剩余请求数
        remaining = config.requests - len(requests)
        reset_time = now + config.window
        
        return True, {
            "limit": config.requests,
            "remaining": max(0, remaining),
            "reset_time": reset_time,
            "retry_after": 0
        }
    
    def reset(self, key: str):
        """重置指定键的请求记录"""
        if key in self._requests:
            del self._requests[key]


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


def init_rate_limiter():
    """
    初始化限流器配置
    在应用启动时调用
    """
    # 登录接口限流：5次/分钟
    rate_limiter.configure(
        name="login",
        requests=5,
        window=60
    )
    
    # 注册接口限流：3次/小时
    rate_limiter.configure(
        name="register",
        requests=3,
        window=3600
    )
    
    # 密码重置接口限流：3次/小时
    rate_limiter.configure(
        name="password_reset",
        requests=3,
        window=3600
    )
    
    # 通用 API 限流：100次/分钟
    rate_limiter.configure(
        name="api",
        requests=100,
        window=60
    )
    
    # 严格限流：10次/分钟（用于敏感操作）
    rate_limiter.configure(
        name="strict",
        requests=10,
        window=60
    )

"""
FastAPI应用入口
AI教学平台后端主应用
"""
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, Request, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

from app.api.v1 import api_router
from app.core.config import settings
from app.core.config_validator import validate_config_on_startup
from app.core.database import close_db, init_db
from app.core.logging import get_logger, setup_logging
from app.core.rate_limiter import init_rate_limiter
from app.core.query_filters import setup_soft_delete_filter
from app.core.exceptions import BusinessException, ErrorCode, get_error_message

# 设置日志
setup_logging()
logger = get_logger(__name__)

# 启动时验证配置
validate_config_on_startup()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    应用生命周期管理
    处理启动和关闭事件
    """
    # 启动事件
    logger.info("Starting up AI Teaching Platform API...")
    try:
        # 初始化限流器
        init_rate_limiter()
        logger.info("Rate limiter initialized")
        
        # 初始化软删除过滤器
        setup_soft_delete_filter()
        logger.info("Soft delete filter initialized")
        
        # 初始化数据库（开发环境自动创建表）
        if settings.DEBUG:
            await init_db()
            logger.info("Database initialized")
    except Exception as e:
        logger.error(f"Failed to initialize application: {e}")
        raise
    
    logger.info(f"Application started: {settings.APP_NAME} v{settings.APP_VERSION}")
    
    yield
    
    # 关闭事件
    logger.info("Shutting down AI Teaching Platform API...")
    try:
        await close_db()
        logger.info("Database connections closed")
    except Exception as e:
        logger.error(f"Error during shutdown: {e}")
    
    logger.info("Application shutdown complete")


def create_application() -> FastAPI:
    """
    创建FastAPI应用实例

    Returns:
        FastAPI应用实例
    """
    # OpenAPI 标签分组及描述
    openapi_tags = [
        {"name": "健康检查", "description": "应用健康状态与环境信息"},
        {"name": "根路径", "description": "API基本信息入口"},
        {"name": "auth", "description": "用户认证：登录、注册、Token刷新、密码管理"},
        {"name": "用户", "description": "用户资料查看与更新"},
        {"name": "课程", "description": "课程CRUD与学生关联管理"},
        {"name": "课程管理", "description": "课程创建、编辑、删除与状态管理"},
        {"name": "学生", "description": "学生信息CRUD与成长报告导出"},
        {"name": "学生管理", "description": "学生信息管理与数据导出"},
        {"name": "教案", "description": "教案CRUD、发布/归档生命周期"},
        {"name": "教案管理", "description": "教案创建、编辑、发布与归档"},
        {"name": "教案模板", "description": "系统预设教案模板查询"},
        {"name": "成长档案", "description": "学生成长档案记录管理"},
        {"name": "成长档案管理", "description": "学生成长档案CRUD与评价维度"},
        {"name": "资源", "description": "教学资源上传、下载与标签管理"},
        {"name": "标签", "description": "资源标签分类管理"},
        {"name": "通知", "description": "站内通知列表、已读/未读管理"},
        {"name": "报告", "description": "数据报告与统计分析"},
        {"name": "报告分析", "description": "仪表盘统计、课程/学生报告与月度趋势"},
        {"name": "dropdown-options", "description": "可配置下拉选项（学科、年级等）的CRUD"},
        {"name": "AI助手", "description": "AI对话、对话历史管理"},
        {"name": "AI配置", "description": "AI服务商配置与连接测试"},
    ]

    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="AI教学平台后端API - 提供智能教学、课程管理、教案设计、学生档案、资源管理与AI助手等功能",
        docs_url="/docs" if settings.DEBUG else None,
        redoc_url="/redoc" if settings.DEBUG else None,
        openapi_url="/openapi.json" if settings.DEBUG else None,
        openapi_tags=openapi_tags,
        lifespan=lifespan
    )
    
    # 注册中间件
    register_middlewares(app)
    
    # 注册路由
    register_routers(app)
    
    # 注册异常处理
    register_exception_handlers(app)
    
    return app


def register_middlewares(app: FastAPI) -> None:
    """
    注册中间件
    
    Args:
        app: FastAPI应用实例
    """
    # CORS中间件
    # 开发环境下仅允许本地开发服务器来源
    if settings.DEBUG:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
            expose_headers=["X-Request-ID"]
        )
        logger.info("CORS enabled for all origins (DEBUG mode)")
    elif settings.BACKEND_CORS_ORIGINS:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
            expose_headers=["X-Request-ID"]
        )
        logger.info(f"CORS enabled for origins: {settings.BACKEND_CORS_ORIGINS}")
    
    # GZip压缩中间件
    app.add_middleware(GZipMiddleware, minimum_size=1000)

    @app.middleware("http")
    async def limit_body_size(request: Request, call_next):
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > settings.MAX_UPLOAD_SIZE:
            return JSONResponse(
                status_code=413,
                content={
                    "error": "FILE_TOO_LARGE",
                    "code": "FILE_TOO_LARGE",
                    "message": f"文件超过大小限制（最大{settings.MAX_UPLOAD_SIZE // 1024 // 1024}MB）",
                    "request_id": str(uuid.uuid4())[:8]
                }
            )
        return await call_next(request)

    @app.middleware("http")
    async def add_security_headers(request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        return response

    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        """记录请求日志"""
        import time
        
        start_time = time.time()
        
        # 获取请求信息
        method = request.method
        url = request.url.path
        client_host = request.client.host if request.client else "unknown"
        
        logger.debug(f"Request started: {method} {url} from {client_host}")
        
        try:
            response = await call_next(request)
            
            # 计算处理时间
            process_time = time.time() - start_time
            response.headers["X-Process-Time"] = str(process_time)
            
            # 记录响应信息
            status_code = response.status_code
            logger.info(
                f"Request completed: {method} {url} - {status_code} "
                f"({process_time:.3f}s)"
            )
            
            return response
            
        except Exception as e:
            process_time = time.time() - start_time
            logger.error(
                f"Request failed: {method} {url} - {e} "
                f"({process_time:.3f}s)"
            )
            raise


async def require_internal_ip(request: Request):
    if settings.DEBUG:
        return
    client_ip = request.client.host if request.client else ""
    allowed = client_ip.startswith((
        "127.", "10.",
        "172.16.", "172.17.", "172.18.", "172.19.",
        "172.20.", "172.21.", "172.22.", "172.23.",
        "172.24.", "172.25.", "172.26.", "172.27.",
        "172.28.", "172.29.", "172.30.", "172.31.",
        "192.168."
    ))
    if not allowed:
        raise HTTPException(status_code=403, detail="Forbidden")


def register_routers(app: FastAPI) -> None:
    """
    注册路由
    
    Args:
        app: FastAPI应用实例
    """
    from app.core.database import async_engine
    from app.core.performance import get_cache
    
    # 健康检查端点
    @app.get("/health", tags=["健康检查"], summary="健康检查")
    async def health_check():
        """
        API健康检查端点
        检查数据库连接和缓存状态
        """
        health_status = {
            "status": "healthy",
            "app": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "checks": {}
        }
        
        # 检查数据库连接
        try:
            from sqlalchemy import text
            async with async_engine.connect() as conn:
                result = await conn.execute(text("SELECT 1"))
                result.scalar()
            health_status["checks"]["database"] = {
                "status": "healthy",
                "message": "Database connection OK"
            }
        except Exception as e:
            health_status["status"] = "unhealthy"
            health_status["checks"]["database"] = {
                "status": "unhealthy",
                "message": "Database connection failed"
            }
        
        # 检查缓存状态
        try:
            cache = get_cache()
            cache.cleanup_expired()
            health_status["checks"]["cache"] = {
                "status": "healthy",
                "message": "Cache OK"
            }
        except Exception as e:
            health_status["checks"]["cache"] = {
                "status": "warning",
                "message": f"Cache check failed: {str(e)}"
            }
        
        return health_status
    
    # 详细健康检查端点（生产环境仅允许内网IP访问）
    @app.get("/health/detailed", tags=["健康检查"], summary="详细健康检查")
    async def health_check_detailed(
        _: None = Depends(require_internal_ip),
    ):
        """
        详细健康检查端点
        包含更多系统信息
        """
        import platform
        import sys
        
        return {
            "status": "healthy",
            "app": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "environment": {
                "python_version": sys.version,
                "platform": platform.platform(),
                "debug_mode": settings.DEBUG
            },
            "configuration": {
                "database_pool_size": settings.DATABASE_POOL_SIZE,
                "max_upload_size": settings.MAX_UPLOAD_SIZE,
                "allowed_extensions": settings.ALLOWED_EXTENSIONS,
                "cors_origins_count": len(settings.BACKEND_CORS_ORIGINS)
            }
        }
    
    # API根端点
    @app.get("/", tags=["根路径"], summary="API信息")
    async def root():
        """API根路径"""
        return {
            "name": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "docs_url": "/docs",
            "api_prefix": settings.API_V1_STR,
            "health_check": "/health"
        }
    
    # 注册V1 API路由
    app.include_router(
        api_router,
        prefix=settings.API_V1_STR
    )
    
    logger.info(f"Registered API router with prefix: {settings.API_V1_STR}")


def register_exception_handlers(app: FastAPI) -> None:
    """
    注册全局异常处理器
    
    Args:
        app: FastAPI应用实例
    """
    # 业务异常处理器
    @app.exception_handler(BusinessException)
    async def business_exception_handler(request: Request, exc: BusinessException):
        """处理业务异常"""
        logger.warning(f"Business exception: {exc.error_code} - {exc.detail}")
        
        response_data = {
            "error": exc.error_code,
            "code": exc.error_code.value if isinstance(exc.error_code, ErrorCode) else str(exc.error_code),
            "message": exc.detail
        }
        
        if exc.details:
            response_data["details"] = exc.details
        
        # 添加请求追踪ID
        response_data["request_id"] = str(uuid.uuid4())[:8]
        
        return JSONResponse(
            status_code=exc.status_code,
            content=response_data
        )
    
    # 验证错误处理器
    from fastapi.exceptions import RequestValidationError
    
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request,
        exc: RequestValidationError
    ):
        """处理请求验证错误"""
        errors = []
        for error in exc.errors():
            errors.append({
                "field": ".".join(str(loc) for loc in error["loc"]),
                "message": error["msg"],
                "type": error["type"]
            })
        
        logger.warning(f"Validation error: {errors}")
        return JSONResponse(
            status_code=422,
            content={
                "error": ErrorCode.DATA_VALIDATION_ERROR.value,
                "code": ErrorCode.DATA_VALIDATION_ERROR.value,
                "message": "请求参数验证失败",
                "errors": errors,
                "request_id": str(uuid.uuid4())[:8]
            }
        )
    
    # HTTP 异常处理器
    from fastapi.exceptions import HTTPException
    
    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        """处理 HTTP 异常"""
        if exc.status_code >= 500:
            logger.error(f"HTTP exception: {exc.status_code} - {exc.detail}")
        else:
            logger.warning(f"HTTP exception: {exc.status_code} - {exc.detail}")
        
        # 脱敏处理
        message = exc.detail
        if exc.status_code == 500 and not settings.DEBUG:
            message = "服务器内部错误"
        
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": str(exc.status_code),
                "code": str(exc.status_code),
                "message": message,
                "request_id": str(uuid.uuid4())[:8]
            },
            headers=exc.headers
        )
    
    # 通用异常处理器（最后捕获）
    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        """处理所有未捕获的异常"""
        request_id = str(uuid.uuid4())[:8]
        logger.error(f"Unhandled exception [req:{request_id}]: {exc}", exc_info=True)
        
        return JSONResponse(
            status_code=500,
            content={
                "error": ErrorCode.UNKNOWN_ERROR.value,
                "code": ErrorCode.UNKNOWN_ERROR.value,
                "message": "服务器内部错误，请稍后重试" if not settings.DEBUG else str(exc),
                "request_id": request_id
            }
        )


# 创建应用实例
app = create_application()


# 开发环境直接运行
if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower()
    )

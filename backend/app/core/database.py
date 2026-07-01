"""
数据库连接和会话管理模块
使用SQLAlchemy 2.0异步ORM
"""

from typing import Annotated, AsyncGenerator

from fastapi import Depends
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncAttrs, AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, declared_attr, sessionmaker

from app.core.config import settings


class Base(AsyncAttrs, DeclarativeBase):
    """
    基础模型类
    所有模型都继承此类
    """

    @declared_attr.directive
    def __tablename__(cls) -> str:
        """自动生成表名（小写类名）"""
        return cls.__name__.lower()

    def __repr__(self) -> str:
        """模型字符串表示"""
        columns = [f"{k}={v}" for k, v in self.__dict__.items() if not k.startswith("_")]
        return f"<{self.__class__.__name__}({', '.join(columns)})>"


# 创建异步引擎
# SQLite不需要连接池配置
if "sqlite" in settings.DATABASE_URL:
    async_engine = create_async_engine(
        settings.DATABASE_URL, echo=settings.DEBUG, future=True  # 调试模式打印SQL
    )
else:
    async_engine = create_async_engine(
        settings.DATABASE_URL,
        pool_size=settings.DATABASE_POOL_SIZE,
        max_overflow=settings.DATABASE_MAX_OVERFLOW,
        pool_recycle=settings.DATABASE_POOL_RECYCLE,
        pool_pre_ping=True,  # 连接前ping检查，避免使用失效连接
        pool_timeout=30,  # 连接池耗尽时等待30秒后超时
        echo=settings.DEBUG,  # 调试模式打印SQL
        future=True,
    )

# 创建异步会话工厂
AsyncSessionLocal = async_sessionmaker(
    async_engine,
    class_=AsyncSession,
    expire_on_commit=False,  # 提交后不过期，避免懒加载问题
    autocommit=False,
    autoflush=False,
)

# 创建同步引擎（用于Alembic迁移）
sync_engine = create_engine(
    settings.sync_database_url, pool_pre_ping=True, echo=settings.DEBUG, future=True
)

# 创建同步会话工厂
SyncSessionLocal = sessionmaker(bind=sync_engine, autocommit=False, autoflush=False)


async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    """
    获取异步数据库会话
    用于FastAPI依赖注入
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


def get_sync_session():
    """
    获取同步数据库会话
    用于后台任务或脚本
    """
    session = SyncSessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


# FastAPI依赖类型
DBSession = Annotated[AsyncSession, Depends(get_async_session)]


async def init_db() -> None:
    """
    初始化数据库
    创建所有表（仅用于开发，生产环境使用Alembic迁移）
    """
    async with async_engine.begin() as conn:
        # 导入所有模型确保它们被注册
        from app.models import (  # noqa: F401
            ai,
            ai_config,
            audit_log,
            course,
            dropdown_option,
            lesson_plan,
            notification,
            portfolio,
            resource,
            student,
            tag,
            user,
        )

        await conn.run_sync(Base.metadata.create_all)


async def close_db() -> None:
    """关闭数据库连接"""
    await async_engine.dispose()

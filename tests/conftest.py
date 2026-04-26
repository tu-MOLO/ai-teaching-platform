"""
测试配置文件
提供测试所需的fixtures和配置
"""
import asyncio
import os
import sys
import uuid
from typing import AsyncGenerator, Generator

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool

# 设置测试环境变量
os.environ["DEBUG"] = "True"
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test.db"
os.environ["SECRET_KEY"] = "test-secret-key-for-testing-only"

# 添加backend目录到Python路径
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend"))

from app.main import create_application
from app.core.database import Base, get_async_session
from app.models import User, Course, Student, LessonPlan, Resource, Tag, Portfolio
from app.core.security import create_access_token

# 测试数据库URL
TEST_DATABASE_URL = "sqlite+aiosqlite:///./test.db"

# 创建测试引擎
test_engine = create_async_engine(
    TEST_DATABASE_URL,
    echo=False,
    poolclass=NullPool,
)

# 创建测试会话工厂
TestSessionLocal = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


@pytest_asyncio.fixture(scope="session")
def event_loop():
    """创建会话级别的事件循环"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_test_database():
    """设置测试数据库"""
    # 创建所有表
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    # 清理数据库
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """提供数据库会话"""
    async with TestSessionLocal() as session:
        try:
            yield session
        finally:
            await session.rollback()
            await session.close()


@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """提供HTTP测试客户端"""
    app = create_application()
    
    # 覆盖依赖
    async def override_get_db():
        yield db_session
    
    app.dependency_overrides[get_async_session] = override_get_db
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    
    app.dependency_overrides.clear()


def generate_unique_id() -> str:
    """生成唯一标识符"""
    return str(uuid.uuid4())[:8]


@pytest_asyncio.fixture
async def test_user(db_session: AsyncSession) -> User:
    """创建测试用户"""
    from app.core.security import get_password_hash
    from app.models.user import UserRole, UserStatus
    
    unique_id = generate_unique_id()
    user = User(
        username=f"testuser_{unique_id}",
        email=f"test_{unique_id}@example.com",
        hashed_password=get_password_hash("testpassword123"),
        full_name="Test User",
        role=UserRole.TEACHER,
        status=UserStatus.ACTIVE,
        is_active=True,
        is_deleted=False
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def auth_token(test_user: User) -> str:
    """生成认证令牌"""
    token = create_access_token(
        subject=test_user.id,
        extra_claims={"user_id": test_user.id, "username": test_user.username}
    )
    return token


@pytest_asyncio.fixture
async def auth_headers(auth_token: str) -> dict:
    """提供认证请求头"""
    return {"Authorization": f"Bearer {auth_token}"}


@pytest_asyncio.fixture
async def admin_user(db_session: AsyncSession) -> User:
    """创建管理员测试用户"""
    from app.core.security import get_password_hash
    from app.models.user import UserRole, UserStatus
    
    unique_id = generate_unique_id()
    user = User(
        username=f"adminuser_{unique_id}",
        email=f"admin_{unique_id}@example.com",
        hashed_password=get_password_hash("adminpassword123"),
        full_name="Admin User",
        role=UserRole.ADMIN,
        status=UserStatus.ACTIVE,
        is_active=True,
        is_deleted=False
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def admin_token(admin_user: User) -> str:
    """生成管理员认证令牌"""
    token = create_access_token(
        subject=admin_user.id,
        extra_claims={"user_id": admin_user.id, "username": admin_user.username}
    )
    return token


@pytest_asyncio.fixture
async def admin_headers(admin_token: str) -> dict:
    """提供管理员认证请求头"""
    return {"Authorization": f"Bearer {admin_token}"}

import asyncio
import os
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

os.environ.setdefault("SECRET_KEY", "test-secret-key-for-testing-only-min-32-chars!!")
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./test.db")

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import StaticPool

import bcrypt
from app.main import create_application
from app.core.database import Base, get_async_session
from app.models.user import User, UserRole, UserStatus

TEST_DB_URL = "sqlite+aiosqlite://"

test_engine = create_async_engine(
    TEST_DB_URL,
    echo=False,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="function")
async def db_session():
    async with test_engine.begin() as conn:
        result = await conn.run_sync(
            lambda sync_conn: sync_conn.execute(
                text("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
            ).fetchall()
        )
        for (table_name,) in result:
            await conn.execute(text(f'DROP TABLE IF EXISTS "{table_name}"'))
        result = await conn.run_sync(
            lambda sync_conn: sync_conn.execute(
                text("SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'")
            ).fetchall()
        )
        for (index_name,) in result:
            await conn.execute(text(f'DROP INDEX IF EXISTS "{index_name}"'))
        await conn.run_sync(Base.metadata.create_all)

    async with TestSessionLocal() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture(scope="function")
async def test_app(db_session: AsyncSession):
    app = create_application()

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_async_session] = override_get_db

    yield app

    app.dependency_overrides.clear()


@pytest_asyncio.fixture(scope="function")
async def client(test_app):
    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture(scope="function")
async def test_user(db_session: AsyncSession):
    user = User(
        email="test@example.com",
        username="testuser",
        full_name="Test User",
        hashed_password=bcrypt.hashpw(
            "TestPass123!".encode("utf-8"), bcrypt.gensalt()
        ).decode("utf-8"),
        role=UserRole.TEACHER,
        is_active=True,
        token_version=1,
        security_question="What is your pet name?",
        hashed_security_answer=bcrypt.hashpw(
            "Fluffy".encode("utf-8"), bcrypt.gensalt()
        ).decode("utf-8"),
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture(scope="function")
async def inactive_user(db_session: AsyncSession):
    user = User(
        email="inactive@example.com",
        username="inactiveuser",
        full_name="Inactive User",
        hashed_password=bcrypt.hashpw(
            "InactivePass123!".encode("utf-8"), bcrypt.gensalt()
        ).decode("utf-8"),
        role=UserRole.TEACHER,
        is_active=False,
        status=UserStatus.INACTIVE,
        token_version=1,
        security_question="What city were you born in?",
        hashed_security_answer=bcrypt.hashpw(
            "Beijing".encode("utf-8"), bcrypt.gensalt()
        ).decode("utf-8"),
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture(scope="function")
async def locked_user(db_session: AsyncSession):
    from datetime import datetime, timedelta, timezone

    user = User(
        email="locked@example.com",
        username="lockeduser",
        full_name="Locked User",
        hashed_password=bcrypt.hashpw(
            "LockedPass123!".encode("utf-8"), bcrypt.gensalt()
        ).decode("utf-8"),
        role=UserRole.TEACHER,
        is_active=True,
        failed_login_attempts=5,
        locked_until=datetime.now(timezone.utc) + timedelta(minutes=30),
        token_version=1,
        security_question="What is your mother's maiden name?",
        hashed_security_answer=bcrypt.hashpw(
            "Smith".encode("utf-8"), bcrypt.gensalt()
        ).decode("utf-8"),
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture(scope="function")
async def auth_headers(client, test_user) -> dict:
    login_resp = await client.post("/api/v1/auth/login", json={
        "username": "testuser",
        "password": "TestPass123!",
    })
    token = login_resp.json()["token"]["access_token"]
    return {"Authorization": f"Bearer {token}"}

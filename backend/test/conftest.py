import asyncio
import os
from typing import AsyncGenerator
from types import SimpleNamespace
from uuid import UUID

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession

# Ensure test DB env before importing app modules
os.environ.setdefault("POSTGRES_DB", os.getenv("POSTGRES_DB_TEST", "sci_db_test"))

from app.config.settings import settings  # noqa: E402
from app.config.database import async_session_maker, engine  # noqa: E402
from app.models.base import Base  # noqa: E402
from app.models.user import User, UserRole  # noqa: E402
from app.core.security import hash_password, create_access_token  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture(scope="session")
def anyio_backend():  # httpx/pytest-asyncio compatibility
    return "asyncio"


@pytest.fixture(scope="session", autouse=True)
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session", autouse=True)
async def _create_schema():
    # Create all tables for tests (using the same metadata)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture()
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        yield session


@pytest_asyncio.fixture()
async def client() -> AsyncGenerator[AsyncClient, None]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver/api/v1") as ac:
        yield ac


@pytest.fixture()
def create_user(client: AsyncClient):
    async def _create_user(email: str, password: str, role: UserRole = UserRole.CREATOR, is_active: bool = True):
        # Create via API
        resp = await client.post(
            "/users",
            json={
                "email": email,
                "full_name": "Test User",
                "phone_number": "+14155550123",
                "organization": "Test Org",
                "password": password,
            },
            follow_redirects=True,
        )
        assert resp.status_code == 201, resp.text
        data = resp.json()
        user_id = UUID(data["id"]) if isinstance(data["id"], str) else data["id"]

        # Adjust role/is_active directly in DB if needed
        if role != UserRole.CREATOR or is_active is False:
            async with async_session_maker() as session:
                db_user = await session.get(User, user_id)
                if role != UserRole.CREATOR:
                    db_user.role = role
                if is_active is False:
                    db_user.is_active = False
                await session.flush()
                await session.commit()

        return SimpleNamespace(id=user_id, email=email, role=role, is_active=is_active)

    return _create_user


@pytest.fixture()
def auth_header_factory():
    def _make(user: User) -> dict[str, str]:
        token = create_access_token(str(user.id))
        return {"Authorization": f"Bearer {token}"}

    return _make



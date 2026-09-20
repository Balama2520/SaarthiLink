"""
Shared test fixtures for the Saarthi backend test suite.
All tests use an in-memory SQLite database so they run without any external services.
The AI provider and Redis are mocked by default.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database.connection import Base, get_db
from app.models.models import User
from app.services.auth_service import AuthService
from app.repositories.user_repository import UserRepository

# ── In-memory SQLite ─────────────────────────────────────────────────────────
SQLALCHEMY_DATABASE_URL = "sqlite://"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session():
    """Provide a clean database session for every test, torn down afterwards."""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    """FastAPI TestClient wired to the in-memory database."""

    def override_get_db():
        try:
            yield db_session
        finally:
            pass  # session lifecycle managed by db_session fixture

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def test_user(db_session):
    """Create a persisted test user and return the ORM object."""
    repo = UserRepository(db_session)
    auth_svc = AuthService(repo)
    user = auth_svc.register_user("testuser", "SecurePass123!")
    return user


@pytest.fixture
def auth_headers(client, test_user):
    """Return Bearer-token headers for the pre-created test_user."""
    response = client.post(
        "/api/auth/login",
        data={"username": "testuser", "password": "SecurePass123!"},
    )
    token = response.json().get("access_token", "")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(autouse=True)
def mock_ai_stream(request):
    """Patch the AI gateway so tests never call a real LLM unless marked live_ai."""
    if "live_ai" in request.keywords:
        yield
        return

    async def _fake_stream(*args, **kwargs):
        for chunk in ["Hello", " from", " mock", " AI"]:
            yield chunk

    with patch(
        "app.services.ai_service.generate_response_stream_async",
        side_effect=_fake_stream,
    ), patch(
        "app.ai.gateway.AIGateway.generate_response_stream",
        side_effect=_fake_stream,
    ):
        yield


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    """Reset simple rate limiter before each test."""
    from app.core.rate_limit import rate_limiter

    rate_limiter.reset()
    yield
    rate_limiter.reset()


@pytest.fixture(autouse=True)
def mock_redis():
    """Keep ordinary tests deterministic when optional Redis is unavailable."""
    with patch("app.memory.redis_client.redis_memory") as mock, patch(
        "app.services.career_copilot_service.redis_memory", mock
    ), patch("app.core.cache.cache.connect", new_callable=AsyncMock), patch(
        "app.core.cache.cache.close", new_callable=AsyncMock
    ):
        mock.add_message = MagicMock()
        mock.get_history = MagicMock(return_value=[])
        mock.invalidate_cache = MagicMock()
        mock.get_cache = MagicMock(return_value=None)
        mock.set_cache = MagicMock()
        yield mock

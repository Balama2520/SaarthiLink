"""
Unit + integration tests for rate limiting (FR-13, FR-15).

Sync test style (matches conftest.py / existing suite). Async limiter calls
are wrapped with asyncio.run() inside the sync test functions.
"""

import asyncio
import pytest
from unittest.mock import patch, AsyncMock

from app.core.rate_limit import SimpleRateLimiter
from app.core.config import get_settings


@pytest.fixture
def tiny_window():
    """Override settings to a small 3-req / 0.1s window so tests run in <1s."""
    s = get_settings()
    prev = (
        s.RATE_LIMIT_ENABLED,
        s.RATE_LIMIT_REQUESTS_PER_MINUTE,
        s.RATE_LIMIT_WINDOW_SECONDS,
    )
    s.RATE_LIMIT_ENABLED = True
    s.RATE_LIMIT_REQUESTS_PER_MINUTE = 3
    s.RATE_LIMIT_WINDOW_SECONDS = 0.1
    yield s
    (
        s.RATE_LIMIT_ENABLED,
        s.RATE_LIMIT_REQUESTS_PER_MINUTE,
        s.RATE_LIMIT_WINDOW_SECONDS,
    ) = prev


def test_rate_limiter_under_limit_passes(tiny_window):
    """TR-15.1a: First N-1 requests in-window all PASS."""
    limiter = SimpleRateLimiter()
    limiter._memory.clear()
    cap = tiny_window.RATE_LIMIT_REQUESTS_PER_MINUTE  # 3

    results = []
    for i in range(cap - 1):  # 2 calls
        results.append(asyncio.run(limiter.allow("client-under")))
    assert (
        all(results) is True
    ), f"Expected every under-limit call to pass, got {results}"


def test_rate_limiter_over_limit_blocks(tiny_window):
    """TR-15.1b: N+1th request in same window BLOCKS with False; window rollover allows again."""
    limiter = SimpleRateLimiter()
    limiter._memory.clear()
    cap = tiny_window.RATE_LIMIT_REQUESTS_PER_MINUTE  # 3

    # Consume exactly the cap (3 requests) — all pass
    for i in range(cap):
        ok = asyncio.run(limiter.allow("client-over"))
        assert ok is True, f"Request #{i+1} within cap should pass"

    # Request #4 inside the SAME 0.1s window — MUST block
    blocked = asyncio.run(limiter.allow("client-over"))
    assert (
        blocked is False
    ), "Request N+1 inside the unexpired window must be rejected (False)"

    # After window expires, allow again
    import time as _t

    _t.sleep(tiny_window.RATE_LIMIT_WINDOW_SECONDS + 0.02)
    allowed_after = asyncio.run(limiter.allow("client-over"))
    assert (
        allowed_after is True
    ), "After rolling window elapses requests must pass again"


def test_rate_limiter_disabled_allow_all(tiny_window):
    """When RATE_LIMIT_ENABLED=False, every call is allowed regardless of count."""
    tiny_window.RATE_LIMIT_ENABLED = False
    limiter = SimpleRateLimiter()
    limiter._memory.clear()

    for _ in range(200):
        assert asyncio.run(limiter.allow("any-key")) is True


def test_429_response_shape_has_detail_and_request_id(client):
    """TR-15.1c: Integration — when limiter rejects, middleware returns 429 JSON
    with `detail="Too many requests"` AND non-empty `request_id`.

    main.py does `from app.core.rate_limit import rate_limiter` which creates a
    module-level name `rate_limiter` inside app.main.* — patch that binding.
    """
    with patch("app.main.rate_limiter") as mock_svc:
        # Force rate_limiter.allow() to reject every call
        mock_svc.allow = AsyncMock(return_value=False)
        # Any /api/* endpoint triggers the middleware branch (starts with /api)
        res = client.get("/api/health")
    assert (
        res.status_code == 429
    ), f"Expected 429 when limiter blocks, got {res.status_code}"
    body = res.json()
    assert (
        body.get("detail") == "Too many requests"
    ), f"429 response `detail` field must be 'Too many requests' for human-friendly UI; got {body.get('detail')!r}"
    rid = body.get("request_id")
    assert (
        isinstance(rid, str) and len(rid) > 0
    ), f"429 body must include non-empty request_id trace, got {rid!r}"

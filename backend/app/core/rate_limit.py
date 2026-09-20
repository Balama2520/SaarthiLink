import logging
import time
from collections import defaultdict, deque
from typing import Deque, Dict

from app.core.cache import cache
from app.core.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


class SimpleRateLimiter:
    """Small request throttler that uses Redis when available and a local fallback otherwise."""

    def __init__(self) -> None:
        self._memory: Dict[str, Deque[float]] = defaultdict(deque)

    async def allow(self, key: str) -> bool:
        if not settings.RATE_LIMIT_ENABLED:
            return True

        if cache.redis_client:
            try:
                redis_key = f"rate_limit:{key}"
                current = await cache.redis_client.incr(redis_key)
                if current == 1:
                    await cache.redis_client.expire(
                        redis_key, settings.RATE_LIMIT_WINDOW_SECONDS
                    )
                return current <= settings.RATE_LIMIT_REQUESTS_PER_MINUTE
            except Exception as exc:
                logger.warning(
                    "Redis-backed rate limiting failed, using fallback behavior",
                    extra={"error": str(exc)},
                )

        now = time.time()
        window = self._memory[key]
        while window and now - window[0] > settings.RATE_LIMIT_WINDOW_SECONDS:
            window.popleft()

        if len(window) >= settings.RATE_LIMIT_REQUESTS_PER_MINUTE:
            if settings.DEBUG:
                logger.info(
                    "Rate limiting fallback triggered for development traffic",
                    extra={"rate_limit_key": key},
                )
            else:
                logger.error(
                    "Rate limiting is enabled but Redis is unavailable; rejecting request",
                    extra={"rate_limit_key": key},
                )
            return False

        window.append(now)
        return True

    def reset(self) -> None:
        """Clear rate limiting memory (useful for testing)."""
        self._memory.clear()


rate_limiter = SimpleRateLimiter()

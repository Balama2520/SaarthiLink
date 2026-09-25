import redis.asyncio as redis
import json
import logging
from typing import Optional, Any
from app.core.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


class RedisCache:
    def __init__(self):
        self.redis_client = None

    async def connect(self):
        if not settings.REDIS_URL or not settings.REDIS_URL.strip():
            logger.info("REDIS_URL is not configured. Redis caching disabled (optional layer).")
            self.redis_client = None
            return
        try:
            self.redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
            await self.redis_client.ping()
            logger.info("Connected to Redis cache.")
        except Exception as e:
            logger.warning(f"Failed to connect to Redis: {e}. Caching will be disabled.")
            self.redis_client = None

    async def get(self, key: str) -> Optional[Any]:
        if not self.redis_client:
            return None
        try:
            val = await self.redis_client.get(key)
            if val:
                return json.loads(val)
            return None
        except Exception as e:
            logger.error(f"Redis GET error: {e}")
            return None

    async def set(self, key: str, value: Any, expire_secs: int = 300):
        if not self.redis_client:
            return
        try:
            await self.redis_client.set(key, json.dumps(value), ex=expire_secs)
        except Exception as e:
            logger.error(f"Redis SET error: {e}")

    async def delete(self, key: str):
        if not self.redis_client:
            return
        try:
            await self.redis_client.delete(key)
        except Exception as e:
            logger.error(f"Redis DELETE error: {e}")

    async def close(self):
        if self.redis_client:
            await self.redis_client.close()


# Global cache instance
cache = RedisCache()

import redis
import json
import logging
import os

logger = logging.getLogger(__name__)

REDIS_URL = os.getenv("REDIS_URL", "")


class RedisMemory:
    def __init__(self):
        self.client = None
        if not REDIS_URL:
            logger.info("REDIS_URL not set; Redis disabled (graceful degrade).")
            return
        try:
            self.client = redis.Redis.from_url(
                REDIS_URL,
                decode_responses=True,
                socket_connect_timeout=1,
                socket_timeout=1,
                retry_on_timeout=False,
            )
            logger.info("Redis client configured; availability will be checked on use.")
        except Exception as e:
            logger.warning(
                f"Redis not available: {e}. Falling back to DB for short-term memory."
            )
            self.client = None

    def save_session_context(self, session_id: str, context: list):
        if not self.client:
            return
        try:
            self.client.setex(f"session:{session_id}", 3600, json.dumps(context))
        except Exception as e:
            logger.error(f"Redis save error: {e}")

    def get_session_context(self, session_id: str) -> list:
        if not self.client:
            return None
        try:
            data = self.client.get(f"session:{session_id}")
            if data:
                return json.loads(data)
        except Exception as e:
            logger.error(f"Redis get error: {e}")
        return None

    def get_cache(self, key: str):
        if not self.client:
            return None
        try:
            data = self.client.get(key)
            if data:
                return json.loads(data)
        except Exception as e:
            logger.error(f"Redis get cache error: {e}")
        return None

    def set_cache(self, key: str, value: any, ttl_secs: int = 300):
        if not self.client:
            return
        try:
            self.client.setex(key, ttl_secs, json.dumps(value))
        except Exception as e:
            logger.error(f"Redis set cache error: {e}")

    def invalidate_cache(self, key: str):
        if not self.client:
            return
        try:
            self.client.delete(key)
        except Exception as e:
            logger.error(f"Redis invalidate cache error: {e}")


redis_memory = RedisMemory()

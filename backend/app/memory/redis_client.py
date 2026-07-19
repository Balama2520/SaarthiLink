import redis
import json
import logging
import os

logger = logging.getLogger(__name__)

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

class RedisMemory:
    def __init__(self):
        self.client = None
        try:
            self.client = redis.Redis.from_url(REDIS_URL, decode_responses=True)
            self.client.ping()
            logger.info("Connected to Redis successfully.")
        except Exception as e:
            logger.warning(f"Redis not available: {e}. Falling back to DB for short-term memory.")
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

redis_memory = RedisMemory()

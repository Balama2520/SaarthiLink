import asyncio
import logging

logger = logging.getLogger(__name__)


async def with_retry(func, max_retries=3, delay=1.0, *args, **kwargs):
    last_exception = None
    for attempt in range(max_retries):
        try:
            return await func(*args, **kwargs)
        except Exception as e:
            last_exception = e
            logger.warning(f"Attempt {attempt+1} failed: {e}. Retrying in {delay}s...")
            await asyncio.sleep(delay)
    raise last_exception

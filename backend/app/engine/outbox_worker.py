"""
Event Outbox Worker
-------------------
Processes domain events from the EventOutbox table and dispatches them to
in-process subscribers.

Design Principles
- Clean interface: swap out for Celery/RedisQ by replacing `_get_transport`
  without touching any engine code.
- Idempotent: each event is processed exactly once (PROCESSED status).
- Resilient: errors are caught, logged, and the event is marked FAILED so
  the batch does not stall.
"""

import asyncio
import json
import logging
from typing import Callable, Dict, List
from sqlalchemy.orm import Session

from app.models.models import EventOutbox

logger = logging.getLogger(__name__)


# ── Subscriber Registry ───────────────────────────────────────────────────────
# Map event_type -> list of async callable handlers.
# Handlers are registered at import time; engines and services call `subscribe`.

_subscribers: Dict[str, List[Callable]] = {}


def subscribe(event_type: str, handler: Callable):
    """Register an async event handler for a given domain event type."""
    _subscribers.setdefault(event_type, []).append(handler)
    logger.debug(f"[EventBus] Registered handler for '{event_type}': {handler.__name__}")


async def _dispatch(event_type: str, payload: dict):
    """Fire all registered handlers for the event type."""
    handlers = _subscribers.get(event_type, [])
    if not handlers:
        logger.debug(f"[EventBus] No handlers registered for '{event_type}'")
        return

    for handler in handlers:
        try:
            await handler(payload)
            logger.info(f"[EventBus] Handler '{handler.__name__}' processed '{event_type}'")
        except Exception as exc:
            logger.error(
                f"[EventBus] Handler '{handler.__name__}' failed for '{event_type}': {exc}",
                exc_info=True,
            )
            raise


# ── Worker ────────────────────────────────────────────────────────────────────


class OutboxWorker:
    """
    Lightweight in-process asyncio worker.

    Runs as a background task attached to the FastAPI lifespan.
    Polls the EventOutbox table at a configurable interval and dispatches
    PENDING events to registered handlers.

    To swap this for Celery, implement an identical interface in
    `app/engine/celery_worker.py` and change the import in `main.py`.
    """

    def __init__(
        self,
        db_factory: Callable[[], Session],
        poll_interval: float = 5.0,
        max_retries: int = 3,
    ):
        self._db_factory = db_factory
        self._poll_interval = poll_interval
        self._max_retries = max_retries
        self._running = False

    async def start(self):
        """Start the polling loop."""
        self._running = True
        logger.info("[OutboxWorker] Started (poll_interval=%.1fs)", self._poll_interval)
        while self._running:
            try:
                await self._process_batch()
            except Exception as exc:
                logger.error(f"[OutboxWorker] Batch error: {exc}", exc_info=True)
            await asyncio.sleep(self._poll_interval)

    def stop(self):
        self._running = False
        logger.info("[OutboxWorker] Stopped.")

    async def drain(self):
        """Make one final best-effort pass during application shutdown."""
        try:
            await self._process_batch()
        except Exception as exc:
            logger.error("[OutboxWorker] Shutdown drain failed: %s", exc, exc_info=True)

    async def _process_batch(self):
        db: Session = self._db_factory()
        try:
            try:
                pending = (
                    db.query(EventOutbox)
                    .filter(EventOutbox.status == "PENDING")
                    .order_by(EventOutbox.created_at)
                    .limit(50)
                    .all()
                )
            except Exception as exc:
                logger.warning("[OutboxWorker] Could not query EventOutbox: %s", exc)
                return

            if not pending:
                return

            logger.info(f"[OutboxWorker] Processing {len(pending)} pending event(s).")

            for event in pending:
                try:
                    payload = json.loads(event.payload_json)
                    await _dispatch(event.event_type, payload)
                    event.status = "PROCESSED"
                except Exception as exc:
                    logger.error(
                        f"[OutboxWorker] Failed to dispatch event {event.id} "
                        f"(type={event.event_type}): {exc}",
                        exc_info=True,
                    )
                    event.retry_count = (event.retry_count or 0) + 1
                    event.last_error = str(exc)[:1000]
                    event.status = (
                        "DEAD_LETTER" if event.retry_count >= self._max_retries else "PENDING"
                    )
                    if event.status == "DEAD_LETTER":
                        logger.error(
                            "[OutboxWorker] Event %s moved to dead letter after %s attempts.",
                            event.id,
                            event.retry_count,
                        )

            db.commit()
        finally:
            db.close()

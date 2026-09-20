"""
Integration tests for the OutboxWorker.
Verifies events move from PENDING -> PROCESSED and handlers are invoked.
"""

import asyncio
import json
import pytest

from app.engine.outbox_worker import OutboxWorker, subscribe
from app.engine.events import EventPublisher
from app.models.models import EventOutbox


@pytest.fixture(autouse=True)
def clear_subscribers():
    """Reset subscriber registry between tests."""
    from app.engine import outbox_worker as ow

    original = dict(ow._subscribers)
    ow._subscribers.clear()
    yield
    ow._subscribers.clear()
    ow._subscribers.update(original)


class TestOutboxWorker:
    def test_pending_event_is_marked_processed(self, db_session):
        publisher = EventPublisher(db_session)
        publisher.publish("GoalCreated", {"goal_id": "g-1"})

        handled = []

        async def handler(payload):
            handled.append(payload)

        subscribe("GoalCreated", handler)

        worker = OutboxWorker(db_factory=lambda: db_session, poll_interval=0.1)
        asyncio.run(worker._process_batch())

        event = db_session.query(EventOutbox).first()
        assert event.status == "PROCESSED"

    def test_handler_receives_correct_payload(self, db_session):
        publisher = EventPublisher(db_session)
        publisher.publish("TaskCompleted", {"task_id": "t-99", "user_id": 5})

        received_payloads = []

        async def handler(payload):
            received_payloads.append(payload)

        subscribe("TaskCompleted", handler)

        worker = OutboxWorker(db_factory=lambda: db_session, poll_interval=0.1)
        asyncio.run(worker._process_batch())

        assert len(received_payloads) == 1
        assert received_payloads[0]["task_id"] == "t-99"

    def test_failed_handler_is_requeued_before_dead_letter(self, db_session):
        publisher = EventPublisher(db_session)
        publisher.publish("GoalUpdated", {"goal_id": "g-broken"})

        async def broken_handler(payload):
            raise RuntimeError("Simulated handler failure")

        subscribe("GoalUpdated", broken_handler)

        worker = OutboxWorker(db_factory=lambda: db_session, poll_interval=0.1)
        asyncio.run(worker._process_batch())

        event = db_session.query(EventOutbox).first()
        assert event.status == "PENDING"
        assert event.retry_count == 1
        assert "Simulated handler failure" in event.last_error

    def test_repeated_failures_move_event_to_dead_letter(self, db_session):
        publisher = EventPublisher(db_session)
        publisher.publish("GoalUpdated", {"goal_id": "g-broken"})

        async def broken_handler(payload):
            raise RuntimeError("Simulated handler failure")

        subscribe("GoalUpdated", broken_handler)
        worker = OutboxWorker(
            db_factory=lambda: db_session, poll_interval=0.1, max_retries=2
        )
        asyncio.run(worker._process_batch())
        asyncio.run(worker._process_batch())

        event = db_session.query(EventOutbox).first()
        assert event.status == "DEAD_LETTER"
        assert event.retry_count == 2

    def test_events_without_handlers_are_processed_silently(self, db_session):
        publisher = EventPublisher(db_session)
        publisher.publish("UnknownEvent", {"foo": "bar"})

        worker = OutboxWorker(db_factory=lambda: db_session, poll_interval=0.1)
        asyncio.run(worker._process_batch())

        # No handler — still marked PROCESSED (nothing to fail)
        event = db_session.query(EventOutbox).first()
        assert event.status == "PROCESSED"

    def test_no_pending_events_is_a_noop(self, db_session):
        worker = OutboxWorker(db_factory=lambda: db_session, poll_interval=0.1)
        # Should not raise
        asyncio.run(worker._process_batch())

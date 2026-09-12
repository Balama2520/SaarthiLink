"""
Unit tests for the WorkflowEngine and EventPublisher.
"""
import json
import pytest

from app.engine.workflow import WorkflowEngine
from app.engine.events import EventPublisher
from app.models.models import WorkflowState, EventOutbox


class TestWorkflowEngine:
    def test_start_workflow_creates_record(self, db_session):
        engine = WorkflowEngine(db_session)
        wf = engine.start_workflow(
            user_id=1,
            workflow_type="PrepareForJob",
            initial_context={"job_id": "job-99"},
        )
        assert wf.id is not None
        assert wf.status == "ACTIVE"
        assert wf.workflow_type == "PrepareForJob"
        assert "job_id" in json.loads(wf.context_payload)

    def test_start_suspends_existing_active_workflow(self, db_session):
        engine = WorkflowEngine(db_session)
        wf1 = engine.start_workflow(1, "Flow1", {})
        wf2 = engine.start_workflow(1, "Flow2", {})  # should suspend wf1

        db_session.refresh(wf1)
        assert wf1.status == "SUSPENDED"
        assert wf2.status == "ACTIVE"

    def test_advance_workflow_updates_step(self, db_session):
        engine = WorkflowEngine(db_session)
        wf = engine.start_workflow(1, "Flow", {"key": "val"})

        updated = engine.advance_workflow(wf.id, "STEP_2", {"extra": "data"})
        assert updated.current_step == "STEP_2"
        payload = json.loads(updated.context_payload)
        assert payload["extra"] == "data"
        assert payload["key"] == "val"  # original context preserved

    def test_complete_workflow_updates_status(self, db_session):
        engine = WorkflowEngine(db_session)
        wf = engine.start_workflow(1, "Flow", {})
        completed = engine.complete_workflow(wf.id)
        assert completed.status == "COMPLETED"

    def test_complete_workflow_emits_event(self, db_session):
        engine = WorkflowEngine(db_session)
        wf = engine.start_workflow(1, "Flow", {})
        engine.complete_workflow(wf.id)

        events = db_session.query(EventOutbox).filter(
            EventOutbox.event_type == "WorkflowCompleted"
        ).all()
        assert len(events) == 1

    def test_get_active_workflow_returns_active_only(self, db_session):
        engine = WorkflowEngine(db_session)
        engine.start_workflow(1, "Flow", {})
        active = engine.get_active_workflow(1)
        assert active is not None
        assert active.status == "ACTIVE"

    def test_get_active_workflow_returns_none_for_new_user(self, db_session):
        engine = WorkflowEngine(db_session)
        result = engine.get_active_workflow(user_id=999)
        assert result is None

    def test_resume_workflow_reactivates_suspended(self, db_session):
        engine = WorkflowEngine(db_session)
        wf1 = engine.start_workflow(1, "Flow1", {})
        wf2 = engine.start_workflow(1, "Flow2", {})  # suspends wf1

        db_session.refresh(wf1)
        assert wf1.status == "SUSPENDED"

        resumed = engine.resume_workflow(wf1.id)
        db_session.refresh(wf2)
        assert resumed.status == "ACTIVE"
        assert wf2.status == "SUSPENDED"


class TestEventPublisher:
    def test_publish_creates_outbox_record(self, db_session):
        publisher = EventPublisher(db_session)
        publisher.publish("GoalCreated", {"goal_id": "g-1", "user_id": 1})

        events = db_session.query(EventOutbox).all()
        assert len(events) == 1
        assert events[0].event_type == "GoalCreated"
        assert events[0].status == "PENDING"

    def test_published_payload_is_valid_json(self, db_session):
        publisher = EventPublisher(db_session)
        publisher.publish("TaskCompleted", {"task_id": "t-42"})

        event = db_session.query(EventOutbox).first()
        payload = json.loads(event.payload_json)
        assert payload["task_id"] == "t-42"

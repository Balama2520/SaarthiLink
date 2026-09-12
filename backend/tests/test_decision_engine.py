"""
Unit tests for the DecisionEngine — heuristics + logging.
"""
import json
import pytest
from unittest.mock import patch

from app.engine.decision import DecisionEngine
from app.models.models import DecisionLog


SYSTEM_STATE_WITH_WORKFLOW = (
    "--- CORE MEMORIES ---\n"
    "--- ACTIVE MULTI-MODULE WORKFLOW ---\n"
    '{"workflow_type": "PrepareForJob"}\n'
)

SYSTEM_STATE_WITH_BLOCKER = (
    "--- PLANNING STATE ---\n"
    '{"recommended_next_action": "RESOLVE_BLOCKER"}\n'
)

SYSTEM_STATE_PLAIN = "--- CORE MEMORIES ---\nNo historical memory found."


class TestDecisionEngineHeuristics:
    def test_workflow_advance_on_next(self, db_session):
        engine = DecisionEngine(db_session)
        decision = engine.evaluate(1, SYSTEM_STATE_WITH_WORKFLOW, "next")
        assert decision["intent_category"] == "WORKFLOW_ADVANCE"

    def test_workflow_advance_on_continue(self, db_session):
        engine = DecisionEngine(db_session)
        decision = engine.evaluate(1, SYSTEM_STATE_WITH_WORKFLOW, "continue")
        assert decision["intent_category"] == "WORKFLOW_ADVANCE"

    def test_proactive_suggestion_on_blocker(self, db_session):
        engine = DecisionEngine(db_session)
        decision = engine.evaluate(1, SYSTEM_STATE_WITH_BLOCKER, "what should i do")
        assert decision["intent_category"] == "PROACTIVE_SUGGESTION"

    def test_use_tool_on_explicit_goal_update(self, db_session):
        engine = DecisionEngine(db_session)
        decision = engine.evaluate(1, SYSTEM_STATE_PLAIN, "please update my goal")
        assert decision["intent_category"] == "USE_TOOL"
        assert decision["selected_tool"] == "update_goal_status"

    def test_direct_response_as_default(self, db_session):
        engine = DecisionEngine(db_session)
        decision = engine.evaluate(1, SYSTEM_STATE_PLAIN, "What is recursion?")
        assert decision["intent_category"] == "DIRECT_RESPONSE"


class TestDecisionEngineLogging:
    def test_every_decision_is_logged(self, db_session):
        engine = DecisionEngine(db_session)
        engine.evaluate(1, SYSTEM_STATE_PLAIN, "Hello")
        logs = db_session.query(DecisionLog).filter(DecisionLog.user_id == 1).all()
        assert len(logs) == 1

    def test_logged_decision_has_valid_json(self, db_session):
        engine = DecisionEngine(db_session)
        engine.evaluate(1, SYSTEM_STATE_PLAIN, "Test query")
        log = db_session.query(DecisionLog).first()
        decision_data = json.loads(log.decision_json)
        assert "intent_category" in decision_data

    def test_execution_time_is_recorded(self, db_session):
        engine = DecisionEngine(db_session)
        engine.evaluate(1, SYSTEM_STATE_PLAIN, "Timing test")
        log = db_session.query(DecisionLog).first()
        assert log.execution_time_ms >= 0

    def test_state_hash_is_stored(self, db_session):
        engine = DecisionEngine(db_session)
        engine.evaluate(1, SYSTEM_STATE_PLAIN, "Hash test")
        log = db_session.query(DecisionLog).first()
        assert log.input_state_hash is not None
        assert len(log.input_state_hash) == 64  # SHA-256 hex

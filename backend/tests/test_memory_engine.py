"""
Unit tests for the WorkingMemoryEngine.
"""

import pytest
from datetime import datetime, timezone
from unittest.mock import MagicMock

from app.memory.engine import WorkingMemoryEngine
from app.models.models import Memory, UserProfile


def _make_memory(
    db,
    user_id: int,
    mem_type: str,
    subject: str,
    value: str,
    importance: float = 1.0,
    confidence: float = 1.0,
    days_old: int = 0,
) -> Memory:
    from datetime import timedelta

    ts = datetime.now(timezone.utc) - timedelta(days=days_old)
    mem = Memory(
        user_id=user_id,
        type=mem_type,
        category="test",
        subject=subject,
        value=value,
        confidence=confidence,
        importance=importance,
        source="test",
        created_at=ts,
        updated_at=ts,
    )
    db.add(mem)
    db.commit()
    db.refresh(mem)
    return mem


class TestWorkingMemoryEngine:
    def test_retrieve_returns_empty_for_new_user(self, db_session):
        engine = WorkingMemoryEngine(db_session)
        results = engine.retrieve_and_rank_memories(user_id=999, query_context="test")
        assert results == []

    def test_retrieve_ranks_by_importance(self, db_session):
        engine = WorkingMemoryEngine(db_session)
        _make_memory(db_session, 1, "SKILL", "Python", "Expert", importance=0.2)
        _make_memory(db_session, 1, "SKILL", "React", "Beginner", importance=0.9)

        results = engine.retrieve_and_rank_memories(user_id=1, query_context="")
        # Higher importance should rank higher
        assert results[0].subject == "React"

    def test_retrieve_relevance_boosts_on_keyword_match(self, db_session):
        engine = WorkingMemoryEngine(db_session)
        _make_memory(db_session, 1, "FACT", "Leetcode", "Practices daily", importance=0.5)
        _make_memory(db_session, 1, "FACT", "Sleep", "Sleeps 8 hours", importance=0.5)

        # Query that mentions "leetcode" should boost that memory
        results = engine.retrieve_and_rank_memories(
            user_id=1, query_context="leetcode hard problem"
        )
        assert results[0].subject == "Leetcode"

    def test_retrieve_respects_limit(self, db_session):
        engine = WorkingMemoryEngine(db_session)
        for i in range(10):
            _make_memory(db_session, 1, "FACT", f"Fact{i}", f"value{i}")

        results = engine.retrieve_and_rank_memories(user_id=1, query_context="", limit=5)
        assert len(results) == 5

    def test_assemble_context_returns_dict(self, db_session):
        engine = WorkingMemoryEngine(db_session)
        result = engine.assemble_context(
            user_id=999,
            session_id="sess-1",
            ui_context={"route": "/dashboard"},
            current_message="Hello",
        )
        assert "system_prompt_augmentation" in result
        assert "raw_memories" in result

    def test_assemble_context_includes_profile(self, db_session):
        profile = UserProfile(
            user_id=1,
            headline="Software Engineer",
            target_role="Staff SWE",
            career_stage="mid",
            background_summary="5 years Python exp",
        )
        db_session.add(profile)
        db_session.commit()

        engine = WorkingMemoryEngine(db_session)
        result = engine.assemble_context(
            user_id=1, session_id="s", ui_context={}, current_message="Hi"
        )
        assert "Staff SWE" in result["system_prompt_augmentation"]

    def test_assemble_context_includes_ui_context(self, db_session):
        engine = WorkingMemoryEngine(db_session)
        result = engine.assemble_context(
            user_id=999,
            session_id="sess-1",
            ui_context={"active_module": "JobFinder", "viewing_entity_id": "job-42"},
            current_message="Tell me about this job",
        )
        assert "JobFinder" in result["system_prompt_augmentation"]

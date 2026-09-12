"""
Unit tests for the GoalEngine.
"""
import pytest
from datetime import datetime, timezone, timedelta

from app.engine.goal import GoalEngine
from app.models.models import Goal, Memory


def _create_goal(db, user_id: int, title: str, goal_type: str = "GOAL",
                 status: str = "ACTIVE", parent_id=None,
                 progress: int = 0, due_days_from_now: int = None) -> Goal:
    due_date = None
    if due_days_from_now is not None:
        due_date = (datetime.now(timezone.utc) + timedelta(days=due_days_from_now)).isoformat()

    goal = Goal(
        user_id=user_id,
        parent_id=parent_id,
        type=goal_type,
        title=title,
        status=status,
        progress=progress,
        due_date=due_date,
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal


class TestGoalEngineHealth:
    def test_completed_goal_has_full_health(self, db_session):
        engine = GoalEngine(db_session)
        goal = _create_goal(db_session, 1, "G1", status="COMPLETED")
        assert engine.calculate_health(goal) == 1.0

    def test_archived_goal_has_full_health(self, db_session):
        engine = GoalEngine(db_session)
        goal = _create_goal(db_session, 1, "G1", status="ARCHIVED")
        assert engine.calculate_health(goal) == 1.0

    def test_overdue_goal_reduces_health(self, db_session):
        engine = GoalEngine(db_session)
        goal = _create_goal(db_session, 1, "G1", status="ACTIVE", due_days_from_now=-3)
        health = engine.calculate_health(goal)
        assert health < 1.0

    def test_high_progress_partially_restores_health(self, db_session):
        engine = GoalEngine(db_session)
        # Overdue but high progress
        goal = _create_goal(db_session, 1, "G1", status="ACTIVE",
                            due_days_from_now=-3, progress=90)
        health_high = engine.calculate_health(goal)
        goal2 = _create_goal(db_session, 1, "G2", status="ACTIVE",
                             due_days_from_now=-3, progress=10)
        health_low = engine.calculate_health(goal2)
        assert health_high > health_low

    def test_health_clamped_between_0_and_1(self, db_session):
        engine = GoalEngine(db_session)
        goal = _create_goal(db_session, 1, "G1", status="ACTIVE", due_days_from_now=-100)
        health = engine.calculate_health(goal)
        assert 0.0 <= health <= 1.0


class TestGoalEnginePlanningState:
    def test_no_active_goals_returns_sentinel(self, db_session):
        engine = GoalEngine(db_session)
        state = engine.get_planning_state(user_id=999)
        assert state["status"] == "NO_ACTIVE_GOALS"

    def test_active_goal_returned_in_state(self, db_session):
        engine = GoalEngine(db_session)
        _create_goal(db_session, 1, "Become SWE", status="ACTIVE")
        state = engine.get_planning_state(user_id=1)
        assert state["current_goal"]["title"] == "Become SWE"

    def test_active_milestone_surfaced(self, db_session):
        engine = GoalEngine(db_session)
        parent = _create_goal(db_session, 1, "Become SWE", status="ACTIVE")
        _create_goal(db_session, 1, "Learn Python", "MILESTONE", "ACTIVE", parent_id=parent.id)
        state = engine.get_planning_state(user_id=1)
        assert state["active_milestone"]["title"] == "Learn Python"

    def test_overdue_tasks_detected(self, db_session):
        engine = GoalEngine(db_session)
        parent = _create_goal(db_session, 1, "Become SWE", status="ACTIVE")
        milestone = _create_goal(db_session, 1, "M1", "MILESTONE", "ACTIVE", parent_id=parent.id)
        _create_goal(db_session, 1, "Overdue Task", "TASK", "ACTIVE",
                     parent_id=milestone.id, due_days_from_now=-2)
        state = engine.get_planning_state(user_id=1)
        assert len(state["overdue_tasks"]) == 1


class TestGoalEngineMilestoneCompletion:
    def test_completing_milestone_writes_achievement_memory(self, db_session):
        engine = GoalEngine(db_session)
        parent = _create_goal(db_session, 2, "Top Goal", status="ACTIVE")
        milestone = _create_goal(db_session, 2, "Master Python", "MILESTONE", "ACTIVE", parent_id=parent.id)

        engine.process_milestone_completion(milestone.id)

        achievement = db_session.query(Memory).filter(
            Memory.user_id == 2,
            Memory.type == "ACHIEVEMENT"
        ).first()
        assert achievement is not None
        assert "Master Python" in achievement.value

    def test_completing_milestone_updates_parent_progress(self, db_session):
        engine = GoalEngine(db_session)
        parent = _create_goal(db_session, 2, "Top Goal", status="ACTIVE")
        m1 = _create_goal(db_session, 2, "M1", "MILESTONE", "COMPLETED", parent_id=parent.id)
        m2 = _create_goal(db_session, 2, "M2", "MILESTONE", "ACTIVE", parent_id=parent.id)

        engine.process_milestone_completion(m2.id)
        db_session.refresh(parent)
        # 2/2 milestones done = 100%
        assert parent.progress == 100

import logging
import json
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from app.models.models import Goal, GoalDependency, GoalTemplate, Memory, UserProfile
from app.services import ai_service  # Assuming an LLM wrapper is here

logger = logging.getLogger(__name__)


class GoalEngine:
    def __init__(self, db: Session):
        self.db = db

    def calculate_health(self, goal: Goal) -> float:
        """
        Calculates the health of a goal (0.0 to 1.0) based on:
        - progress
        - overdue tasks
        - blocked dependencies
        - inactivity
        - completion velocity
        """
        if goal.status in ["COMPLETED", "ARCHIVED"]:
            return 1.0

        health = 1.0
        now = datetime.now(timezone.utc)

        # Inactivity Penalty (e.g. not updated in 7 days)
        if hasattr(goal, "updated_at") and goal.updated_at:
            days_inactive = (now - goal.updated_at.replace(tzinfo=timezone.utc)).days
        else:
            days_inactive = (now - goal.created_at.replace(tzinfo=timezone.utc)).days

        if days_inactive > 7:
            health -= min(0.3, (days_inactive - 7) * 0.05)

        # Overdue Penalty (if it's a task)
        if goal.due_date:
            try:
                due = datetime.fromisoformat(goal.due_date.replace("Z", "+00:00"))
                if now > due:
                    health -= 0.2
            except Exception:
                pass

        # Blocked Dependency Penalty
        dependencies = (
            self.db.query(GoalDependency)
            .filter(GoalDependency.goal_id == goal.id)
            .all()
        )
        for dep in dependencies:
            dep_goal = self.db.query(Goal).filter(Goal.id == dep.depends_on_id).first()
            if dep_goal and dep_goal.status != "COMPLETED":
                # If a blocking task isn't done and is overdue or blocked itself, penalize
                if dep_goal.status in ["BLOCKED", "FAILED"]:
                    health -= 0.3

        # Velocity / Progress modifier
        # If health dropped but progress is high (>80%), give a slight boost back
        if health < 1.0 and goal.progress > 80:
            health += 0.1

        return max(0.0, min(1.0, health))

    def generate_plan_from_template(
        self, user_id: int, template_id: str, user_context: str
    ) -> Goal:
        """
        Template -> Personalization -> Milestones -> JIT Tasks
        """
        template = (
            self.db.query(GoalTemplate).filter(GoalTemplate.id == template_id).first()
        )
        if not template:
            raise ValueError("Template not found")

        # 1. Create Top-level Goal
        top_goal = Goal(
            user_id=user_id,
            type="GOAL",
            title=template.name,
            description=template.description,
            status="PLANNING",
            is_ai_managed=True,
        )
        self.db.add(top_goal)
        self.db.commit()
        self.db.refresh(top_goal)

        # 2. Parse Template Structure (Milestones)
        structure = json.loads(template.structure_json)

        # Personalization (Mock AI call - in reality, would call LLM to adjust milestones)
        # ai_adjusted_structure = ai_service.personalize_plan(structure, user_context)

        for idx, m_data in enumerate(structure.get("milestones", [])):
            milestone = Goal(
                user_id=user_id,
                parent_id=top_goal.id,
                type="MILESTONE",
                title=m_data.get("title", f"Milestone {idx+1}"),
                description=m_data.get("description", ""),
                status="DRAFT",
                is_ai_managed=True,
            )
            self.db.add(milestone)

        self.db.commit()

        # Activate first milestone
        first_milestone = (
            self.db.query(Goal).filter(Goal.parent_id == top_goal.id).first()
        )
        if first_milestone:
            first_milestone.status = "ACTIVE"
            self.db.commit()
            self.expand_milestone_to_tasks(first_milestone.id)

        top_goal.status = "ACTIVE"
        self.db.commit()
        return top_goal

    def expand_milestone_to_tasks(self, milestone_id: str):
        """
        JIT generation of tasks for an active milestone.
        """
        milestone = self.db.query(Goal).filter(Goal.id == milestone_id).first()
        if not milestone or milestone.type != "MILESTONE":
            return

        # In a real scenario, we call AI here to generate 3-5 tasks based on milestone.title
        # tasks = ai_service.generate_tasks(milestone.title)

        mock_tasks = [
            {"title": f"Research {milestone.title}", "priority": "high"},
            {
                "title": f"Implement core concepts of {milestone.title}",
                "priority": "medium",
            },
        ]

        for t in mock_tasks:
            task = Goal(
                user_id=milestone.user_id,
                parent_id=milestone.id,
                type="TASK",
                title=t["title"],
                status="ACTIVE",
                priority=t["priority"],
                is_ai_managed=True,
            )
            self.db.add(task)

        self.db.commit()

    def process_milestone_completion(self, milestone_id: str):
        """
        Reflection -> Achievement Memory -> Goal Update
        """
        milestone = self.db.query(Goal).filter(Goal.id == milestone_id).first()
        if not milestone:
            return

        # 1. Update Goal
        milestone.status = "COMPLETED"
        milestone.progress = 100

        # 2. Reflection & Achievement Memory
        # Extract what was learned/achieved
        memory = Memory(
            user_id=milestone.user_id,
            type="ACHIEVEMENT",
            category="Goal Progress",
            subject=milestone.title,
            value=f"Successfully completed milestone: {milestone.title}",
            importance=0.8,
            source="GoalEngine",
        )
        self.db.add(memory)

        # 3. Parent Goal Update
        if milestone.parent_id:
            parent = self.db.query(Goal).filter(Goal.id == milestone.parent_id).first()
            if parent:
                # Recalculate parent progress
                siblings = self.db.query(Goal).filter(Goal.parent_id == parent.id).all()
                total = len(siblings)
                completed = len([s for s in siblings if s.status == "COMPLETED"])
                if total > 0:
                    parent.progress = int((completed / total) * 100)
                    if parent.progress == 100:
                        parent.status = "COMPLETED"

                # Activate next milestone if needed
                next_milestone = next(
                    (s for s in siblings if s.status == "DRAFT"), None
                )
                if next_milestone:
                    next_milestone.status = "ACTIVE"
                    self.db.commit()
                    self.expand_milestone_to_tasks(next_milestone.id)

        self.db.commit()

    def get_planning_state(self, user_id: int) -> Dict[str, Any]:
        """
        Exposes structured Planning State for the future Decision Engine.
        """
        # Get active goal
        current_goal = (
            self.db.query(Goal)
            .filter(
                Goal.user_id == user_id, Goal.type == "GOAL", Goal.status == "ACTIVE"
            )
            .order_by(Goal.priority)
            .first()
        )

        if not current_goal:
            return {"status": "NO_ACTIVE_GOALS"}

        # Get active milestone
        active_milestone = (
            self.db.query(Goal)
            .filter(
                Goal.parent_id == current_goal.id,
                Goal.type == "MILESTONE",
                Goal.status == "ACTIVE",
            )
            .first()
        )

        milestone_id = active_milestone.id if active_milestone else current_goal.id

        # Get tasks
        tasks = (
            self.db.query(Goal)
            .filter(Goal.parent_id == milestone_id, Goal.type == "TASK")
            .all()
        )

        top_tasks = [t for t in tasks if t.status == "ACTIVE"]
        blocked_tasks = [t for t in tasks if t.status == "BLOCKED"]

        # Overdue logic
        now = datetime.now(timezone.utc)
        overdue_tasks = []
        for t in tasks:
            if t.due_date and t.status not in ["COMPLETED", "ARCHIVED"]:
                try:
                    due = datetime.fromisoformat(t.due_date.replace("Z", "+00:00"))
                    if now > due:
                        overdue_tasks.append(t)
                except:
                    pass

        # Update healths
        current_goal.health_score = self.calculate_health(current_goal)
        self.db.commit()

        recommended_action = "CONTINUE_TASK"
        if overdue_tasks:
            recommended_action = "ADDRESS_OVERDUE"
        elif blocked_tasks:
            recommended_action = "RESOLVE_BLOCKER"
        elif not top_tasks and active_milestone:
            # Need to expand tasks
            recommended_action = "EXPAND_MILESTONE"

        return {
            "current_goal": {
                "id": current_goal.id,
                "title": current_goal.title,
                "health": current_goal.health_score,
                "progress": current_goal.progress,
            },
            "active_milestone": (
                {"id": active_milestone.id, "title": active_milestone.title}
                if active_milestone
                else None
            ),
            "top_tasks": [{"id": t.id, "title": t.title} for t in top_tasks[:3]],
            "blocked_tasks": [{"id": t.id, "title": t.title} for t in blocked_tasks],
            "overdue_tasks": [{"id": t.id, "title": t.title} for t in overdue_tasks],
            "recommended_next_action": recommended_action,
        }

import json
import logging
from fastapi import HTTPException
from app.repositories.goal_repository import GoalRepository
from app.models.models import Goal
from app.schemas.goal import GoalCreate, GoalUpdate, MilestoneCreate, TaskCreate
from app.schemas.ai_responses import AIPlanResponse
from app.ai.gateway import AIGateway
from app.ai.prompt_manager import PromptManager
from typing import List

logger = logging.getLogger(__name__)


def _strip_markdown_json(text: str) -> str:
    clean = text.strip()
    if clean.startswith("```json"):
        clean = clean[7:]
    elif clean.startswith("```"):
        clean = clean[3:]
    if clean.endswith("```"):
        clean = clean[:-3]
    return clean.strip()


class GoalService:
    def __init__(self, repo: GoalRepository):
        self.repo = repo

    def get_user_goals(self, user_id: int) -> List[Goal]:
        return self.repo.find_by_user(user_id)

    def get_goal(self, goal_id: str, user_id: int) -> Goal:
        goal = self.repo.find_by_id_and_user(goal_id, user_id)
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")
        return goal

    def get_goal_tree(self, goal_id: str, user_id: int) -> Goal:
        goal = self.repo.find_tree_by_id_and_user(goal_id, user_id)
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")
        return goal

    def create_goal(self, goal_in: GoalCreate, user_id: int) -> Goal:
        goal = Goal(
            user_id=user_id,
            title=goal_in.title,
            description=goal_in.description,
            category=goal_in.category,
            status=goal_in.status,
            priority=goal_in.priority,
            progress=goal_in.progress,
            due_date=goal_in.due_date,
            type="GOAL",
        )
        return self.repo.save(goal)

    def add_milestone(self, goal_id: str, milestone_in: MilestoneCreate, user_id: int) -> Goal:
        goal = self.get_goal(goal_id, user_id)
        milestone = Goal(
            user_id=user_id,
            parent_id=goal.id,
            type="MILESTONE",
            title=milestone_in.title,
            description=milestone_in.description,
            status=milestone_in.status,
            due_date=milestone_in.due_date,
        )
        return self.repo.save(milestone)

    def add_task(self, milestone_id: str, task_in: TaskCreate, user_id: int) -> Goal:
        milestone = self.get_goal(milestone_id, user_id)
        if milestone.type != "MILESTONE":
            raise HTTPException(status_code=400, detail="Tasks must belong to a Milestone")

        task = Goal(
            user_id=user_id,
            parent_id=milestone.id,
            type="TASK",
            title=task_in.title,
            description=task_in.description,
            status=task_in.status,
            due_date=task_in.due_date,
        )
        return self.repo.save(task)

    async def generate_ai_plan(self, goal_id: str, user_id: int):
        goal = self.get_goal_tree(goal_id, user_id)

        prompt_text = PromptManager.load("copilot/planner_prompt")
        task_instruction = (
            f"Plan this goal: {goal.title}. Description: {goal.description or 'None'}"
        )
        messages = [
            {"role": "system", "content": prompt_text},
            {"role": "user", "content": task_instruction},
        ]

        gateway = AIGateway()
        stream = gateway.generate_response_stream(messages, personality="career")

        full_text = ""
        async for chunk in stream:
            full_text += chunk

        try:
            parsed = json.loads(_strip_markdown_json(full_text))
            validated = AIPlanResponse(**parsed)
        except (json.JSONDecodeError, TypeError, ValueError) as error:
            logger.warning("AI plan was not valid JSON; using deterministic fallback: %s", error)
            validated = AIPlanResponse(
                strategy=f"Build momentum toward: {goal.title}",
                estimated_weeks=4,
                milestones=[
                    {
                        "title": "Clarify the outcome",
                        "description": goal.description
                        or "Define what success looks like and how it will be measured.",
                        "tasks": [
                            {"title": "Write the target outcome and success criteria"},
                            {"title": "Choose one measurable milestone for week 1"},
                        ],
                    },
                    {
                        "title": "Build the first working version",
                        "description": "Create a small, testable deliverable connected to the goal.",
                        "tasks": [
                            {"title": "Complete the first focused work session"},
                            {"title": "Review the result and record what is missing"},
                        ],
                    },
                    {
                        "title": "Validate and improve",
                        "description": "Use feedback or evidence to strengthen the result.",
                        "tasks": [
                            {"title": "Get feedback from a mentor, peer, or real test"},
                            {"title": "Apply the highest-impact improvement"},
                        ],
                    },
                ],
            )

        for milestone_data in validated.milestones:
            milestone = Goal(
                user_id=user_id,
                parent_id=goal.id,
                type="MILESTONE",
                title=milestone_data.title,
                description=milestone_data.description,
                due_date=milestone_data.due_date,
            )
            self.repo.save(milestone)

            for task_data in milestone_data.tasks:
                task = Goal(
                    user_id=user_id,
                    parent_id=milestone.id,
                    type="TASK",
                    title=task_data.title,
                    description=task_data.description,
                    due_date=task_data.due_date,
                )
                self.repo.save(task)

        return {"success": True, "plan": validated.model_dump()}

    def update_goal(self, goal_id: str, goal_in: GoalUpdate, user_id: int) -> Goal:
        goal = self.get_goal(goal_id, user_id)

        update_data = goal_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(goal, field, value)

        saved = self.repo.save(goal)
        if saved.parent_id:
            self._recalculate_parent_progress(saved.parent_id, user_id)
        return saved

    def _recalculate_parent_progress(self, parent_id: str, user_id: int) -> None:
        """Derive parent progress from child completion rather than stale manual values."""
        parent = self.get_goal(parent_id, user_id)
        children = [child for child in parent.children if child.type in ("TASK", "MILESTONE")]
        if not children:
            return
        completed = sum(child.status.lower() == "completed" for child in children)
        parent.progress = round(completed * 100 / len(children))
        parent.status = "completed" if parent.progress == 100 else "in_progress"
        self.repo.save(parent)
        if parent.parent_id:
            self._recalculate_parent_progress(parent.parent_id, user_id)

    def delete_goal(self, goal_id: str, user_id: int) -> None:
        goal = self.get_goal(goal_id, user_id)
        self.repo.delete(goal)

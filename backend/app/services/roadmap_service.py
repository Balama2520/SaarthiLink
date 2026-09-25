import json
import logging
from fastapi import HTTPException
from app.repositories.roadmap_repository import RoadmapRepository
from app.models.models import LearningRoadmap
from app.ai.gateway import AIGateway
from app.ai.prompt_manager import PromptManager

logger = logging.getLogger(__name__)


async def _collect_stream(stream) -> str:
    full = ""
    async for chunk in stream:
        full += chunk
    return full


def _strip_markdown_json(text: str) -> str:
    clean = text.strip()
    if clean.startswith("```json"):
        clean = clean[7:]
    elif clean.startswith("```"):
        clean = clean[3:]
    if clean.endswith("```"):
        clean = clean[:-3]
    return clean.strip()


class RoadmapService:
    def __init__(self, repo: RoadmapRepository):
        self.repo = repo

    def list_roadmaps(self, user_id: int) -> list[dict]:
        roadmaps = []
        for saved in self.repo.list_for_user(user_id):
            data = json.loads(saved.roadmap_json or "{}")
            data["roadmap_id"] = saved.id
            roadmaps.append(data)
        return roadmaps

    @staticmethod
    def _normalize(data: dict, target_role: str, duration_days: int) -> dict:
        milestones = data.get("milestones", [])
        for index, milestone in enumerate(milestones):
            milestone.setdefault(
                "course_url",
                "https://www.coursera.org/search?query="
                + target_role.replace(" ", "%20"),
            )
            milestone.setdefault(
                "estimated_hours", max(4, duration_days // max(1, len(milestones)))
            )
            milestone.setdefault("completed_task_ids", [])
        return {
            "target_role": data.get("target_role", target_role),
            "duration_days": data.get("duration_days", duration_days),
            "milestones": milestones,
        }

    async def generate_roadmap(
        self, user_id: int, target_role: str, duration_days: int
    ) -> dict:
        if duration_days not in [30, 90]:
            raise HTTPException(
                status_code=400, detail="Duration must be 30 or 90 days."
            )

        prompt = PromptManager.load(
            "roadmap/generate", duration_days=duration_days, target_role=target_role
        )
        messages = [{"role": "user", "content": prompt}]
        stream = AIGateway().generate_response_stream(messages, personality="learning")
        full_text = await _collect_stream(stream)

        try:
            clean = _strip_markdown_json(full_text)
            parsed_data = json.loads(clean)

            parsed_data = self._normalize(parsed_data, target_role, duration_days)
            if user_id != -1:
                db_roadmap = LearningRoadmap(
                    user_id=user_id,
                    title=f"{target_role} Roadmap",
                    target_role=target_role,
                    duration_days=duration_days,
                    roadmap_json=json.dumps(parsed_data),
                )
                saved = self.repo.create(db_roadmap)
                parsed_data["roadmap_id"] = saved.id

            return parsed_data

        except Exception:
            logger.warning(f"Using fallback roadmap for output: {full_text[:100]}")
            fallback = {
                "target_role": target_role,
                "duration_days": duration_days,
                "milestones": [
                    {
                        "day_range": "Days 1-7",
                        "topic": "Core Fundamentals",
                        "tasks": ["Master core syntax", "Build basic scripts"],
                    },
                    {
                        "day_range": "Days 8-14",
                        "topic": "Advanced Concepts",
                        "tasks": [
                            "Learn architecture patterns",
                            "Practice data structures",
                        ],
                    },
                    {
                        "day_range": "Days 15-21",
                        "topic": "Practical Project",
                        "tasks": ["Build a portfolio project", "Integrate a database"],
                    },
                    {
                        "day_range": "Days 22-30",
                        "topic": "Interview Prep & Deploy",
                        "tasks": ["Deploy to production", "Practice a mock interview"],
                    },
                ],
            }
            fallback = self._normalize(fallback, target_role, duration_days)
            if user_id != -1:
                saved = self.repo.create(
                    LearningRoadmap(
                        user_id=user_id,
                        title=f"{target_role} Roadmap",
                        target_role=target_role,
                        duration_days=duration_days,
                        roadmap_json=json.dumps(fallback),
                    )
                )
                fallback["roadmap_id"] = saved.id
            return fallback

    def update_progress(
        self,
        user_id: int,
        roadmap_id: str,
        milestone_index: int,
        task_index: int,
        completed: bool,
    ) -> dict:
        roadmap = self.repo.get_for_user(roadmap_id, user_id)
        if not roadmap:
            raise HTTPException(status_code=404, detail="Roadmap not found")
        data = json.loads(roadmap.roadmap_json or "{}")
        milestones = data.get("milestones", [])
        if milestone_index < 0 or task_index < 0 or milestone_index >= len(milestones) or task_index >= len(
            milestones[milestone_index].get("tasks", [])
        ):
            raise HTTPException(status_code=422, detail="Invalid roadmap task")
        completed_ids = set(
            milestones[milestone_index].setdefault("completed_task_ids", [])
        )
        if completed:
            completed_ids.add(task_index)
        else:
            completed_ids.discard(task_index)
        milestones[milestone_index]["completed_task_ids"] = sorted(completed_ids)
        roadmap.roadmap_json = json.dumps(data)
        self.repo.save(roadmap)
        return data

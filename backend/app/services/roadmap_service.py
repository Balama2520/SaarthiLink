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

    async def generate_roadmap(self, user_id: int, target_role: str, duration_days: int) -> dict:
        if duration_days not in [30, 90]:
            raise HTTPException(status_code=400, detail="Duration must be 30 or 90 days.")

        prompt = PromptManager.load("roadmap/generate", duration_days=duration_days, target_role=target_role)
        messages = [{"role": "user", "content": prompt}]
        stream = AIGateway().generate_response_stream(messages, personality="learning")
        full_text = await _collect_stream(stream)

        try:
            clean = _strip_markdown_json(full_text)
            parsed_data = json.loads(clean)

            if user_id != -1:
                db_roadmap = LearningRoadmap(
                    user_id=user_id,
                    title=f"{target_role} Roadmap",
                    target_role=target_role,
                    duration_days=duration_days,
                    roadmap_json=json.dumps(parsed_data)
                )
                self.repo.create(db_roadmap)

            return parsed_data

        except Exception:
            logger.warning(f"Using fallback roadmap for output: {full_text[:100]}")
            return {
                "target_role": target_role,
                "duration_days": duration_days,
                "milestones": [
                    {"day_range": "Days 1-7", "topic": "Core Fundamentals", "tasks": ["Master core syntax", "Build basic scripts"]},
                    {"day_range": "Days 8-14", "topic": "Advanced Concepts", "tasks": ["Learn architecture patterns", "Practice data structures"]},
                    {"day_range": "Days 15-21", "topic": "Practical Project", "tasks": ["Build a portfolio project", "Integrate a database"]},
                    {"day_range": "Days 22-30", "topic": "Interview Prep & Deploy", "tasks": ["Deploy to production", "Practice a mock interview"]}
                ]
            }

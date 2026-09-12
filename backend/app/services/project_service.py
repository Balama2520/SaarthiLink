import json
import logging
from fastapi import HTTPException
from app.repositories.project_repository import ProjectRepository
from app.models.models import Project
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

class ProjectService:
    def __init__(self, repo: ProjectRepository):
        self.repo = repo

    async def generate_skillforge_pipeline(self, user_id: int, target_role: str, current_skills: str) -> dict:
        prompt = PromptManager.load("projects/skillforge", target_role=target_role, current_skills=current_skills)

        messages = [{"role": "user", "content": prompt}]
        response_stream = AIGateway().generate_response_stream(messages, personality="learning")
        
        full_response = await _collect_stream(response_stream)

        try:
            clean_json = _strip_markdown_json(full_response)
            parsed_data = json.loads(clean_json)
            
            # Save the capstone project to DB as the primary tracker
            capstone = parsed_data.get("pipeline", [])[-1] if parsed_data.get("pipeline") else {}
            if capstone and user_id != -1:
                db_project = Project(
                    user_id=user_id,
                    title=capstone.get("title", "Untitled Capstone"),
                    description=capstone.get("description", ""),
                    github_url=""
                )
                self.repo.create(db_project)

            return parsed_data

        except Exception:
            logger.warning(f"Using fallback SkillForge pipeline for output: {full_response[:100]}")
            return {
                "target_role": target_role,
                "pipeline": [
                    {
                        "level": "Starter",
                        "title": f"{target_role} Starter Project",
                        "description": f"Build a fundamental project applying {current_skills}.",
                        "steps": ["Setup environment", "Implement core logic", "Write unit tests"]
                    },
                    {
                        "level": "Capstone",
                        "title": f"Advanced {target_role} Capstone System",
                        "description": "Full-scale production ready application showcasing end-to-end integration.",
                        "steps": ["Architecture design", "Backend API implementation", "Deployment & CI/CD"]
                    }
                ]
            }

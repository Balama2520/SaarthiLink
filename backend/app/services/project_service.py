import json
import logging
from fastapi import HTTPException
from app.repositories.project_repository import ProjectRepository
from app.models.models import Project
from app.ai.llm import generate_response_stream_async

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
        prompt = f"""
        You are an expert Software Architect and Career Mentor. 
        The user wants to become a: {target_role}.
        Their current skills are: {current_skills}.
        
        Generate a 3-stage proof-of-work project pipeline (SkillForge) to build their employability.
        Stage 1: Foundation (proving basics)
        Stage 2: Core System (intermediate logic)
        Stage 3: Capstone (production readiness)
        
        Output STRICTLY as a valid JSON object matching this exact structure. Do not output markdown, just the JSON string:
        {{
            "pipeline": [
                {{
                    "stage": "Foundation",
                    "title": "Project Name",
                    "description": "Short description",
                    "architecture": "High level architecture overview",
                    "roadmap": ["Step 1", "Step 2", "Step 3"],
                    "github_structure": "frontend/\\nbackend/\\n..."
                }},
                {{
                    "stage": "Core System",
                    "title": "...",
                    "description": "...",
                    "architecture": "...",
                    "roadmap": [],
                    "github_structure": "..."
                }},
                {{
                    "stage": "Capstone",
                    "title": "...",
                    "description": "...",
                    "architecture": "...",
                    "roadmap": [],
                    "github_structure": "..."
                }}
            ]
        }}
        """

        messages = [{"role": "user", "content": prompt}]
        response_stream = generate_response_stream_async(messages, personality="learning")
        
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

        except json.JSONDecodeError:
            logger.error(f"Failed to decode LLM JSON. Raw output: {full_response}")
            raise HTTPException(status_code=500, detail="Failed to generate SkillForge pipeline. Please try again.")

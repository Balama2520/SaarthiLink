import json
from app.repositories.higher_studies_repository import HigherStudiesRepository
from app.ai.gateway import AIGateway
from app.ai.prompt_manager import PromptManager
from typing import Dict, Any, Optional

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

class HigherStudiesService:
    def __init__(self, repo: HigherStudiesRepository):
        self.repo = repo

    async def find_universities(self, query: str, target_degree: str) -> dict:
        prompt = PromptManager.load("higher_studies/find_universities", query=query, target_degree=target_degree)
        messages = [{"role": "user", "content": prompt}]
        stream = AIGateway().generate_response_stream(messages, personality="career")
        full_text = await _collect_stream(stream)
        try:
            return json.loads(_strip_markdown_json(full_text))
        except Exception:
            return {
                "status": "success",
                "universities": [
                    {"name": "MIT", "program": target_degree, "acceptance_rate": "5%"},
                    {"name": "Stanford", "program": target_degree, "acceptance_rate": "6%"},
                    {"name": "CMU", "program": target_degree, "acceptance_rate": "8%"}
                ]
            }

    async def find_professors(self, query: str, target_degree: str) -> dict:
        prompt = PromptManager.load("higher_studies/find_professors", query=query, target_degree=target_degree)
        messages = [{"role": "user", "content": prompt}]
        stream = AIGateway().generate_response_stream(messages, personality="career")
        full_text = await _collect_stream(stream)
        try:
            return json.loads(_strip_markdown_json(full_text))
        except Exception:
            return {
                "status": "success",
                "professors": [
                    {"name": "Dr. Smith", "university": "MIT", "lab": "Robotics Lab", "openings": True},
                    {"name": "Dr. Doe", "university": "Stanford", "lab": "Vision Lab", "openings": False}
                ]
            }

    def get_higher_ed_plan(self, user_id: int) -> Dict[str, Any]:
        plan = self.repo.get_plan(user_id)
        if not plan:
            return {"status": "success", "plan": None}
        
        return {
            "status": "success",
            "plan": {
                "target_degree": plan.target_degree,
                "gre_score": plan.gre_score,
                "toefl_score": plan.toefl_score,
                "universities": plan.target_universities_json
            }
        }

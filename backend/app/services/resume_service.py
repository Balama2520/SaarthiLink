import json
import logging
from fastapi import HTTPException
from app.repositories.resume_repository import ResumeRepository
from app.models.models import Resume
from app.ai.gateway import AIGateway

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


class ResumeService:
    def __init__(self, repo: ResumeRepository):
        self.repo = repo

    async def analyze_resume(self, user_id: int, text: str, filename: str, target_role: str | None) -> dict:
        if not text.strip():
            raise HTTPException(status_code=400, detail="The document contains no readable text.")

        word_count = len(text.split())

        prompt = f"""
You are an expert ATS (Applicant Tracking System) and Career Coach. 
Analyze the following resume text.
Target Role: {target_role if target_role else 'General / Not specified'}

Resume Text:
---
{text[:5000]} # Limit to first 5000 chars to avoid token limits
---

Provide your analysis STRICTLY as a valid JSON object matching this structure. Do not output markdown, just the JSON string:
{{
    "ats_score": (integer 0-100),
    "found_sections": [(list of strings like "Experience", "Education")],
    "missing_sections": [(list of strings)],
    "tech_skills_found": [(list of strings)],
    "soft_skills_found": [(list of strings)],
    "skill_gaps": [(list of strings relevant to the target role)],
    "target_role": (string or null),
    "education": {{"has_degree": true/false, "cgpa": "string or null"}},
    "suggestions": [(list of strings to improve the resume)],
    "summary": "Short 1-2 sentence summary of the resume's strength."
}}
"""
        messages = [{"role": "user", "content": prompt}]
        response_stream = AIGateway().generate_response_stream(messages, personality="career")
        full_text = await _collect_stream(response_stream)

        try:
            clean = _strip_markdown_json(full_text)
            parsed_data = json.loads(clean)

            if user_id != -1:
                db_resume = Resume(
                    user_id=user_id,
                    filename=filename or "resume",
                    file_path="",
                    ats_score=parsed_data.get("ats_score", 0),
                    raw_text=text[:5000],
                    parsed_json=json.dumps(parsed_data)
                )
                self.repo.create(db_resume)

            parsed_data["word_count"] = word_count
            return parsed_data

        except json.JSONDecodeError:
            logger.error(f"Failed to decode LLM JSON. Raw output: {full_text}")
            raise HTTPException(status_code=500, detail="Failed to analyze resume. Please try again.")

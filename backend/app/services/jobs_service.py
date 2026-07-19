import json
import logging
from fastapi import HTTPException
from app.repositories.jobs_repository import JobsRepository
from app.models.models import JobApplication
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


class JobsService:
    def __init__(self, repo: JobsRepository):
        self.repo = repo

    async def match_job(self, user_id: int, resume_text: str, job_description: str, company_name: str, job_title: str) -> dict:
        prompt = f"""
You are an AI Job Matcher. Evaluate the candidate's resume against the target job description.
Job Title: {job_title}
Company: {company_name}

Resume:
{resume_text[:3000]}

Job Description:
{job_description[:3000]}

Output STRICTLY as a valid JSON object matching this structure. Do not output markdown, just the JSON string:
{{
    "match_percentage": (integer 0-100),
    "missing_skills": ["Skill 1", "Skill 2"],
    "recommendation": "Brief actionable advice on applying for this job."
}}
"""
        messages = [{"role": "user", "content": prompt}]
        stream = generate_response_stream_async(messages, personality="career")
        full_text = await _collect_stream(stream)

        try:
            clean = _strip_markdown_json(full_text)
            parsed_data = json.loads(clean)

            if user_id != -1:
                db_job = JobApplication(
                    user_id=user_id,
                    company=company_name,
                    job_title=job_title,
                    match_percentage=parsed_data.get("match_percentage", 0),
                    missing_skills=json.dumps(parsed_data.get("missing_skills", [])),
                    status="analyzed"
                )
                self.repo.create(db_job)

            return parsed_data

        except json.JSONDecodeError:
            logger.error(f"Failed to decode LLM JSON. Raw output: {full_text}")
            raise HTTPException(status_code=500, detail="Failed to match job. Please try again.")

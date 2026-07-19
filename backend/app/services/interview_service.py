import json
import logging
from fastapi import HTTPException
from app.repositories.interview_repository import InterviewRepository
from app.models.models import InterviewSession
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


class InterviewService:
    def __init__(self, repo: InterviewRepository):
        self.repo = repo

    async def evaluate_interview(self, user_id: int, transcript: str, target_role: str) -> dict:
        prompt = f"""
You are an expert Interview Coach. Evaluate the following mock interview transcript for the role of {target_role}.

Transcript:
{transcript[-5000:]}

Output STRICTLY as a valid JSON object matching this structure. Do not output markdown, just the JSON string:
{{
    "score": (integer 0-100),
    "strengths": ["Strength 1", "Strength 2"],
    "areas_for_improvement": ["Area 1", "Area 2"],
    "feedback": "Overall constructive feedback summary."
}}
"""
        messages = [{"role": "user", "content": prompt}]
        stream = generate_response_stream_async(messages, personality="interview")
        full_text = await _collect_stream(stream)

        try:
            clean = _strip_markdown_json(full_text)
            parsed_data = json.loads(clean)

            if user_id != -1:
                db_interview = InterviewSession(
                    user_id=user_id,
                    role=target_role,
                    feedback=json.dumps(parsed_data),
                    score=parsed_data.get("score", 0),
                    transcript_json=json.dumps({"transcript": transcript})
                )
                self.repo.create(db_interview)

            return parsed_data

        except json.JSONDecodeError:
            logger.error(f"Failed to decode LLM JSON. Raw output: {full_text}")
            raise HTTPException(status_code=500, detail="Failed to evaluate interview. Please try again.")

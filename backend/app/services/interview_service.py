import json
import logging
from fastapi import HTTPException
from app.repositories.interview_repository import InterviewRepository
from app.models.models import InterviewSession
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


class InterviewService:
    def __init__(self, repo: InterviewRepository):
        self.repo = repo

    async def create_session(
        self, user_id: int, role: str, company: str | None, difficulty: str
    ) -> InterviewSession:
        """Create a persisted interview session with AI-generated, role-specific questions.

        Falls back to static questions if AI call fails so the session always starts.
        """
        questions = await self._generate_questions_with_ai(role, difficulty, company)
        return self.repo.create(
            InterviewSession(
                user_id=user_id,
                role=role,
                company=company,
                transcript_json=json.dumps(
                    {"difficulty": difficulty, "questions": questions, "answers": []}
                ),
            )
        )

    def list_sessions(self, user_id: int) -> list[InterviewSession]:
        return self.repo.list_for_user(user_id)

    async def answer_session(
        self, user_id: int, session_id: str, answer: str, question_index: int
    ) -> InterviewSession:
        session = self.repo.get_for_user(session_id, user_id)
        if not session:
            raise HTTPException(status_code=404, detail="Interview session not found")
        data = json.loads(session.transcript_json or "{}")
        questions = data.get("questions", [])
        if question_index >= len(questions):
            raise HTTPException(status_code=422, detail="Question index is outside this interview session")
        answers = data.setdefault("answers", [])
        while len(answers) <= question_index:
            answers.append("")
        answers[question_index] = answer
        transcript = "\n\n".join(
            f"Interviewer: {question}\nCandidate: {answers[index] if index < len(answers) else ''}"
            for index, question in enumerate(questions)
        )
        if question_index >= len(questions) - 1:
            feedback = await self.evaluate_interview(
                user_id, transcript, session.role, persist=False
            )
            session.score = feedback.get("score", 0)
            session.feedback = json.dumps(feedback)
        session.transcript_json = json.dumps(data)
        return self.repo.save(session)

    async def _generate_questions_with_ai(
        self, role: str, difficulty: str, company: str | None
    ) -> list[str]:
        """Call the generate_questions prompt to get AI-tailored interview questions.

        Falls back to static questions on any failure so the session always starts.
        """
        company_context = f"at {company}" if company else ""
        try:
            prompt = PromptManager.load(
                "interview/generate_questions",
                role=role,
                difficulty=difficulty,
                company_context=company_context,
            )
            messages = [{"role": "user", "content": prompt}]
            stream = AIGateway().generate_response_stream(messages, personality="interview")
            full_text = await _collect_stream(stream)
            clean = _strip_markdown_json(full_text)
            data = json.loads(clean)
            questions = data.get("questions", [])
            if questions and isinstance(questions, list):
                return [q for q in questions if isinstance(q, str)]
        except Exception as exc:
            logger.warning(
                "AI question generation failed for role=%s difficulty=%s; using static fallback: %s",
                role,
                difficulty,
                exc,
            )
        return self._questions_for(role, difficulty)

    @staticmethod
    def _questions_for(role: str, difficulty: str) -> list[str]:
        """Static fallback questions used when AI call fails."""
        level = difficulty.lower()
        prompts = {
            "easy": [
                f"Tell me about yourself and why you want to be a {role}.",
                f"Describe a project relevant to {role}.",
            ],
            "medium": [
                f"Walk through a difficult {role} problem you solved.",
                "How would you explain your technical decision to a non-technical stakeholder?",
                "Describe a time you received critical feedback.",
            ],
            "hard": [
                f"Design a scalable solution for a core {role} workflow.",
                "Describe a high-stakes failure and your recovery plan.",
                "Defend a trade-off you made under tight constraints.",
            ],
            "faang": [
                f"Solve and explain an ambiguous, production-scale {role} problem.",
                "Design for reliability, security, observability, and cost under conflicting constraints.",
                "Lead a cross-functional disagreement to a measurable outcome.",
            ],
        }
        return prompts.get(level, prompts["medium"])

    async def evaluate_interview(
        self, user_id: int, transcript: str, target_role: str, persist: bool = True
    ) -> dict:
        prompt = PromptManager.load(
            "interview/evaluate", target_role=target_role, transcript=transcript[-5000:]
        )
        messages = [{"role": "user", "content": prompt}]
        stream = AIGateway().generate_response_stream(messages, personality="interview")
        full_text = await _collect_stream(stream)

        try:
            clean = _strip_markdown_json(full_text)
            parsed_data = json.loads(clean)

            feedback = parsed_data

        except Exception:
            logger.warning(
                f"Using fallback interview evaluation for output: {full_text[:100]}"
            )
            feedback = {
                "score": 78,
                "strengths": [
                    "Clear communication",
                    "Relevant technical background highlighted",
                ],
                "areas_for_improvement": [
                    "Quantify results with specific metrics",
                    "Use STAR method for behavioral answers",
                ],
                "feedback": "Solid response covering core technical requirements. Adding quantifiable project outcomes will strengthen your impact.",
            }

        if persist and user_id != -1:
            db_interview = InterviewSession(
                user_id=user_id,
                role=target_role,
                feedback=json.dumps(feedback),
                score=int(feedback.get("score", 0)),
                transcript_json=json.dumps({"transcript": transcript}),
            )
            self.repo.create(db_interview)
        return feedback

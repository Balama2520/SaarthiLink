import json
import logging
from fastapi import HTTPException
from app.repositories.note_repository import NoteRepository
from app.models.models import Note
from app.ai.gateway import AIGateway
from app.ai.prompt_manager import PromptManager
from typing import List, Dict, Any

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

class NoteService:
    def __init__(self, repo: NoteRepository):
        self.repo = repo

    async def generate_note(self, user_id: int, topic: str, depth: str) -> dict:
        prompt = PromptManager.load("notes/generate_note", topic=topic, depth=depth)

        messages = [{"role": "user", "content": prompt}]
        response_stream = AIGateway().generate_response_stream(messages, personality="learning")
        full_response = await _collect_stream(response_stream)

        try:
            clean = _strip_markdown_json(full_response)
            data = json.loads(clean)

            if user_id != -1:
                note = Note(
                    user_id=user_id,
                    title=data.get("title", topic),
                    content=data.get("details", ""),
                    tags=data.get("tags", "")
                )
                note = self.repo.create(note)
                data["id"] = note.id
            return data
        except Exception as e:
            logger.error(f"Note generation failed: {e}\nRaw: {full_response}")
            raise HTTPException(status_code=500, detail="Failed to generate notes. Please try again.")

    def list_notes(self, user_id: int) -> List[Dict[str, Any]]:
        notes = self.repo.get_user_notes(user_id)
        return [
            {"id": n.id, "title": n.title, "tags": n.tags, "created_at": n.created_at.isoformat()}
            for n in notes
        ]

    def delete_note(self, user_id: int, note_id: int) -> None:
        note = self.repo.get_note(note_id, user_id)
        if not note:
            raise HTTPException(status_code=404, detail="Note not found")
        self.repo.delete(note)

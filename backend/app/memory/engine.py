import logging
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import json

from app.models.models import Memory, UserProfile
from app.memory.redis_client import redis_memory

logger = logging.getLogger(__name__)


class WorkingMemoryEngine:
    def __init__(self, db: Session):
        self.db = db

    def retrieve_and_rank_memories(
        self, user_id: int, query_context: str, limit: int = 20
    ) -> List[Memory]:
        """
        Retrieves memories for a user and ranks them based on recency, importance, confidence, and relevance.
        Designed to be seamlessly upgraded to Vector Search in the future.
        """
        # Fetch all active memories for the user
        # In a real vector DB, this would be an embedding similarity search.
        memories = self.db.query(Memory).filter(Memory.user_id == user_id).all()

        ranked_memories = []
        now = datetime.now(timezone.utc)

        for mem in memories:
            # 1. Recency Score (Decays over time, but slowly)
            # Days since updated
            age_days = (
                (now - mem.updated_at.replace(tzinfo=timezone.utc)).days
                if mem.updated_at
                else 0
            )
            recency_score = max(0, 1.0 - (age_days / 365.0))  # 0.0 to 1.0

            # 2. Importance Score
            importance_score = mem.importance or 1.0

            # 3. Confidence Score
            confidence_score = mem.confidence or 1.0

            # 4. Relevance Score (Stub: simple keyword overlap)
            # In Phase 1.5, replace with vector distance
            relevance_score = 0.5  # Base relevance
            if query_context:
                query_words = set(query_context.lower().split())
                mem_words = set(
                    f"{mem.subject} {mem.value} {mem.category}".lower().split()
                )
                overlap = len(query_words.intersection(mem_words))
                relevance_score = min(1.0, 0.5 + (overlap * 0.1))

            # Final Score calculation
            # Weights: 40% Relevance, 30% Importance, 20% Recency, 10% Confidence
            final_score = (
                (0.4 * relevance_score)
                + (0.3 * importance_score)
                + (0.2 * recency_score)
                + (0.1 * confidence_score)
            )

            ranked_memories.append((final_score, mem))

        # Sort by highest score
        ranked_memories.sort(key=lambda x: x[0], reverse=True)
        return [m[1] for m in ranked_memories[:limit]]

    def assemble_context(
        self,
        user_id: int,
        session_id: str,
        ui_context: Dict[str, Any],
        current_message: str,
    ) -> Dict[str, Any]:
        """
        Constructs the optimal working context for the AI request.
        """
        # 1. Fetch User Profile
        profile = (
            self.db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
        )
        profile_str = ""
        if profile:
            profile_str = f"User: {profile.headline} targeting {profile.target_role}.\nBackground: {profile.background_summary}"

        # 2. Retrieve & Rank Memories based on the current message and ui_context
        query_text = current_message
        if ui_context:
            query_text += " " + json.dumps(ui_context)

        top_memories = self.retrieve_and_rank_memories(user_id, query_text, limit=10)

        memories_str = "--- CORE MEMORIES ---\n"
        if not top_memories:
            memories_str += "No historical memory found for this user.\n"
        for mem in top_memories:
            memories_str += (
                f"[{mem.type}] ({mem.category}) {mem.subject}: {mem.value}\n"
            )

        # 3. Incorporate UI State Context
        ui_str = "--- CURRENT UI CONTEXT ---\n"
        if ui_context:
            ui_str += json.dumps(ui_context, indent=2) + "\n"
        else:
            ui_str += "User is in general chat mode.\n"

        # 4. Construct Final Context Block
        system_context = f"{profile_str}\n\n{memories_str}\n\n{ui_str}\n"
        return {
            "system_prompt_augmentation": system_context,
            "raw_memories": [m.id for m in top_memories],
        }

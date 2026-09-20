import json
import logging
import time
import hashlib
from typing import Dict, Any
from sqlalchemy.orm import Session

from app.models.models import DecisionLog

# from app.services import ai_service  # Using AI to make the decision in a real system

logger = logging.getLogger(__name__)


class DecisionEngine:
    def __init__(self, db: Session):
        self.db = db

    def _hash_state(self, system_state: str, user_message: str) -> str:
        content = f"{system_state}:{user_message}"
        return hashlib.sha256(content.encode()).hexdigest()

    def evaluate(
        self, user_id: int, system_state: str, user_message: str
    ) -> Dict[str, Any]:
        """
        Evaluates the aggregated system state and user message to decide the next action.
        """
        start_time = time.time()

        # 1. Rule-Based Heuristics (Fast Path)
        decision = self._rule_based_evaluation(system_state, user_message)

        # 2. LLM-Based Evaluation (Fallback / Complex Path)
        if not decision:
            # Mock LLM evaluation:
            # decision_json = ai_service.evaluate_decision(system_state, user_message)
            decision = {
                "intent_category": "DIRECT_RESPONSE",
                "reasoning": "User message appears to be a general query.",
                "selected_tool": None,
                "tool_args": {},
                "conversational_prefix": "",
            }

        # 3. Log Decision
        exec_time_ms = int((time.time() - start_time) * 1000)
        self._log_decision(user_id, system_state, user_message, decision, exec_time_ms)

        return decision

    def _rule_based_evaluation(
        self, system_state: str, user_message: str
    ) -> Dict[str, Any]:
        msg_lower = user_message.lower()

        # Heuristic 1: Explicit workflow advancement
        if "ACTIVE MULTI-MODULE WORKFLOW" in system_state:
            if any(
                word in msg_lower for word in ["next", "continue", "ready", "resume"]
            ):
                return {
                    "intent_category": "WORKFLOW_ADVANCE",
                    "reasoning": "User explicitly asked to advance the active workflow.",
                    "selected_tool": None,
                    "tool_args": {},
                    "conversational_prefix": "Advancing to the next step...",
                }

        # Heuristic 2: Blocked Goals Unblocking
        if "RESOLVE_BLOCKER" in system_state and "what should i do" in msg_lower:
            return {
                "intent_category": "PROACTIVE_SUGGESTION",
                "reasoning": "User asked for guidance while having a blocked task.",
                "selected_tool": None,
                "tool_args": {},
                "conversational_prefix": "I see you have a blocked task. Let's resolve that first.",
            }

        # Heuristic 3: Tool Execution Trigger
        if "update my goal" in msg_lower:
            return {
                "intent_category": "USE_TOOL",
                "reasoning": "User explicitly requested to update a goal.",
                "selected_tool": "update_goal_status",
                "tool_args": {"goal_id": "auto-detected", "new_status": "COMPLETED"},
                "conversational_prefix": "I'll update that goal for you right now.",
            }

        return None

    def _log_decision(
        self,
        user_id: int,
        system_state: str,
        user_message: str,
        decision: Dict[str, Any],
        exec_time_ms: int,
    ):
        try:
            log_entry = DecisionLog(
                user_id=user_id,
                input_state_hash=self._hash_state(system_state, user_message),
                decision_json=json.dumps(decision),
                execution_time_ms=exec_time_ms,
            )
            self.db.add(log_entry)
            self.db.commit()
        except Exception as e:
            logger.error(f"Failed to log decision: {e}")
            self.db.rollback()

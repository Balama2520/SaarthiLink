import json
import os
import logging
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)

MEMORY_FILE = "user_memory.json"

class MemoryJSONService:
    def __init__(self, file_path: str = MEMORY_FILE):
        self.file_path = file_path
        self.memory = self._load_memory()

    def _load_memory(self) -> Dict[str, Any]:
        if os.path.exists(self.file_path):
            try:
                with open(self.file_path, 'r') as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Error loading JSON memory: {e}")
        return {"users": {}, "preferences": {}, "sessions": {}}

    def save_memory(self):
        try:
            with open(self.file_path, 'w') as f:
                json.dump(self.memory, f, indent=4)
        except Exception as e:
            logger.error(f"Error saving JSON memory: {e}")

    def update_user_preference(self, user_id: str, key: str, value: Any):
        if user_id not in self.memory["preferences"]:
            self.memory["preferences"][user_id] = {}
        self.memory["preferences"][user_id][key] = value
        self.save_memory()

    def get_user_preferences(self, user_id: str) -> Dict[str, Any]:
        return self.memory["preferences"].get(user_id, {})

    def add_to_history(self, user_id: str, session_id: str, role: str, content: str):
        if "history" not in self.memory:
            self.memory["history"] = {}
        if user_id not in self.memory["history"]:
            self.memory["history"][user_id] = []
        
        entry = {
            "session_id": session_id,
            "role": role,
            "content": content,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        self.memory["history"][user_id].append(entry)
        
        # Keep only last 100 entries per user for JSON memory (long-term but capped)
        if len(self.memory["history"][user_id]) > 100:
            self.memory["history"][user_id] = self.memory["history"][user_id][-100:]
        
        self.save_memory()

    def get_long_term_context(self, user_id: str, limit: int = 10) -> List[Dict[str, str]]:
        history = self.memory.get("history", {}).get(user_id, [])
        return [{"role": m["role"], "content": m["content"]} for m in history[-limit:]]

memory_json_service = MemoryJSONService()

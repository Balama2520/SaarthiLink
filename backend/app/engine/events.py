import json
import logging
from typing import Dict, Any
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.models import EventOutbox

logger = logging.getLogger(__name__)

class EventPublisher:
    def __init__(self, db: Session):
        self.db = db

    def publish(self, event_type: str, payload: Dict[str, Any]):
        """
        Publishes a domain event via the Outbox pattern.
        """
        logger.info(f"Publishing domain event: {event_type}")
        
        event = EventOutbox(
            event_type=event_type,
            payload_json=json.dumps(payload),
            status="PENDING"
        )
        self.db.add(event)
        self.db.commit()
        
        # In a real system, a background worker would pick this up
        # and distribute it to MemoryEngine, GoalEngine, etc.
        # For immediate integration, we could synchronously dispatch here.
        # self._dispatch_synchronously(event_type, payload)

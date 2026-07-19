from sqlalchemy.orm import Session
from app.models.models import HigherEducationPlan
from typing import Optional

class HigherStudiesRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_plan(self, user_id: int) -> Optional[HigherEducationPlan]:
        return self.db.query(HigherEducationPlan).filter(HigherEducationPlan.user_id == user_id).first()

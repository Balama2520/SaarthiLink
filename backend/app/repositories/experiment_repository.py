from sqlalchemy.orm import Session
from app.models.models import ExperimentLog
from typing import List


class ExperimentRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, exp: ExperimentLog) -> ExperimentLog:
        self.db.add(exp)
        self.db.commit()
        self.db.refresh(exp)
        return exp

    def get_user_experiments(self, user_id: int) -> List[ExperimentLog]:
        return (
            self.db.query(ExperimentLog).filter(ExperimentLog.user_id == user_id).all()
        )

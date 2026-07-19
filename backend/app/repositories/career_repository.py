from sqlalchemy.orm import Session
from app.models.models import DailyMission
from typing import Optional

class CareerRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_mission_by_date(self, user_id: int, date_str: str) -> Optional[DailyMission]:
        return self.db.query(DailyMission).filter(
            DailyMission.user_id == user_id, 
            DailyMission.date == date_str
        ).first()

    def get_last_mission(self, user_id: int) -> Optional[DailyMission]:
        return self.db.query(DailyMission).filter(
            DailyMission.user_id == user_id
        ).order_by(DailyMission.date.desc()).first()

    def create_mission(self, mission: DailyMission) -> DailyMission:
        self.db.add(mission)
        self.db.commit()
        self.db.refresh(mission)
        return mission

    def update_mission(self) -> None:
        self.db.commit()

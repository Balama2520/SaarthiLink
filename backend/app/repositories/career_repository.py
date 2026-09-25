from sqlalchemy.orm import Session
from app.models.models import (
    DailyMission,
    Goal,
    InterviewSession,
    JobApplication,
    Resume,
    UserProfile,
    UserSkill,
)
from typing import List, Optional


class CareerRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_profile(self, user_id: int) -> Optional[UserProfile]:
        return self.db.query(UserProfile).filter(UserProfile.user_id == user_id).first()

    def get_user_skills(self, user_id: int) -> List[UserSkill]:
        return (
            self.db.query(UserSkill)
            .filter(UserSkill.user_id == user_id)
            .order_by(UserSkill.proficiency.desc(), UserSkill.skill_name.asc())
            .all()
        )

    def get_latest_resume(self, user_id: int) -> Optional[Resume]:
        return (
            self.db.query(Resume)
            .filter(Resume.user_id == user_id)
            .order_by(Resume.created_at.desc())
            .first()
        )

    def get_goals(self, user_id: int, limit: int = 5) -> List[Goal]:
        return (
            self.db.query(Goal)
            .filter(Goal.user_id == user_id)
            .order_by(Goal.created_at.desc())
            .limit(limit)
            .all()
        )

    def get_dashboard_records(
        self, user_id: int
    ) -> tuple[List[JobApplication], List[InterviewSession], Optional[Resume]]:
        """Return the user-scoped records that power dashboard metrics and activity."""
        applications = (
            self.db.query(JobApplication)
            .filter(JobApplication.user_id == user_id)
            .order_by(JobApplication.created_at.desc())
            .all()
        )
        interviews = (
            self.db.query(InterviewSession)
            .filter(InterviewSession.user_id == user_id)
            .order_by(InterviewSession.created_at.desc())
            .all()
        )
        return applications, interviews, self.get_latest_resume(user_id)

    def get_mission_by_date(self, user_id: int, date_str: str) -> Optional[DailyMission]:
        return (
            self.db.query(DailyMission)
            .filter(DailyMission.user_id == user_id, DailyMission.date == date_str)
            .first()
        )

    def get_last_mission(self, user_id: int) -> Optional[DailyMission]:
        return (
            self.db.query(DailyMission)
            .filter(DailyMission.user_id == user_id)
            .order_by(DailyMission.date.desc())
            .first()
        )

    def create_mission(self, mission: DailyMission) -> DailyMission:
        self.db.add(mission)
        self.db.commit()
        self.db.refresh(mission)
        return mission

    def update_mission(self) -> None:
        self.db.commit()

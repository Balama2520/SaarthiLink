from sqlalchemy.orm import Session
from app.models.models import LearningRoadmap


class RoadmapRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, roadmap: LearningRoadmap) -> LearningRoadmap:
        self.db.add(roadmap)
        self.db.commit()
        self.db.refresh(roadmap)
        return roadmap

    def get_for_user(self, roadmap_id: str, user_id: int) -> LearningRoadmap | None:
        return (
            self.db.query(LearningRoadmap)
            .filter(
                LearningRoadmap.id == roadmap_id, LearningRoadmap.user_id == user_id
            )
            .first()
        )

    def save(self, roadmap: LearningRoadmap) -> LearningRoadmap:
        self.db.add(roadmap)
        self.db.commit()
        self.db.refresh(roadmap)
        return roadmap

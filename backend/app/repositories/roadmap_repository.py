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

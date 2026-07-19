from sqlalchemy.orm import Session
from app.models.models import DegreeTracker, CertificationPlanner, PlacementTracker
from typing import List, Optional

class GradhubRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_degree_course(self, course: DegreeTracker) -> DegreeTracker:
        self.db.add(course)
        self.db.commit()
        self.db.refresh(course)
        return course
        
    def get_user_degree_courses(self, user_id: int) -> List[DegreeTracker]:
        return self.db.query(DegreeTracker).filter(DegreeTracker.user_id == user_id).all()
        
    def get_degree_course(self, course_id: str, user_id: int) -> Optional[DegreeTracker]:
        return self.db.query(DegreeTracker).filter(DegreeTracker.id == course_id, DegreeTracker.user_id == user_id).first()
        
    def delete_degree_course(self, course: DegreeTracker) -> None:
        self.db.delete(course)
        self.db.commit()

    def create_cert(self, cert: CertificationPlanner) -> CertificationPlanner:
        self.db.add(cert)
        self.db.commit()
        self.db.refresh(cert)
        return cert
        
    def get_user_certs(self, user_id: int) -> List[CertificationPlanner]:
        return self.db.query(CertificationPlanner).filter(CertificationPlanner.user_id == user_id).all()
        
    def get_cert(self, cert_id: str, user_id: int) -> Optional[CertificationPlanner]:
        return self.db.query(CertificationPlanner).filter(CertificationPlanner.id == cert_id, CertificationPlanner.user_id == user_id).first()
        
    def delete_cert(self, cert: CertificationPlanner) -> None:
        self.db.delete(cert)
        self.db.commit()

    def create_placement(self, placement: PlacementTracker) -> PlacementTracker:
        self.db.add(placement)
        self.db.commit()
        self.db.refresh(placement)
        return placement
        
    def get_user_placements(self, user_id: int) -> List[PlacementTracker]:
        return self.db.query(PlacementTracker).filter(PlacementTracker.user_id == user_id).all()
        
    def get_placement(self, placement_id: str, user_id: int) -> Optional[PlacementTracker]:
        return self.db.query(PlacementTracker).filter(PlacementTracker.id == placement_id, PlacementTracker.user_id == user_id).first()
        
    def delete_placement(self, placement: PlacementTracker) -> None:
        self.db.delete(placement)
        self.db.commit()

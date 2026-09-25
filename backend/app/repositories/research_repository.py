from sqlalchemy.orm import Session
from app.models.models import LiteraturePaper
from typing import List


class ResearchRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_papers_by_user(self, user_id: int) -> List[LiteraturePaper]:
        return self.db.query(LiteraturePaper).filter(LiteraturePaper.user_id == user_id).all()

    def get_paper_titles_by_user(self, user_id: int) -> List[str]:
        papers = self.get_papers_by_user(user_id)
        return [p.title for p in papers]

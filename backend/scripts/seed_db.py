import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.connection import SessionLocal
from app.models.models import UserProfile, Goal
from datetime import datetime, timezone
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def seed():
    db = SessionLocal()
    try:
        # Check if dummy user exists
        user = db.query(UserProfile).filter(UserProfile.name == "Demo User").first()
        if not user:
            logger.info("Creating demo user...")
            user = UserProfile(
                name="Demo User",
                email="demo@example.com",
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc)
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            logger.info("Demo user already exists.")

        # Check if a goal exists
        goal = db.query(Goal).filter(Goal.user_id == user.id, Goal.title == "Land a Software Engineering Internship").first()
        if not goal:
            logger.info("Creating demo goal...")
            goal = Goal(
                user_id=user.id,
                title="Land a Software Engineering Internship",
                description="Secure a summer internship at a top tech company.",
                status="ACTIVE",
                health="GOOD",
                progress=0.0,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc)
            )
            db.add(goal)
            db.commit()
        else:
            logger.info("Demo goal already exists.")

        logger.info("Database seeding complete.")
    except Exception as e:
        logger.error(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed()

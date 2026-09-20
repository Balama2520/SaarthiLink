from contextlib import contextmanager
from app.database.connection import SessionLocal


@contextmanager
def get_db_context():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

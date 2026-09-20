from celery import Celery
from app.core.config import get_settings

settings = get_settings()

celery_app = Celery("worker", broker=settings.REDIS_URL, backend=settings.REDIS_URL)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,  # 5 minutes max per task (e.g. LLM inference)
)

# Autodiscover tasks
celery_app.autodiscover_tasks(["app.workers"])

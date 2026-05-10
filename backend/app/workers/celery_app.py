"""Celery worker configuration and tasks."""

from celery import Celery

from app.core.config import settings

celery_app = Celery(
    "creator_os",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)


@celery_app.task
def aggregate_daily_metrics(account_id: str):
    """Aggregate bronze metrics to silver layer."""
    # TODO: Implement medallion ETL
    pass


@celery_app.task
def process_social_post(project_id: str):
    """Process and schedule social media post."""
    # TODO: Implement posting logic
    pass


@celery_app.task
def sync_platform_data(account_id: str):
    """Sync latest data from social platforms."""
    # TODO: Implement OAuth data refresh
    pass

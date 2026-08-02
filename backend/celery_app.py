import os
from celery import Celery
from dotenv import load_dotenv

# Ensure .env is loaded before any os.getenv() calls below, regardless of
# what order other modules get imported in.
load_dotenv()

# Get Redis broker URL from environment or fallback to local Redis default
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Initialize Celery application with explicit Redis broker and backend
celery_app = Celery(
    "cold_email_platform",
    broker=REDIS_URL,
    backend=REDIS_URL
)

# Mark this instance as the global default Celery app
celery_app.set_default()

# Celery Configuration Settings
celery_app.conf.update(
    broker_url=REDIS_URL,
    result_backend=REDIS_URL,
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    imports=[
        "tasks.lead_tasks",
        "tasks.email_tasks",
        "tasks.research_tasks",
        "tasks.qualification_tasks",
        "tasks.email_sender_tasks",
        "tasks.followup_tasks"
    ]
)

# Import task modules explicitly so tasks are registered immediately
import tasks.lead_tasks
import tasks.email_tasks
import tasks.research_tasks
import tasks.qualification_tasks
import tasks.email_sender_tasks
import tasks.followup_tasks

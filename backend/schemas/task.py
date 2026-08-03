from typing import Optional, Any
from pydantic import BaseModel


class TaskDispatchResponse(BaseModel):
    """Shape returned by every endpoint that dispatches (or skips) a Celery task.

    `status` discriminates the two cases: "queued" means `task_id` is set and
    the frontend should poll /tasks/{task_id}/status; "skipped" means the work
    was already done today (task_id is None, nothing to poll).
    """

    message: str
    status: str
    task_id: Optional[str] = None
    campaign_id: Optional[int] = None
    total_saved: Optional[int] = None


class TaskProgress(BaseModel):
    current: int
    total: int
    eta_seconds: Optional[int] = None


class TaskStatusResponse(BaseModel):
    task_id: str
    state: str
    ready: bool
    successful: Optional[bool] = None
    result: Optional[Any] = None
    error: Optional[str] = None
    progress: Optional[TaskProgress] = None

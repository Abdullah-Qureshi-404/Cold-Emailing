from fastapi import APIRouter

from celery_app import celery_app
from schemas.task import TaskStatusResponse

router = APIRouter()


@router.get("/{task_id}/status", response_model=TaskStatusResponse)
def get_task_status(task_id: str):
    """
    Reports the live state of a dispatched Celery task so the frontend can
    poll until completion instead of assuming the task finished instantly.
    """
    result = celery_app.AsyncResult(task_id)

    error = None
    task_result = None
    progress = None
    if result.ready():
        if result.successful():
            task_result = result.result
        else:
            error = str(result.result)
    elif result.state == "PROGRESS" and isinstance(result.info, dict):
        progress = result.info

    return TaskStatusResponse(
        task_id=task_id,
        state=result.state,
        ready=result.ready(),
        successful=result.successful() if result.ready() else None,
        result=task_result,
        error=error,
        progress=progress,
    )


@router.delete("/{task_id}")
def cancel_task(task_id: str):
    """
    Requests cancellation of a running task. Note: leads already picked up by
    an in-flight worker thread will still finish that single lead — this
    stops the task from starting new work, it isn't an instant kill switch.
    """
    celery_app.control.revoke(task_id, terminate=True)
    return {"message": "Cancellation requested", "task_id": task_id}

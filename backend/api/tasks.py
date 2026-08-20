from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db

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


@router.get("/activity")
def get_tasks_activity(db: Session = Depends(get_db)):
    """
    Returns authentic background task executions and stage throughput
    derived directly from database events and active stage locks in Redis.
    """
    from services.redis_lock import get_redis_client
    from models.campaign import Campaign
    from models.lead import Lead
    from models.lead_research import LeadResearch
    from models.email_draft import EmailDraft

    activities = []
    redis_client = get_redis_client()

    campaigns = db.query(Campaign).all()
    for c in campaigns:
        is_researching = False
        is_qualifying = False
        is_drafting = False
        is_discovering = False

        if redis_client:
            try:
                is_researching = bool(redis_client.get(f"campaign_lock:{c.id}:research"))
                is_qualifying = bool(redis_client.get(f"campaign_lock:{c.id}:qualification"))
                is_drafting = bool(redis_client.get(f"campaign_lock:{c.id}:email_writing"))
                is_discovering = bool(redis_client.get(f"campaign_lock:{c.id}:email_discovery"))
            except Exception:
                pass

        total_leads = db.query(Lead).filter(Lead.campaign_id == c.id).count()
        researched_count = db.query(LeadResearch).join(Lead).filter(Lead.campaign_id == c.id).count()
        qualified_count = db.query(Lead).filter(
            Lead.campaign_id == c.id,
            Lead.qualification_reason.isnot(None)
        ).count()
        drafts_count = db.query(EmailDraft).join(Lead).filter(Lead.campaign_id == c.id).count()

        # Research Stage Task
        if is_researching or researched_count > 0:
            activities.append({
                "id": f"research-{c.id}",
                "label": f"AI Lead Research ({c.name})",
                "campaign_id": c.id,
                "status": "running" if is_researching else "success",
                "current": researched_count,
                "total": total_leads,
                "stage": "research",
            })

        # Qualification Stage Task
        if is_qualifying or qualified_count > 0:
            activities.append({
                "id": f"qualify-{c.id}",
                "label": f"ICP Qualification ({c.name})",
                "campaign_id": c.id,
                "status": "running" if is_qualifying else "success",
                "current": qualified_count,
                "total": researched_count if researched_count > 0 else total_leads,
                "stage": "qualification",
            })

        # Email Writing Stage Task
        if is_drafting or drafts_count > 0:
            activities.append({
                "id": f"draft-{c.id}",
                "label": f"Cold Email Generation ({c.name})",
                "campaign_id": c.id,
                "status": "running" if is_drafting else "success",
                "current": drafts_count,
                "total": qualified_count if qualified_count > 0 else total_leads,
                "stage": "email_writing",
            })

    return activities


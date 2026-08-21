import logging
from celery_app import celery_app
from database import SessionLocal
from models.campaign import Campaign, CampaignStatus
from models.lead import Lead, LeadStatus
from models.email_draft import EmailDraft
from tasks.email_tasks import process_email_discovery_task
from tasks.research_tasks import process_lead_research_task
from tasks.qualification_tasks import process_qualification_task, process_email_writing_task
from services.redis_lock import is_stage_locked, throttle_stage_dispatch
from config import STAGE_THROTTLE_SECONDS

logger = logging.getLogger(__name__)


def reconcile_single_campaign(campaign_id: int, db) -> dict:
    """
    Scans a single campaign for incomplete downstream work and dispatches
    the appropriate tasks safely if no active lease or recent throttle exists.
    """
    dispatched = []

    # Helper to check if a stage can be dispatched safely
    def can_dispatch(stage: str) -> bool:
        if is_stage_locked(campaign_id, stage):
            logger.debug("Reconciler: campaign %d stage '%s' is actively running (locked); skipping", campaign_id, stage)
            return False
        if not throttle_stage_dispatch(campaign_id, stage, ttl_seconds=STAGE_THROTTLE_SECONDS):
            logger.debug("Reconciler: campaign %d stage '%s' was dispatched recently (throttled); skipping", campaign_id, stage)
            return False
        return True

    # 1. Check for leads in RESEARCH_COMPLETE that have not yet been evaluated for qualification
    unqual_count = db.query(Lead).filter(
        Lead.campaign_id == campaign_id,
        Lead.status == LeadStatus.RESEARCH_COMPLETE,
        Lead.qualification_reason.is_(None)
    ).count()

    if unqual_count > 0 and can_dispatch("qualification"):
        logger.info(
            "Campaign %d reconciler: %d research_complete leads awaiting qualification -> dispatching process_qualification_task",
            campaign_id, unqual_count
        )
        process_qualification_task.delay(campaign_id=campaign_id)
        dispatched.append(f"qualification ({unqual_count} leads)")

    # 2. Check for QUALIFIED leads that do not yet have an EmailDraft
    drafted_lead_ids = db.query(EmailDraft.lead_id).filter(
        EmailDraft.lead_id == Lead.id,
        Lead.campaign_id == campaign_id
    )
    undrafted_count = db.query(Lead).filter(
        Lead.campaign_id == campaign_id,
        Lead.status == LeadStatus.QUALIFIED,
        ~Lead.id.in_(drafted_lead_ids)
    ).count()

    if undrafted_count > 0 and can_dispatch("email_writing"):
        logger.info(
            "Campaign %d reconciler: %d qualified leads awaiting email drafts -> dispatching process_email_writing_task",
            campaign_id, undrafted_count
        )
        process_email_writing_task.delay(campaign_id=campaign_id)
        dispatched.append(f"email_writing ({undrafted_count} leads)")

    # 3. Check for EMAIL_FOUND / RESEARCH_PENDING leads waiting for research
    research_pending_count = db.query(Lead).filter(
        Lead.campaign_id == campaign_id,
        Lead.status.in_([LeadStatus.EMAIL_FOUND, LeadStatus.RESEARCH_PENDING])
    ).count()

    if research_pending_count > 0 and can_dispatch("research"):
        logger.info(
            "Campaign %d reconciler: %d email_found/pending leads awaiting research -> dispatching process_lead_research_task",
            campaign_id, research_pending_count
        )
        process_lead_research_task.delay(campaign_id=campaign_id)
        dispatched.append(f"research ({research_pending_count} leads)")

    # 4. Check for FOUND leads waiting for email discovery
    found_count = db.query(Lead).filter(
        Lead.campaign_id == campaign_id,
        Lead.status == LeadStatus.FOUND
    ).count()

    if found_count > 0 and can_dispatch("email_discovery"):
        logger.info(
            "Campaign %d reconciler: %d found leads awaiting email discovery -> dispatching process_email_discovery_task",
            campaign_id, found_count
        )
        process_email_discovery_task.delay(campaign_id=campaign_id)
        dispatched.append(f"email_discovery ({found_count} leads)")

    return {
        "campaign_id": campaign_id,
        "dispatched_stages": dispatched
    }


@celery_app.task
def reconcile_campaigns_task() -> dict:
    """
    Self-healing Celery Beat task that runs every 30 seconds.
    Scans all active campaigns and automatically resumes any stalled or interrupted stages.
    """
    db = SessionLocal()
    results = []

    try:
        active_campaigns = db.query(Campaign).filter(
            Campaign.status == CampaignStatus.active
        ).all()

        if not active_campaigns:
            logger.debug("Reconciler: no active campaigns found")
            return {"status": "success", "reconciled_campaigns": 0}

        for campaign in active_campaigns:
            res = reconcile_single_campaign(campaign.id, db)
            if res.get("dispatched_stages"):
                results.append(res)

        if results:
            logger.info("Reconciler sweep: %d campaigns had pending work dispatched: %s", len(results), results)
        return {
            "status": "success",
            "reconciled_count": len(results),
            "details": results
        }

    except Exception as e:
        logger.exception("Reconciler fatal error: %s", e)
        return {"status": "error", "message": str(e)}
    finally:
        db.close()

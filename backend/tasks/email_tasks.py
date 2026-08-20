import logging
from celery_app import celery_app
from database import SessionLocal
from models.lead import Lead, LeadStatus
from services.email_finder import find_email_from_website
from services.email_verifier import verify_email_domain
from tasks.errors import safe_task_error
from services.redis_lock import acquire_stage_lock, release_stage_lock

logger = logging.getLogger(__name__)


@celery_app.task
def process_email_discovery_task(campaign_id: int) -> dict:
    """
    Background Celery task that processes leads with status FOUND for a given campaign.
    Updates status: FOUND -> EMAIL_SEARCHING -> EMAIL_FOUND or EMAIL_NOT_FOUND.
    Protected by distributed lock to prevent duplicate concurrent runs.
    """
    if not acquire_stage_lock(campaign_id, "email_discovery", ttl_seconds=180):
        logger.info("Email discovery task skipped for campaign %d: stage is already locked/running", campaign_id)
        return {
            "status": "skipped",
            "message": "Email discovery task already running for this campaign",
            "processed": 0,
            "emails_found": 0
        }

    logger.info("Email discovery task started for campaign %d", campaign_id)
    db = SessionLocal()
    processed_count = 0
    found_count = 0

    try:
        leads = db.query(Lead).filter(
            Lead.campaign_id == campaign_id,
            Lead.status == LeadStatus.FOUND
        ).all()

        if not leads:
            logger.info("Email discovery task: no FOUND leads found for campaign %d", campaign_id)
            return {
                "status": "success",
                "message": "No FOUND leads to process",
                "processed": 0,
                "emails_found": 0
            }

        logger.info("Email discovery task: processing %d leads for campaign %d", len(leads), campaign_id)

        for lead in leads:
            lead.status = LeadStatus.EMAIL_SEARCHING
            db.commit()

            discovered_email = None

            if lead.website:
                discovered_email = find_email_from_website(lead.website)

            if discovered_email:
                is_valid = verify_email_domain(discovered_email)
                if is_valid:
                    lead.email = discovered_email
                    lead.status = LeadStatus.EMAIL_FOUND
                    found_count += 1
                else:
                    lead.status = LeadStatus.EMAIL_NOT_FOUND
            else:
                lead.status = LeadStatus.EMAIL_NOT_FOUND

            db.commit()
            processed_count += 1

        summary = {
            "status": "success",
            "message": "Email discovery completed",
            "processed": processed_count,
            "emails_found": found_count
        }
        logger.info("Email discovery task finished for campaign %d: %s", campaign_id, summary)
        if found_count > 0:
            from tasks.research_tasks import process_lead_research_task
            process_lead_research_task.delay(campaign_id=campaign_id)
        return summary

    except Exception as e:
        db.rollback()
        logger.exception("Email discovery task error for campaign %d: %s", campaign_id, e)
        return {
            "status": "error",
            "message": safe_task_error("Email discovery", e)
        }
    finally:
        db.close()
        release_stage_lock(campaign_id, "email_discovery")

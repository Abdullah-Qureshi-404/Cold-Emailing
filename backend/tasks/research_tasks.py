import logging
from celery_app import celery_app
from database import SessionLocal
from models.lead import Lead, LeadStatus
from agents.research_agent import research_lead

logger = logging.getLogger(__name__)


@celery_app.task
def process_lead_research_task(campaign_id: int) -> dict:
    """
    Background Celery task that finds all EMAIL_FOUND leads for a campaign
    and runs the AI research pipeline on each one individually.
    """
    logger.info("Research task started for campaign %d", campaign_id)
    db = SessionLocal()
    processed_count = 0
    success_count = 0
    failed_count = 0

    try:
        leads = db.query(Lead).filter(
            Lead.campaign_id == campaign_id,
            Lead.status == LeadStatus.EMAIL_FOUND
        ).all()

        if not leads:
            logger.info("Research task: no EMAIL_FOUND leads found for campaign %d", campaign_id)
            return {
                "status": "success",
                "message": "No EMAIL_FOUND leads to research",
                "processed": 0,
                "researched": 0,
                "failed": 0
            }

        logger.info("Research task: processing %d leads for campaign %d", len(leads), campaign_id)

        for lead in leads:
            processed_count += 1
            try:
                result = research_lead(lead, db)
                if result:
                    success_count += 1
                else:
                    failed_count += 1
            except Exception as e:
                db.rollback()
                failed_count += 1
                logger.error("Research task: exception on lead %d (%s): %s", lead.id, lead.company_name, e)
                continue

        summary = {
            "status": "success",
            "message": "Lead research completed",
            "processed": processed_count,
            "researched": success_count,
            "failed": failed_count
        }
        logger.info("Research task finished for campaign %d: %s", campaign_id, summary)
        return summary

    except Exception as e:
        db.rollback()
        logger.exception("Research task fatal error on campaign %d: %s", campaign_id, e)
        return {
            "status": "error",
            "message": str(e)
        }
    finally:
        db.close()

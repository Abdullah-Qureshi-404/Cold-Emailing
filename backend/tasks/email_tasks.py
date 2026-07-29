import logging
from celery_app import celery_app
from database import SessionLocal
from models.lead import Lead, LeadStatus
from services.email_finder import find_email_from_website
from services.email_verifier import verify_email_domain

logger = logging.getLogger(__name__)


@celery_app.task
def process_email_discovery_task(campaign_id: int) -> dict:
    """
    Background Celery task that processes leads with status FOUND for a given campaign.
    Updates status: FOUND -> EMAIL_SEARCHING -> EMAIL_FOUND or EMAIL_NOT_FOUND.
    """
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
        return summary

    except Exception as e:
        db.rollback()
        logger.exception("Email discovery task error for campaign %d: %s", campaign_id, e)
        return {
            "status": "error",
            "message": str(e)
        }
    finally:
        db.close()

import logging
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from celery_app import celery_app
from database import SessionLocal
from models.lead import Lead, LeadStatus
from services.email_finder import find_email_from_website
from services.email_verifier import verify_email_domain
from tasks.errors import safe_task_error
from services.redis_lock import acquire_stage_lock, renew_stage_lock, release_stage_lock
from config import (
    EMAIL_DISCOVERY_CONCURRENCY,
    EMAIL_DISCOVERY_BATCH_SIZE,
    STAGE_LOCK_TTL_SECONDS
)

logger = logging.getLogger(__name__)


def _discover_one(lead_id: int) -> bool:
    """
    Performs email discovery and MX domain verification for a single lead.
    Thread-safe with its own DB session.
    Returns True if an email was found, False otherwise.
    """
    db = SessionLocal()
    try:
        lead = db.query(Lead).filter(Lead.id == lead_id).first()
        if not lead:
            return False

        lead.status = LeadStatus.EMAIL_SEARCHING
        db.commit()

        discovered_email = None
        if lead.website:
            discovered_email = find_email_from_website(lead.website)

        found = False
        if discovered_email:
            is_valid = verify_email_domain(discovered_email)
            if is_valid:
                lead.email = discovered_email
                lead.status = LeadStatus.EMAIL_FOUND
                found = True
            else:
                lead.status = LeadStatus.EMAIL_NOT_FOUND
        else:
            lead.status = LeadStatus.EMAIL_NOT_FOUND

        db.commit()
        return found
    except Exception as e:
        db.rollback()
        logger.error("Email discovery error on lead %d: %s", lead_id, e)
        return False
    finally:
        db.close()


@celery_app.task(bind=True)
def process_email_discovery_task(self, campaign_id: int) -> dict:
    """
    Background Celery task that processes FOUND leads with bounded concurrency,
    batching, and renewable stage lease.
    """
    lock_token = acquire_stage_lock(campaign_id, "email_discovery", ttl_seconds=STAGE_LOCK_TTL_SECONDS)
    if not lock_token:
        logger.info("Email discovery task skipped for campaign %d: stage is already locked/running", campaign_id)
        return {
            "status": "skipped",
            "message": "Email discovery task already running for this campaign",
            "processed": 0,
            "emails_found": 0
        }

    logger.info("Email discovery task started for campaign %d [token=%s, concurrency=%d, batch_size=%d]",
                campaign_id, lock_token, EMAIL_DISCOVERY_CONCURRENCY, EMAIL_DISCOVERY_BATCH_SIZE)

    total_processed = 0
    total_found = 0
    batch_index = 0
    started_at = time.time()

    try:
        while True:
            batch_index += 1
            batch_start_time = time.time()
            db = SessionLocal()
            try:
                leads = db.query(Lead).filter(
                    Lead.campaign_id == campaign_id,
                    Lead.status.in_([LeadStatus.FOUND, LeadStatus.EMAIL_SEARCHING])
                ).limit(EMAIL_DISCOVERY_BATCH_SIZE).all()

                lead_ids = [l.id for l in leads]
            finally:
                db.close()

            if not lead_ids:
                if batch_index == 1:
                    logger.info("Email discovery task: no FOUND leads for campaign %d", campaign_id)
                    return {
                        "status": "success",
                        "message": "No FOUND leads to process",
                        "processed": 0,
                        "emails_found": 0
                    }
                else:
                    logger.info("Email discovery task: all batches completed for campaign %d", campaign_id)
                    break

            batch_size = len(lead_ids)
            batch_found = 0

            with ThreadPoolExecutor(max_workers=EMAIL_DISCOVERY_CONCURRENCY) as pool:
                futures = [pool.submit(_discover_one, lid) for lid in lead_ids]
                for future in as_completed(futures):
                    try:
                        if future.result():
                            batch_found += 1
                    except Exception as e:
                        logger.error("Email discovery future error: %s", e)

            total_processed += batch_size
            total_found += batch_found

            batch_duration = time.time() - batch_start_time
            batch_rate = (batch_size / batch_duration * 60) if batch_duration > 0 else 0.0

            # Renew lease
            renew_ok = renew_stage_lock(campaign_id, "email_discovery", lock_token, extend_seconds=STAGE_LOCK_TTL_SECONDS)

            logger.info(
                "[STAGE: email_discovery] [CAMPAIGN: %d] [BATCH: %d] size=%d found=%d duration=%.2fs rate=%.2f leads/min lock_renewed=%s",
                campaign_id, batch_index, batch_size, batch_found, batch_duration, batch_rate, renew_ok
            )

        summary = {
            "status": "success",
            "message": "Email discovery completed",
            "processed": total_processed,
            "emails_found": total_found,
            "duration_seconds": round(time.time() - started_at, 2)
        }
        logger.info("Email discovery task finished for campaign %d: %s", campaign_id, summary)

        if total_found > 0:
            from tasks.research_tasks import process_lead_research_task
            process_lead_research_task.delay(campaign_id=campaign_id)

        return summary

    except Exception as e:
        logger.exception("Email discovery task fatal error for campaign %d: %s", campaign_id, e)
        return {
            "status": "error",
            "message": safe_task_error("Email discovery", e)
        }
    finally:
        release_stage_lock(campaign_id, "email_discovery", lock_token)

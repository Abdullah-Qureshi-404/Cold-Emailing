import logging
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from celery_app import celery_app
from database import SessionLocal
from models.lead import Lead, LeadStatus
from agents.qualification_agent import qualify_lead
from agents.email_writer_agent import write_email_for_lead
from tasks.errors import safe_task_error

logger = logging.getLogger(__name__)

# Email writing calls Groq per lead — same I/O-bound bottleneck as research,
# same fix: process leads concurrently instead of one at a time.
EMAIL_WRITING_CONCURRENCY = 5


def _write_one(lead_id: int) -> tuple[bool, str | None]:
    db = SessionLocal()
    try:
        lead = db.query(Lead).filter(Lead.id == lead_id).first()
        if not lead:
            return False, "lead_not_found"
        return write_email_for_lead(lead, db)
    except Exception as e:
        db.rollback()
        logger.error("Email writing task: exception on lead %d: %s", lead_id, e)
        return False, str(e)
    finally:
        db.close()


@celery_app.task
def process_qualification_task(campaign_id: int) -> dict:
    """
    Background Celery task that finds all RESEARCH_COMPLETE leads for a campaign
    and runs qualification logic on each one individually.
    """
    logger.info("Qualification task started for campaign %d", campaign_id)
    db = SessionLocal()
    processed_count = 0
    qualified_count = 0
    disqualified_count = 0
    failed_count = 0

    try:
        leads = db.query(Lead).filter(
            Lead.campaign_id == campaign_id,
            Lead.status == LeadStatus.RESEARCH_COMPLETE
        ).all()

        if not leads:
            logger.info("Qualification task: no RESEARCH_COMPLETE leads found for campaign %d", campaign_id)
            return {
                "status": "success",
                "message": "No RESEARCH_COMPLETE leads to qualify",
                "processed": 0,
                "qualified": 0,
                "disqualified": 0,
                "failed": 0
            }

        logger.info("Qualification task: processing %d leads for campaign %d", len(leads), campaign_id)

        for lead in leads:
            processed_count += 1
            try:
                is_qualified = qualify_lead(lead, db)
                if is_qualified:
                    qualified_count += 1
                else:
                    disqualified_count += 1
            except Exception as e:
                db.rollback()
                failed_count += 1
                logger.error("Qualification task: error processing lead %d (%s): %s", lead.id, lead.company_name, e)
                continue

        summary = {
            "status": "success",
            "message": "Qualification completed",
            "processed": processed_count,
            "qualified": qualified_count,
            "disqualified": disqualified_count,
            "failed": failed_count
        }
        logger.info("Qualification task finished for campaign %d: %s", campaign_id, summary)
        if qualified_count > 0:
            process_email_writing_task.delay(campaign_id=campaign_id)
        return summary

    except Exception as e:
        db.rollback()
        logger.exception("Qualification task fatal error on campaign %d: %s", campaign_id, e)
        return {
            "status": "error",
            "message": safe_task_error("Qualification/email writing", e)
        }
    finally:
        db.close()


@celery_app.task(bind=True)
def process_email_writing_task(self, campaign_id: int) -> dict:
    """
    Background Celery task that finds all QUALIFIED leads for a campaign
    and generates personalized cold email drafts for each one individually.
    """
    logger.info("Email writing task started for campaign %d", campaign_id)
    db = SessionLocal()
    processed_count = 0
    successful_count = 0
    failed_count = 0
    skipped_count = 0
    started_at = time.time()

    try:
        leads = db.query(Lead).filter(
            Lead.campaign_id == campaign_id,
            Lead.status == LeadStatus.QUALIFIED
        ).all()

        if not leads:
            logger.info("Email writing task: no QUALIFIED leads found for campaign %d", campaign_id)
            return {
                "status": "success",
                "message": "No QUALIFIED leads for email writing",
                "processed": 0,
                "successful": 0,
                "failed": 0,
                "skipped": 0
            }

        lead_ids = [l.id for l in leads]
        logger.info("Email writing task: processing %d QUALIFIED leads for campaign %d (concurrency=%d)", len(lead_ids), campaign_id, EMAIL_WRITING_CONCURRENCY)

        total = len(lead_ids)
        with ThreadPoolExecutor(max_workers=EMAIL_WRITING_CONCURRENCY) as pool:
            futures = {pool.submit(_write_one, lid): lid for lid in lead_ids}
            for future in as_completed(futures):
                processed_count += 1
                success, reason = future.result()
                if success:
                    if reason == "already_sent":
                        skipped_count += 1
                    else:
                        successful_count += 1
                else:
                    failed_count += 1
                    logger.warning("Email writing task: draft generation unsuccessful for lead %d (reason: %s)", futures[future], reason)

                elapsed = time.time() - started_at
                rate = processed_count / elapsed if elapsed > 0 else 0
                remaining = total - processed_count
                eta_seconds = int(remaining / rate) if rate > 0 else None
                self.update_state(
                    state="PROGRESS",
                    meta={"current": processed_count, "total": total, "eta_seconds": eta_seconds},
                )

        summary = {
            "status": "success",
            "message": "Email writing completed",
            "processed": processed_count,
            "successful": successful_count,
            "failed": failed_count,
            "skipped": skipped_count
        }
        logger.info("Email writing task finished for campaign %d: %s", campaign_id, summary)
        return summary

    except Exception as e:
        db.rollback()
        logger.exception("Email writing task fatal error on campaign %d: %s", campaign_id, e)
        return {
            "status": "error",
            "message": safe_task_error("Qualification/email writing", e)
        }
    finally:
        db.close()

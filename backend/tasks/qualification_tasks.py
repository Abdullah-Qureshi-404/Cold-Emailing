import logging
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from celery_app import celery_app
from database import SessionLocal
from models.lead import Lead, LeadStatus
from models.email_draft import EmailDraft
from agents.qualification_agent import qualify_lead
from agents.email_writer_agent import write_email_for_lead
from tasks.errors import safe_task_error
from services.redis_lock import acquire_stage_lock, renew_stage_lock, release_stage_lock
from config import STAGE_LOCK_TTL_SECONDS, RESEARCH_BATCH_SIZE

logger = logging.getLogger(__name__)

# Email writing calls Groq per lead — protected by groq_service rate limiting & semaphore
EMAIL_WRITING_CONCURRENCY = 3


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
    (that have not yet been evaluated) and runs qualification logic on each one individually.
    Protected by renewable distributed lock.
    """
    lock_token = acquire_stage_lock(campaign_id, "qualification", ttl_seconds=STAGE_LOCK_TTL_SECONDS)
    if not lock_token:
        logger.info("Qualification task skipped for campaign %d: stage is already locked/running", campaign_id)
        return {
            "status": "skipped",
            "message": "Qualification task already running for this campaign",
            "processed": 0,
            "qualified": 0,
            "disqualified": 0,
            "failed": 0
        }

    logger.info("Qualification task started for campaign %d [token=%s]", campaign_id, lock_token)
    db = SessionLocal()
    processed_count = 0
    qualified_count = 0
    disqualified_count = 0
    failed_count = 0

    try:
        leads = db.query(Lead).filter(
            Lead.campaign_id == campaign_id,
            Lead.status == LeadStatus.RESEARCH_COMPLETE,
            Lead.qualification_reason.is_(None)
        ).all()

        if not leads:
            logger.info("Qualification task: no un-evaluated RESEARCH_COMPLETE leads found for campaign %d", campaign_id)
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

            if processed_count % 50 == 0:
                renew_stage_lock(campaign_id, "qualification", lock_token, extend_seconds=STAGE_LOCK_TTL_SECONDS)

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
        release_stage_lock(campaign_id, "qualification", lock_token)


@celery_app.task(bind=True)
def process_email_writing_task(self, campaign_id: int) -> dict:
    """
    Background Celery task that processes QUALIFIED leads in bounded batches to generate email drafts.
    Protected by renewable distributed lock and bounded concurrency.
    """
    lock_token = acquire_stage_lock(campaign_id, "email_writing", ttl_seconds=STAGE_LOCK_TTL_SECONDS)
    if not lock_token:
        logger.info("Email writing task skipped for campaign %d: stage is already locked/running", campaign_id)
        return {
            "status": "skipped",
            "message": "Email writing task already running for this campaign",
            "processed": 0,
            "successful": 0,
            "failed": 0,
            "skipped": 0
        }

    logger.info("Email writing task started for campaign %d [token=%s, concurrency=%d]",
                campaign_id, lock_token, EMAIL_WRITING_CONCURRENCY)

    total_processed = 0
    total_successful = 0
    total_failed = 0
    total_skipped = 0
    batch_index = 0
    started_at = time.time()

    try:
        while True:
            batch_index += 1
            batch_start_time = time.time()
            db = SessionLocal()
            try:
                # Find qualified leads
                leads = db.query(Lead).filter(
                    Lead.campaign_id == campaign_id,
                    Lead.status == LeadStatus.QUALIFIED
                ).all()

                if not leads:
                    break

                existing_draft_lead_ids = {
                    row[0] for row in db.query(EmailDraft.lead_id).filter(
                        EmailDraft.lead_id.in_([l.id for l in leads])
                    ).all()
                }

                unwritten_lead_ids = [l.id for l in leads if l.id not in existing_draft_lead_ids]
                lead_ids = unwritten_lead_ids[:RESEARCH_BATCH_SIZE]
            finally:
                db.close()

            if not lead_ids:
                if batch_index == 1:
                    logger.info("Email writing task: all QUALIFIED leads already have drafts")
                    return {
                        "status": "success",
                        "message": "All qualified leads already have drafts",
                        "processed": 0,
                        "successful": 0,
                        "failed": 0,
                        "skipped": len(leads)
                    }
                else:
                    break

            batch_size = len(lead_ids)
            batch_success = 0
            batch_failed = 0
            batch_skipped = 0

            with ThreadPoolExecutor(max_workers=EMAIL_WRITING_CONCURRENCY) as pool:
                futures = {pool.submit(_write_one, lid): lid for lid in lead_ids}
                for future in as_completed(futures):
                    lid = futures[future]
                    try:
                        success, reason = future.result()
                        if success:
                            if reason == "already_sent":
                                batch_skipped += 1
                            else:
                                batch_success += 1
                        else:
                            batch_failed += 1
                            logger.warning("Email draft failed for lead %d (reason: %s)", lid, reason)
                    except Exception as e:
                        batch_failed += 1
                        logger.error("Email draft future error on lead %d: %s", lid, e)

            total_processed += batch_size
            total_successful += batch_success
            total_failed += batch_failed
            total_skipped += batch_skipped

            batch_duration = time.time() - batch_start_time
            batch_rate = (batch_size / batch_duration * 60) if batch_duration > 0 else 0.0

            renew_ok = renew_stage_lock(campaign_id, "email_writing", lock_token, extend_seconds=STAGE_LOCK_TTL_SECONDS)

            logger.info(
                "[STAGE: email_writing] [CAMPAIGN: %d] [BATCH: %d] size=%d success=%d failed=%d duration=%.2fs rate=%.2f leads/min lock_renewed=%s",
                campaign_id, batch_index, batch_size, batch_success, batch_failed, batch_duration, batch_rate, renew_ok
            )

        summary = {
            "status": "success",
            "message": "Email writing completed",
            "processed": total_processed,
            "successful": total_successful,
            "failed": total_failed,
            "skipped": total_skipped,
            "duration_seconds": round(time.time() - started_at, 2)
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
        release_stage_lock(campaign_id, "email_writing", lock_token)

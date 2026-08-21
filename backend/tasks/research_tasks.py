import logging
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from celery_app import celery_app
from database import SessionLocal
from models.lead import Lead, LeadStatus
from agents.research_agent import research_lead
from tasks.errors import safe_task_error
from services.redis_lock import acquire_stage_lock, renew_stage_lock, release_stage_lock
from config import (
    RESEARCH_CONCURRENCY,
    RESEARCH_BATCH_SIZE,
    STAGE_LOCK_TTL_SECONDS
)

logger = logging.getLogger(__name__)


def _research_one(lead_id: int) -> bool:
    """Runs research for a single lead on its own DB session (thread-safe)."""
    db = SessionLocal()
    try:
        lead = db.query(Lead).filter(Lead.id == lead_id).first()
        if not lead:
            return False
        return research_lead(lead, db)
    except Exception as e:
        db.rollback()
        logger.error("Research task: exception on lead %d: %s", lead_id, e)
        return False
    finally:
        db.close()


@celery_app.task(bind=True)
def process_lead_research_task(self, campaign_id: int) -> dict:
    """
    Background Celery task that processes EMAIL_FOUND / RESEARCH_PENDING leads in bounded batches
    with renewable lease management, concurrency control, and structured batch telemetry.
    """
    lock_token = acquire_stage_lock(campaign_id, "research", ttl_seconds=STAGE_LOCK_TTL_SECONDS)
    if not lock_token:
        logger.info("Research task skipped for campaign %d: stage is already locked/running", campaign_id)
        return {
            "status": "skipped",
            "message": "Research task already running for this campaign",
            "processed": 0,
            "researched": 0,
            "failed": 0
        }

    logger.info("Research task started for campaign %d [token=%s, concurrency=%d, batch_size=%d]",
                campaign_id, lock_token, RESEARCH_CONCURRENCY, RESEARCH_BATCH_SIZE)

    total_processed = 0
    total_successful = 0
    total_failed = 0
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
                    Lead.status.in_([LeadStatus.EMAIL_FOUND, LeadStatus.RESEARCH_PENDING])
                ).limit(RESEARCH_BATCH_SIZE).all()

                lead_ids = [l.id for l in leads]
            finally:
                db.close()

            if not lead_ids:
                if batch_index == 1:
                    logger.info("Research task: no EMAIL_FOUND / RESEARCH_PENDING leads found for campaign %d", campaign_id)
                    return {
                        "status": "success",
                        "message": "No EMAIL_FOUND leads to research",
                        "processed": 0,
                        "researched": 0,
                        "failed": 0
                    }
                else:
                    logger.info("Research task: all batches completed for campaign %d", campaign_id)
                    break

            batch_size = len(lead_ids)
            batch_successful = 0
            batch_failed = 0

            # Execute batch with controlled thread pool
            with ThreadPoolExecutor(max_workers=RESEARCH_CONCURRENCY) as pool:
                futures = [pool.submit(_research_one, lid) for lid in lead_ids]
                for future in as_completed(futures):
                    try:
                        if future.result():
                            batch_successful += 1
                        else:
                            batch_failed += 1
                    except Exception as e:
                        batch_failed += 1
                        logger.error("Research future raised unexpected error: %s", e)

            total_processed += batch_size
            total_successful += batch_successful
            total_failed += batch_failed

            batch_duration = time.time() - batch_start_time
            batch_rate = (batch_size / batch_duration * 60) if batch_duration > 0 else 0.0

            # Renew lease after completing the batch
            renew_ok = renew_stage_lock(campaign_id, "research", lock_token, extend_seconds=STAGE_LOCK_TTL_SECONDS)

            # Structured logging per batch
            logger.info(
                "[STAGE: research] [CAMPAIGN: %d] [BATCH: %d] size=%d success=%d failed=%d duration=%.2fs rate=%.2f leads/min lock_renewed=%s",
                campaign_id, batch_index, batch_size, batch_successful, batch_failed, batch_duration, batch_rate, renew_ok
            )

            # Report Celery progress state
            overall_elapsed = time.time() - started_at
            overall_rate = (total_processed / overall_elapsed * 60) if overall_elapsed > 0 else 0.0
            self.update_state(
                state="PROGRESS",
                meta={
                    "current": total_processed,
                    "batch": batch_index,
                    "successful": total_successful,
                    "failed": total_failed,
                    "rate_leads_per_min": round(overall_rate, 2)
                }
            )

        summary = {
            "status": "success",
            "message": "Lead research completed",
            "processed": total_processed,
            "researched": total_successful,
            "failed": total_failed,
            "duration_seconds": round(time.time() - started_at, 2)
        }
        logger.info("Research task finished for campaign %d: %s", campaign_id, summary)

        # Trigger downstream qualification if we processed any leads
        if total_successful > 0 or total_failed > 0:
            from tasks.qualification_tasks import process_qualification_task
            process_qualification_task.delay(campaign_id=campaign_id)

        return summary

    except Exception as e:
        logger.exception("Research task fatal error on campaign %d: %s", campaign_id, e)
        return {
            "status": "error",
            "message": safe_task_error("Research", e)
        }
    finally:
        release_stage_lock(campaign_id, "research", lock_token)

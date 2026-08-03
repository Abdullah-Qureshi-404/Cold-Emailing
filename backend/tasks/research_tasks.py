import logging
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from celery_app import celery_app
from database import SessionLocal
from models.lead import Lead, LeadStatus
from agents.research_agent import research_lead
from tasks.errors import safe_task_error

logger = logging.getLogger(__name__)

# Research is dominated by network I/O (website fetch + Groq call), so
# processing leads concurrently instead of one-by-one is a large speedup.
# Kept modest to stay polite to the target sites and Groq's rate limits.
RESEARCH_CONCURRENCY = 5


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
    Background Celery task that finds all EMAIL_FOUND leads for a campaign
    and runs the AI research pipeline on them concurrently.
    """
    logger.info("Research task started for campaign %d", campaign_id)
    db = SessionLocal()
    processed_count = 0
    success_count = 0
    failed_count = 0
    started_at = time.time()

    try:
        leads = db.query(Lead).filter(
            Lead.campaign_id == campaign_id,
            # Include RESEARCH_PENDING too: a lead lands there the instant
            # research starts, and previously stayed stuck there forever if
            # that attempt failed validation (no way to retry it). Re-running
            # this task now retries those alongside fresh EMAIL_FOUND leads.
            Lead.status.in_([LeadStatus.EMAIL_FOUND, LeadStatus.RESEARCH_PENDING])
        ).all()
        lead_ids = [l.id for l in leads]

        if not lead_ids:
            logger.info("Research task: no EMAIL_FOUND leads found for campaign %d", campaign_id)
            return {
                "status": "success",
                "message": "No EMAIL_FOUND leads to research",
                "processed": 0,
                "researched": 0,
                "failed": 0
            }

        logger.info("Research task: processing %d leads for campaign %d (concurrency=%d)", len(lead_ids), campaign_id, RESEARCH_CONCURRENCY)

        total = len(lead_ids)
        with ThreadPoolExecutor(max_workers=RESEARCH_CONCURRENCY) as pool:
            futures = [pool.submit(_research_one, lid) for lid in lead_ids]
            for future in as_completed(futures):
                processed_count += 1
                if future.result():
                    success_count += 1
                else:
                    failed_count += 1

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
            "message": "Lead research completed",
            "processed": processed_count,
            "researched": success_count,
            "failed": failed_count
        }
        logger.info("Research task finished for campaign %d: %s", campaign_id, summary)
        if success_count > 0:
            from tasks.qualification_tasks import process_qualification_task
            process_qualification_task.delay(campaign_id=campaign_id)
        return summary

    except Exception as e:
        db.rollback()
        logger.exception("Research task fatal error on campaign %d: %s", campaign_id, e)
        return {
            "status": "error",
            "message": safe_task_error("Research", e)
        }
    finally:
        db.close()

import logging
from celery_app import celery_app
from database import SessionLocal
from lead_sources.google_maps import scrape_google_maps
from lead_sources.free_outbound import import_free_outbound_leads
from lead_sources.hackernews import scrape_hackernews
from services.lead_service import save_leads
from tasks.errors import safe_task_error

logger = logging.getLogger(__name__)


def _chain_next(campaign_id: int) -> None:
    """
    Auto-advances the pipeline: once leads are in, immediately kick off email
    discovery so the user doesn't have to manually click through every stage.
    Import is local to avoid a circular import (email_tasks -> ... -> lead_tasks).
    """
    from tasks.email_tasks import process_email_discovery_task
    process_email_discovery_task.delay(campaign_id=campaign_id)


@celery_app.task
def scrape_google_maps_task(query: str, location: str, campaign_id: int) -> dict:
    """
    Background Celery task to execute Google Maps scraper,
    normalize incoming lead rows, and persist them into PostgreSQL database.
    """
    logger.info("Scrape Google Maps task started for campaign %d (query='%s', location='%s')", campaign_id, query, location)
    db = SessionLocal()
    try:
        leads = scrape_google_maps(
            query=query,
            location=location,
            campaign_id=campaign_id
        )

        if not leads:
            logger.info("Scrape Google Maps task: no leads found for campaign %d", campaign_id)
            return {
                "status": "success",
                "message": "No leads found",
                "total_saved": 0
            }

        saved_leads, duplicates_skipped = save_leads(db, leads)
        _chain_next(campaign_id)
        logger.info("Scrape Google Maps task completed for campaign %d: %d saved, %d duplicates skipped", campaign_id, len(saved_leads), duplicates_skipped)

        return {
            "status": "success",
            "message": f"Google Maps scraping completed successfully ({duplicates_skipped} duplicate(s) skipped)" if duplicates_skipped else "Google Maps scraping completed successfully",
            "total_saved": len(saved_leads),
            "duplicates_skipped": duplicates_skipped
        }
    except Exception as e:
        db.rollback()
        logger.exception("Scrape Google Maps task error for campaign %d: %s", campaign_id, e)
        return {
            "status": "error",
            "message": safe_task_error("Lead scraping", e)
        }
    finally:
        db.close()


@celery_app.task
def scrape_hackernews_task(query: str, campaign_id: int) -> dict:
    """
    Background Celery task to search Hacker News for intent-based leads
    (people publicly asking for developer/freelance help) and persist them.
    """
    logger.info("Scrape Hacker News task started for campaign %d (query='%s')", campaign_id, query)
    db = SessionLocal()
    try:
        leads = scrape_hackernews(query=query, campaign_id=campaign_id)

        if not leads:
            logger.info("Scrape Hacker News task: no leads found for campaign %d", campaign_id)
            return {"status": "success", "message": "No leads found", "total_saved": 0}

        saved_leads, duplicates_skipped = save_leads(db, leads)
        _chain_next(campaign_id)
        logger.info("Scrape Hacker News task completed for campaign %d: %d saved, %d duplicates skipped", campaign_id, len(saved_leads), duplicates_skipped)
        return {
            "status": "success",
            "message": f"Hacker News scraping completed successfully ({duplicates_skipped} duplicate(s) skipped)" if duplicates_skipped else "Hacker News scraping completed successfully",
            "total_saved": len(saved_leads),
            "duplicates_skipped": duplicates_skipped
        }
    except Exception as e:
        db.rollback()
        logger.exception("Scrape Hacker News task error for campaign %d: %s", campaign_id, e)
        return {"status": "error", "message": safe_task_error("Lead scraping", e)}
    finally:
        db.close()


@celery_app.task
def import_free_outbound_task(file_path: str, campaign_id: int) -> dict:
    """
    Background Celery task to import Free Outbound Agent CSV file,
    normalize lead rows, and persist them into PostgreSQL database.
    """
    logger.info("Import Free Outbound task started for campaign %d (path='%s')", campaign_id, file_path)
    db = SessionLocal()
    try:
        leads = import_free_outbound_leads(
            filepath=file_path,
            campaign_id=campaign_id
        )

        if not leads:
            logger.info("Import Free Outbound task: no valid leads found in CSV for campaign %d", campaign_id)
            return {
                "status": "success",
                "message": "No valid leads found in CSV",
                "total_saved": 0
            }

        saved_leads, duplicates_skipped = save_leads(db, leads)
        _chain_next(campaign_id)
        logger.info("Import Free Outbound task completed for campaign %d: %d saved, %d duplicates skipped", campaign_id, len(saved_leads), duplicates_skipped)

        return {
            "status": "success",
            "message": f"Free Outbound leads imported successfully ({duplicates_skipped} duplicate(s) skipped)" if duplicates_skipped else "Free Outbound leads imported successfully",
            "total_saved": len(saved_leads),
            "duplicates_skipped": duplicates_skipped
        }
    except Exception as e:
        db.rollback()
        logger.exception("Import Free Outbound task error for campaign %d: %s", campaign_id, e)
        return {
            "status": "error",
            "message": safe_task_error("Lead scraping", e)
        }
    finally:
        db.close()

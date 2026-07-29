import logging
from celery_app import celery_app
from database import SessionLocal
from lead_sources.google_maps import scrape_google_maps
from lead_sources.free_outbound import import_free_outbound_leads
from services.lead_service import save_leads

logger = logging.getLogger(__name__)


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

        saved_leads = save_leads(db, leads)
        logger.info("Scrape Google Maps task completed for campaign %d: %d saved", campaign_id, len(saved_leads))

        return {
            "status": "success",
            "message": "Google Maps scraping completed successfully",
            "total_saved": len(saved_leads)
        }
    except Exception as e:
        db.rollback()
        logger.exception("Scrape Google Maps task error for campaign %d: %s", campaign_id, e)
        return {
            "status": "error",
            "message": str(e)
        }
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

        saved_leads = save_leads(db, leads)
        logger.info("Import Free Outbound task completed for campaign %d: %d saved", campaign_id, len(saved_leads))

        return {
            "status": "success",
            "message": "Free Outbound leads imported successfully",
            "total_saved": len(saved_leads)
        }
    except Exception as e:
        db.rollback()
        logger.exception("Import Free Outbound task error for campaign %d: %s", campaign_id, e)
        return {
            "status": "error",
            "message": str(e)
        }
    finally:
        db.close()

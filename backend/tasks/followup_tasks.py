import time
import random
import logging
from datetime import datetime, timedelta
from sqlalchemy import or_
from sqlalchemy.sql import func

from celery_app import celery_app
from database import SessionLocal
from models.lead import Lead, LeadStatus
from models.email_draft import EmailDraft
from models.email_log import EmailLog
from services.gmail_service import send_email
from services.groq_service import generate_followup_email

logger = logging.getLogger(__name__)


@celery_app.task
def process_followup_task(campaign_id: int) -> dict:
    """
    Background Celery task to send follow-up emails to leads with status SENT or FOLLOWUP_1,
    or mark FOLLOWUP_2 leads as COLD.
    """
    logger.info("Follow-up task started for campaign %d", campaign_id)
    db = SessionLocal()
    sent_count = 0
    cold_count = 0

    try:
        leads = db.query(Lead).filter(
            Lead.campaign_id == campaign_id,
            or_(
                Lead.status == LeadStatus.SENT,
                Lead.status == LeadStatus.FOLLOWUP_1,
                Lead.status == LeadStatus.FOLLOWUP_2
            )
        ).all()

        if not leads:
            logger.info("Follow-up task: no leads eligible for follow-up in campaign %d", campaign_id)
            return {
                "status": "success",
                "message": "No leads eligible for follow-up",
                "followups_sent": 0,
                "marked_cold": 0
            }

        eligible_leads = []
        for lead in leads:
            if lead.status == LeadStatus.FOLLOWUP_2:
                lead.status = LeadStatus.COLD
                db.commit()
                cold_count += 1
                logger.info("Followup agent: lead %d (%s) marked COLD", lead.id, lead.company_name)
                continue

            log = db.query(EmailLog).filter(
                EmailLog.lead_id == lead.id,
                EmailLog.status == "sent"
            ).order_by(EmailLog.id.desc()).first()

            if not log or not log.sent_at:
                continue

            now = datetime.utcnow()
            if (now - log.sent_at) > timedelta(days=3):
                eligible_leads.append((lead, log))

        for idx, (lead, log) in enumerate(eligible_leads):
            if not lead.email:
                continue

            draft = db.query(EmailDraft).filter(EmailDraft.lead_id == lead.id).first()
            original_subject = draft.subject if (draft and draft.subject) else "Following up"

            followup_content = generate_followup_email(
                company_name=lead.company_name,
                original_subject=original_subject
            )

            if not followup_content:
                logger.warning("Followup agent: failed to generate copy for lead %d", lead.id)
                continue

            result = send_email(
                to_email=lead.email,
                subject=followup_content.get("subject", f"Re: {original_subject}"),
                body=followup_content.get("body", "")
            )

            if result and result.get("gmail_thread_id"):
                new_log = EmailLog(
                    lead_id=lead.id,
                    email_draft_id=draft.id if draft else None,
                    gmail_thread_id=result.get("gmail_thread_id"),
                    sent_at=func.now(),
                    status="sent"
                )
                db.add(new_log)

                if lead.status == LeadStatus.SENT:
                    lead.status = LeadStatus.FOLLOWUP_1
                elif lead.status == LeadStatus.FOLLOWUP_1:
                    lead.status = LeadStatus.FOLLOWUP_2

                db.commit()
                sent_count += 1
                logger.info("Followup agent: sent follow-up to lead %d (%s), new status: %s", lead.id, lead.email, lead.status.value)

                if idx < len(eligible_leads) - 1:
                    delay_seconds = random.randint(45, 120)
                    logger.info("Followup agent: waiting %d seconds before next send...", delay_seconds)
                    time.sleep(delay_seconds)

        summary = {
            "status": "success",
            "message": "Follow-up processing completed",
            "followups_sent": sent_count,
            "marked_cold": cold_count
        }
        logger.info("Follow-up task finished for campaign %d: %s", campaign_id, summary)
        return summary

    except Exception as e:
        db.rollback()
        logger.exception("Follow-up task fatal error on campaign %d: %s", campaign_id, e)
        return {
            "status": "error",
            "message": str(e)
        }
    finally:
        db.close()


@celery_app.task
def process_mark_cold_task(campaign_id: int) -> dict:
    """
    Background Celery task that finds FOLLOWUP_2 leads older than 7 days without reply
    and transitions their status to COLD.
    """
    logger.info("Mark cold task started for campaign %d", campaign_id)
    db = SessionLocal()
    marked_cold_count = 0

    try:
        leads = db.query(Lead).filter(
            Lead.campaign_id == campaign_id,
            Lead.status == LeadStatus.FOLLOWUP_2
        ).all()

        if not leads:
            logger.info("Mark cold task: no FOLLOWUP_2 leads found for campaign %d", campaign_id)
            return {
                "status": "success",
                "message": "No FOLLOWUP_2 leads to mark as cold",
                "marked_cold": 0
            }

        now = datetime.utcnow()
        for lead in leads:
            log = db.query(EmailLog).filter(
                EmailLog.lead_id == lead.id,
                EmailLog.status == "sent"
            ).order_by(EmailLog.id.desc()).first()

            if log and log.sent_at:
                if (now - log.sent_at) > timedelta(days=7):
                    lead.status = LeadStatus.COLD
                    db.commit()
                    marked_cold_count += 1
                    logger.info("Mark cold task: lead %d (%s) marked COLD", lead.id, lead.company_name)

        summary = {
            "status": "success",
            "message": "Mark cold task completed",
            "marked_cold": marked_cold_count
        }
        logger.info("Mark cold task finished for campaign %d: %s", campaign_id, summary)
        return summary

    except Exception as e:
        db.rollback()
        logger.exception("Mark cold task fatal error on campaign %d: %s", campaign_id, e)
        return {
            "status": "error",
            "message": str(e)
        }
    finally:
        db.close()

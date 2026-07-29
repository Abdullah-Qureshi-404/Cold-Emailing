import time
import random
import logging
from datetime import datetime, timedelta
from sqlalchemy import or_
from sqlalchemy.sql import func

from celery_app import celery_app
from database import SessionLocal
from models.campaign import Campaign
from models.lead import Lead, LeadStatus
from models.email_draft import EmailDraft
from models.email_log import EmailLog
from services.gmail_service import send_email, check_thread_for_reply

logger = logging.getLogger(__name__)


@celery_app.task
def process_email_sending_task(campaign_id: int) -> dict:
    """
    Background Celery task that sends cold emails via Gmail API.

    Rules:
    - Target leads: status is EMAIL_GENERATED or WAITING_APPROVAL.
    - For EMAIL_GENERATED: send automatically if draft exists.
    - For WAITING_APPROVAL: send ONLY if draft status is 'approved'.
    - Enforces campaign daily_limit.
    - Adds random delay (45 to 120 seconds) between sends.
    - Creates EmailLog, updates lead.status to SENT, draft.status to 'sent'.
    """
    logger.info("Email sending task started for campaign %d", campaign_id)
    db = SessionLocal()
    sent_count = 0
    failed_count = 0

    try:
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        daily_limit = campaign.daily_limit if campaign and campaign.daily_limit else 50

        leads = db.query(Lead).filter(
            Lead.campaign_id == campaign_id,
            or_(
                Lead.status == LeadStatus.EMAIL_GENERATED,
                Lead.status == LeadStatus.WAITING_APPROVAL
            )
        ).all()

        if not leads:
            logger.info("Email sending task: no eligible leads found for campaign %d", campaign_id)
            return {
                "status": "success",
                "message": "No eligible leads to send emails",
                "sent": 0,
                "failed": 0
            }

        eligible_pairs = []
        for lead in leads:
            if not lead.email:
                continue

            draft = db.query(EmailDraft).filter(EmailDraft.lead_id == lead.id).first()
            if not draft or not draft.subject or not draft.body:
                continue

            if draft.status == "sent":
                logger.info("Email sending task: draft for lead %d already sent; skipping", lead.id)
                continue

            if lead.status == LeadStatus.EMAIL_GENERATED:
                eligible_pairs.append((lead, draft))
            elif lead.status == LeadStatus.WAITING_APPROVAL and draft.status == "approved":
                eligible_pairs.append((lead, draft))

        target_pairs = eligible_pairs[:daily_limit]
        logger.info(
            "Email sending task: processing %d target pairs (daily limit: %d) for campaign %d",
            len(target_pairs),
            daily_limit,
            campaign_id
        )

        for idx, (lead, draft) in enumerate(target_pairs):
            result = send_email(
                to_email=lead.email,
                subject=draft.subject,
                body=draft.body
            )

            if result and result.get("gmail_thread_id"):
                log = EmailLog(
                    lead_id=lead.id,
                    email_draft_id=draft.id,
                    gmail_thread_id=result.get("gmail_thread_id"),
                    sent_at=func.now(),
                    status="sent"
                )
                db.add(log)

                lead.status = LeadStatus.SENT
                draft.status = "sent"
                db.commit()

                sent_count += 1
                logger.info("Email sender: sent email to lead %d (%s)", lead.id, lead.email)

                if idx < len(target_pairs) - 1:
                    delay_seconds = random.randint(45, 120)
                    logger.info("Email sender: waiting %d seconds before next send...", delay_seconds)
                    time.sleep(delay_seconds)
            else:
                log = EmailLog(
                    lead_id=lead.id,
                    email_draft_id=draft.id,
                    status="failed"
                )
                db.add(log)
                db.commit()

                failed_count += 1
                logger.warning("Email sender: failed to send email to lead %d (%s)", lead.id, lead.email)

        summary = {
            "status": "success",
            "message": "Email sending process completed",
            "sent": sent_count,
            "failed": failed_count
        }
        logger.info("Email sending task finished for campaign %d: %s", campaign_id, summary)
        return summary

    except Exception as e:
        db.rollback()
        logger.exception("Email sending task fatal error on campaign %d: %s", campaign_id, e)
        return {
            "status": "error",
            "message": str(e)
        }
    finally:
        db.close()


@celery_app.task
def process_reply_detection_task(campaign_id: int) -> dict:
    """
    Background Celery task that checks SENT leads for incoming Gmail replies.
    """
    logger.info("Reply detection task started for campaign %d", campaign_id)
    db = SessionLocal()
    checked_count = 0
    replied_count = 0
    followup_eligible_count = 0

    try:
        leads = db.query(Lead).filter(
            Lead.campaign_id == campaign_id,
            Lead.status == LeadStatus.SENT
        ).all()

        if not leads:
            logger.info("Reply detection task: no SENT leads found for campaign %d", campaign_id)
            return {
                "status": "success",
                "message": "No SENT leads to check for replies",
                "checked": 0,
                "replied": 0,
                "followup_eligible": 0
            }

        for lead in leads:
            checked_count += 1

            log = db.query(EmailLog).filter(
                EmailLog.lead_id == lead.id,
                EmailLog.gmail_thread_id.isnot(None)
            ).order_by(EmailLog.id.desc()).first()

            if not log or not log.gmail_thread_id:
                continue

            has_reply = check_thread_for_reply(log.gmail_thread_id)

            if has_reply:
                lead.status = LeadStatus.REPLIED
                db.commit()
                replied_count += 1
                logger.info("Reply monitor: lead %d (%s) REPLIED!", lead.id, lead.email)
            else:
                if log.sent_at:
                    now = datetime.utcnow()
                    if (now - log.sent_at) > timedelta(days=3):
                        followup_eligible_count += 1
                        logger.info("Reply monitor: lead %d (%s) eligible for follow-up (>3 days)", lead.id, lead.email)

        summary = {
            "status": "success",
            "message": "Reply detection completed",
            "checked": checked_count,
            "replied": replied_count,
            "followup_eligible": followup_eligible_count
        }
        logger.info("Reply detection task finished for campaign %d: %s", campaign_id, summary)
        return summary

    except Exception as e:
        db.rollback()
        logger.exception("Reply detection task fatal error on campaign %d: %s", campaign_id, e)
        return {
            "status": "error",
            "message": str(e)
        }
    finally:
        db.close()

import logging
from sqlalchemy.orm import Session

from config import AUTO_APPROVE_CONFIDENCE_THRESHOLD
from models.lead import Lead, LeadStatus
from models.lead_research import LeadResearch
from models.email_draft import EmailDraft
from services.groq_service import generate_cold_email

logger = logging.getLogger(__name__)


def write_email_for_lead(lead: Lead, db: Session) -> tuple[bool, str]:
    """
    Generates a personalized cold email for a qualified lead idempotently.

    1. Load LeadResearch for lead
    2. Call Groq API to generate email subject + body
    3. Save or update draft in email_drafts table
    4. Set lead status based on confidence score:
       - confidence_score >= AUTO_APPROVE_CONFIDENCE_THRESHOLD -> EMAIL_GENERATED
       - confidence_score < AUTO_APPROVE_CONFIDENCE_THRESHOLD  -> WAITING_APPROVAL

    Returns (success: bool, reason: str).
    """
    research = db.query(LeadResearch).filter(
        LeadResearch.lead_id == lead.id
    ).first()

    if not research:
        logger.warning("Email writer: no research found for lead %d (%s)", lead.id, lead.company_name)
        return False, "no_research"

    # Check if an email draft already exists (Idempotency check)
    existing_draft = db.query(EmailDraft).filter(EmailDraft.lead_id == lead.id).first()
    if existing_draft and existing_draft.status == "sent":
        logger.info("Email writer: draft for lead %d (%s) is already sent; skipping", lead.id, lead.company_name)
        return True, "already_sent"

    pain_points_list = []
    if research.pain_points and isinstance(research.pain_points, dict):
        pain_points_list = research.pain_points.get("possible_pain_points", [])

    technologies_list = research.technologies if research.technologies else []

    # Call Groq API to generate cold email copy
    email_data = generate_cold_email(
        company_name=lead.company_name,
        company_summary=research.company_summary or "",
        pain_points=pain_points_list,
        technologies=technologies_list
    )

    if not email_data:
        logger.error("Email writer: Groq API generation failed for lead %d (%s)", lead.id, lead.company_name)
        return False, "api_failure"

    # Save or update EmailDraft row
    if existing_draft:
        existing_draft.subject = email_data.get("subject", "")
        existing_draft.body = email_data.get("body", "")
        # Only reset status to pending if it wasn't approved yet
        if existing_draft.status != "approved":
            existing_draft.status = "pending"
        logger.info("Email writer: updated existing draft for lead %d (%s)", lead.id, lead.company_name)
    else:
        new_draft = EmailDraft(
            lead_id=lead.id,
            subject=email_data.get("subject", ""),
            body=email_data.get("body", ""),
            status="pending"
        )
        db.add(new_draft)
        logger.info("Email writer: created new draft for lead %d (%s)", lead.id, lead.company_name)

    # Set lead status based on confidence score threshold
    confidence = research.confidence_score or 0
    if confidence >= AUTO_APPROVE_CONFIDENCE_THRESHOLD:
        lead.status = LeadStatus.EMAIL_GENERATED
    else:
        lead.status = LeadStatus.WAITING_APPROVAL

    db.commit()
    logger.info(
        "Email writer: completed draft for lead %d (%s) [confidence=%d, status=%s]",
        lead.id,
        lead.company_name,
        confidence,
        lead.status.value
    )
    return True, "success"

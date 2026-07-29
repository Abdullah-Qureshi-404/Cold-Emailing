from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func as sql_func
import os

from database import get_db
from models.lead import Lead, LeadStatus
from models.lead_research import LeadResearch
from models.email_draft import EmailDraft
from tasks.lead_tasks import scrape_google_maps_task, import_free_outbound_task
from tasks.email_tasks import process_email_discovery_task
from tasks.research_tasks import process_lead_research_task
from tasks.qualification_tasks import process_qualification_task, process_email_writing_task
from tasks.email_sender_tasks import process_email_sending_task, process_reply_detection_task
from tasks.followup_tasks import process_followup_task, process_mark_cold_task

router = APIRouter()


@router.post("/scrape/{campaign_id}")
def scrape_leads(
    campaign_id: int,
    query: str = "software company",
    location: str = "New York"
):
    """
    Triggers Google Maps scraping as an asynchronous background Celery task.
    Returns immediately with task details.
    """
    # Dispatch scraping job to Celery task queue
    task = scrape_google_maps_task.delay(
        query=query,
        location=location,
        campaign_id=campaign_id
    )

    return {
        "message": "Google Maps scraping background task initiated",
        "task_id": task.id,
        "campaign_id": campaign_id,
        "status": "queued"
    }


@router.post("/import-free-outbound/{campaign_id}")
def import_free_outbound_csv(
    campaign_id: int,
    file_path: str = None
):
    """
    Triggers Free Outbound Agent CSV lead import as an asynchronous background Celery task.
    Returns immediately with task details.
    """
    target_path = file_path or os.path.abspath("../free_outbound_agent/leads.csv")

    if not os.path.exists(target_path):
        raise HTTPException(status_code=404, detail=f"CSV file not found at {target_path}")

    # Dispatch import job to Celery task queue
    task = import_free_outbound_task.delay(
        file_path=target_path,
        campaign_id=campaign_id
    )

    return {
        "message": "Free Outbound leads import background task initiated",
        "task_id": task.id,
        "campaign_id": campaign_id,
        "status": "queued"
    }


@router.post("/find-emails/{campaign_id}")
def find_emails_for_campaign(
    campaign_id: int
):
    """
    Triggers email discovery and domain verification background Celery task
    for all leads in the specified campaign that currently have status FOUND.
    """
    task = process_email_discovery_task.delay(campaign_id=campaign_id)

    return {
        "message": "Email discovery and verification background task initiated",
        "task_id": task.id,
        "campaign_id": campaign_id,
        "status": "queued"
    }


@router.post("/research/{campaign_id}")
def research_leads_for_campaign(
    campaign_id: int
):
    """
    Triggers AI research background Celery task for all leads
    in the specified campaign that currently have status EMAIL_FOUND.
    Scrapes company websites, sends content to Groq LLM,
    and stores structured research in the LeadResearch table.
    """
    task = process_lead_research_task.delay(campaign_id=campaign_id)

    return {
        "message": "Research task queued",
        "task_id": task.id,
        "campaign_id": campaign_id,
        "status": "queued"
    }


@router.get("/{campaign_id}/research-status")
def get_research_status(
    campaign_id: int,
    db: Session = Depends(get_db)
):
    """
    Returns research progress and quality metrics for a campaign.
    Queries lead_research table joined with leads to compute
    total leads, completed count, insufficient count, and average confidence.
    """
    # Total leads in this campaign
    total_leads = db.query(Lead).filter(
        Lead.campaign_id == campaign_id
    ).count()

    # Count of research rows with status "completed"
    researched = db.query(LeadResearch).join(Lead).filter(
        Lead.campaign_id == campaign_id,
        LeadResearch.research_status == "completed"
    ).count()

    # Count of research rows with status "insufficient_data"
    insufficient = db.query(LeadResearch).join(Lead).filter(
        Lead.campaign_id == campaign_id,
        LeadResearch.research_status == "insufficient_data"
    ).count()

    # Average confidence score where research_status = "completed"
    avg_result = db.query(
        sql_func.avg(LeadResearch.confidence_score)
    ).join(Lead).filter(
        Lead.campaign_id == campaign_id,
        LeadResearch.research_status == "completed"
    ).scalar()

    average_confidence = round(float(avg_result), 1) if avg_result is not None else 0.0

    return {
        "total_leads": total_leads,
        "researched": researched,
        "insufficient": insufficient,
        "average_confidence": average_confidence
    }


@router.post("/qualify/{campaign_id}")
def qualify_leads_for_campaign(
    campaign_id: int
):
    """
    Triggers qualification background Celery task for all leads
    in the specified campaign that currently have status RESEARCH_COMPLETE.
    """
    task = process_qualification_task.delay(campaign_id=campaign_id)

    return {
        "message": "Qualification task queued",
        "task_id": task.id,
        "campaign_id": campaign_id,
        "status": "queued"
    }


@router.post("/write-emails/{campaign_id}")
def write_emails_for_campaign(
    campaign_id: int
):
    """
    Triggers email writing background Celery task for all leads
    in the specified campaign that currently have status QUALIFIED.
    """
    task = process_email_writing_task.delay(campaign_id=campaign_id)

    return {
        "message": "Email writing task queued",
        "task_id": task.id,
        "campaign_id": campaign_id,
        "status": "queued"
    }


@router.get("/{campaign_id}/email-drafts")
def get_email_drafts(
    campaign_id: int,
    db: Session = Depends(get_db)
):
    """
    Returns all email drafts for leads in the specified campaign.
    """
    drafts = db.query(EmailDraft).join(Lead).filter(
        Lead.campaign_id == campaign_id
    ).all()

    return [
        {
            "lead_id": draft.lead_id,
            "company_name": draft.lead.company_name,
            "subject": draft.subject,
            "body": draft.body,
            "status": draft.status
        }
        for draft in drafts
    ]


@router.post("/send-emails/{campaign_id}")
def send_emails_for_campaign(
    campaign_id: int
):
    """
    Triggers email sending background Celery task for all eligible leads in campaign.
    """
    task = process_email_sending_task.delay(campaign_id=campaign_id)

    return {
        "message": "Email sending task queued",
        "task_id": task.id,
        "campaign_id": campaign_id,
        "status": "queued"
    }


@router.post("/check-replies/{campaign_id}")
def check_replies_for_campaign(
    campaign_id: int
):
    """
    Triggers reply detection background Celery task for all SENT leads in campaign.
    """
    task = process_reply_detection_task.delay(campaign_id=campaign_id)

    return {
        "message": "Reply detection task queued",
        "task_id": task.id,
        "campaign_id": campaign_id,
        "status": "queued"
    }


@router.patch("/approve-email/{lead_id}")
def approve_email_draft(
    lead_id: int,
    db: Session = Depends(get_db)
):
    """
    Approves the generated email draft for a lead and advances lead status
    from WAITING_APPROVAL to EMAIL_GENERATED if applicable.
    """
    draft = db.query(EmailDraft).filter(EmailDraft.lead_id == lead_id).first()

    if not draft:
        raise HTTPException(status_code=404, detail="Email draft not found for lead")

    draft.status = "approved"

    # If lead is in WAITING_APPROVAL status, advance lead status to EMAIL_GENERATED
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if lead and lead.status == LeadStatus.WAITING_APPROVAL:
        lead.status = LeadStatus.EMAIL_GENERATED

    db.commit()

    status_str = lead.status.value if (lead and hasattr(lead.status, "value")) else (str(lead.status) if lead else None)

    return {
        "message": "Email draft approved successfully",
        "lead_id": lead_id,
        "draft_id": draft.id,
        "status": "approved",
        "lead_status": status_str
    }




@router.post("/send-followups/{campaign_id}")
def send_followups_for_campaign(
    campaign_id: int
):
    """
    Triggers follow-up email sending background Celery task for eligible leads in campaign.
    """
    task = process_followup_task.delay(campaign_id=campaign_id)

    return {
        "message": "Follow-up task queued",
        "task_id": task.id,
        "campaign_id": campaign_id,
        "status": "queued"
    }


@router.post("/mark-cold/{campaign_id}")
def mark_cold_for_campaign(
    campaign_id: int
):
    """
    Triggers mark cold background Celery task for unresponsive leads in campaign.
    """
    task = process_mark_cold_task.delay(campaign_id=campaign_id)

    return {
        "message": "Mark cold task queued",
        "task_id": task.id,
        "campaign_id": campaign_id,
        "status": "queued"
    }
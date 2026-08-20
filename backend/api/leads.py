from pathlib import Path

from fastapi import APIRouter, HTTPException, Depends, Response
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func as sql_func
from datetime import datetime

from database import get_db
from models.lead import Lead, LeadStatus
from models.lead_research import LeadResearch
from models.email_draft import EmailDraft
from models.email_log import EmailLog
from services.lead_scoring import score_lead
from services.email_quality import check_email_quality_deterministic
from services.groq_service import check_email_quality_ai
from tasks.lead_tasks import scrape_google_maps_task, import_free_outbound_task, scrape_hackernews_task
from tasks.email_tasks import process_email_discovery_task
from tasks.research_tasks import process_lead_research_task
from tasks.qualification_tasks import process_qualification_task, process_email_writing_task
from tasks.email_sender_tasks import process_email_sending_task, process_reply_detection_task
from tasks.followup_tasks import process_followup_task, process_mark_cold_task
from schemas.task import TaskDispatchResponse
from schemas.lead import (
    EmailDraftRead,
    DraftUpdate,
    DraftUpdateResponse,
    ResearchStatusRead,
    ResetCacheResponse,
    ApproveDraftResponse,
    LeadListItem,
    BulkLeadIds,
)

router = APIRouter()


def _source_url(lead: Lead) -> str | None:
    """
    Link back to the original post/listing/profile a lead was found on —
    critical when there's no company website (e.g. a Hacker News post),
    since it's the only way to actually go look at what they said.
    """
    raw = lead.raw_data or {}
    if not isinstance(raw, dict):
        return None
    return raw.get("hn_url") or raw.get("link") or raw.get("profile") or None


QUALIFIED_OR_LATER = [
    LeadStatus.QUALIFIED, LeadStatus.EMAIL_GENERATED, LeadStatus.WAITING_APPROVAL,
    LeadStatus.QUEUED, LeadStatus.SENT, LeadStatus.FOLLOWUP_1, LeadStatus.FOLLOWUP_2,
    LeadStatus.REPLIED, LeadStatus.COLD,
]
DRAFTED_OR_LATER = [
    LeadStatus.EMAIL_GENERATED, LeadStatus.WAITING_APPROVAL, LeadStatus.QUEUED,
    LeadStatus.SENT, LeadStatus.FOLLOWUP_1, LeadStatus.FOLLOWUP_2, LeadStatus.REPLIED,
    LeadStatus.COLD,
]


@router.get("/{campaign_id}/list", response_model=list[LeadListItem])
def list_leads(
    campaign_id: int,
    response: Response,
    stage: str | None = None,
    search: str | None = None,
    source: str | None = None,
    page: int = 1,
    page_size: int = 50,
    db: Session = Depends(get_db)
):
    """
    Raw lead rows for a campaign (newest first). `stage` filters BEFORE the
    limit is applied (unlike client-side filtering of a fixed-size page),
    so e.g. "researched" correctly returns leads that were researched
    earlier and have since moved on to qualification, not just whichever
    leads happen to be newest.

    stage values: email_found, no_email, researched, qualified,
    disqualified, drafted, needs_follow_up (no_email + disqualified).

    Paginated via `page`/`page_size`; total matching count (before paging)
    is returned in the `X-Total-Count` response header.
    """
    query = db.query(Lead).options(joinedload(Lead.research)).filter(Lead.campaign_id == campaign_id)

    if stage == "email_found":
        query = query.filter(Lead.email.isnot(None))
    elif stage == "no_email":
        query = query.filter(Lead.status == LeadStatus.EMAIL_NOT_FOUND)
    elif stage == "researched":
        query = query.join(LeadResearch, LeadResearch.lead_id == Lead.id)
    elif stage == "qualified":
        query = query.filter(Lead.status.in_(QUALIFIED_OR_LATER))
    elif stage == "disqualified":
        query = query.filter(Lead.status == LeadStatus.DISQUALIFIED)
    elif stage in ["drafted", "email_generated"]:
        query = query.filter(Lead.status.in_(DRAFTED_OR_LATER))
    elif stage == "needs_follow_up":
        query = query.filter(
            (Lead.status == LeadStatus.EMAIL_NOT_FOUND) | (Lead.status == LeadStatus.DISQUALIFIED)
        )

    if search:
        query = query.filter(Lead.company_name.ilike(f"%{search}%"))
    if source:
        query = query.filter(Lead.source.ilike(f"%{source}%"))

    total = query.order_by(None).count()
    response.headers["X-Total-Count"] = str(total)

    page = max(1, page)
    page_size = max(1, min(page_size, 200))
    leads = (
        query.order_by(Lead.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    items = []
    for l in leads:
        lead_score, score_reasons = score_lead(l.research)
        items.append(LeadListItem(
            id=l.id,
            company_name=l.company_name,
            contact_name=l.contact_name,
            website=l.website,
            email=l.email,
            source=l.source,
            source_url=_source_url(l),
            status=l.status.value if hasattr(l.status, "value") else str(l.status),
            website_issues=l.research.website_issues if l.research else None,
            icp_fit_score=l.research.icp_fit_score if l.research else None,
            company_summary=l.research.company_summary if l.research else None,
            qualification_reason=l.qualification_reason,
            lead_score=lead_score if l.research else None,
            score_reasons=score_reasons if l.research else None,
        ))
    return items

from lead_sources.free_outbound import resolve_free_outbound_csv_path


@router.post("/scrape/{campaign_id}", response_model=TaskDispatchResponse)
def scrape_leads(
    campaign_id: int,
    query: str = "software company",
    location: str = "New York",
    db: Session = Depends(get_db)
):
    """
    Triggers Google Maps scraping as an asynchronous background Celery task.
    Skips task queue if leads have already been imported today for this campaign.
    """
    start_of_today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    existing_today_count = db.query(Lead).filter(
        Lead.campaign_id == campaign_id,
        Lead.source == "google_maps",
        Lead.created_at >= start_of_today
    ).count()

    if existing_today_count > 0:
        return {
            "status": "skipped",
            "message": "Leads already scraped today.",
            "total_saved": existing_today_count,
            "task_id": None,
            "campaign_id": campaign_id
        }

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


@router.post("/import-free-outbound/{campaign_id}", response_model=TaskDispatchResponse)
def import_free_outbound_csv(
    campaign_id: int,
    file_path: str = None,
    db: Session = Depends(get_db)
):
    """
    Triggers Free Outbound Agent CSV lead import as an asynchronous background Celery task.
    Skips task queue if leads have already been imported today for this campaign.
    """
    start_of_today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    existing_today_count = db.query(Lead).filter(
        Lead.campaign_id == campaign_id,
        Lead.source.like("free_outbound%"),
        Lead.created_at >= start_of_today
    ).count()

    if existing_today_count > 0:
        return {
            "status": "skipped",
            "message": "Leads already scraped today.",
            "total_saved": existing_today_count,
            "task_id": None,
            "campaign_id": campaign_id
        }

    target_path = resolve_free_outbound_csv_path(file_path)

    if not target_path or not target_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Pre-collected leads CSV file not found (path: {file_path or 'packaged dataset'})."
        )

    # Dispatch import job to Celery task queue
    task = import_free_outbound_task.delay(
        file_path=str(target_path),
        campaign_id=campaign_id
    )

    return {
        "message": "Free Outbound leads import background task initiated",
        "task_id": task.id,
        "campaign_id": campaign_id,
        "status": "queued"
    }


@router.post("/scrape-hackernews/{campaign_id}", response_model=TaskDispatchResponse)
def scrape_hackernews_leads(
    campaign_id: int,
    query: str = "",
    db: Session = Depends(get_db)
):
    """
    Triggers a Hacker News intent-based lead search (people publicly asking
    for developer/freelance help) as a background Celery task.
    """
    start_of_today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    existing_today_count = db.query(Lead).filter(
        Lead.campaign_id == campaign_id,
        Lead.source == "hackernews",
        Lead.created_at >= start_of_today
    ).count()

    if existing_today_count > 0:
        return {
            "status": "skipped",
            "message": "Hacker News already scraped today.",
            "total_saved": existing_today_count,
            "task_id": None,
            "campaign_id": campaign_id
        }

    task = scrape_hackernews_task.delay(query=query, campaign_id=campaign_id)

    return {
        "message": "Hacker News scraping background task initiated",
        "task_id": task.id,
        "campaign_id": campaign_id,
        "status": "queued"
    }


@router.delete("/reset-daily-cache/{campaign_id}", response_model=ResetCacheResponse)
def reset_daily_cache(
    campaign_id: int,
    db: Session = Depends(get_db)
):
    """
    Deletes only today's imported leads for a campaign and returns count of removed leads.
    """
    start_of_today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

    today_leads = db.query(Lead).filter(
        Lead.campaign_id == campaign_id,
        Lead.created_at >= start_of_today
    ).all()

    lead_ids = [lead.id for lead in today_leads]

    if lead_ids:
        db.query(EmailLog).filter(EmailLog.lead_id.in_(lead_ids)).delete(synchronize_session=False)
        db.query(EmailDraft).filter(EmailDraft.lead_id.in_(lead_ids)).delete(synchronize_session=False)
        db.query(LeadResearch).filter(LeadResearch.lead_id.in_(lead_ids)).delete(synchronize_session=False)
        deleted_count = db.query(Lead).filter(Lead.id.in_(lead_ids)).delete(synchronize_session=False)
        db.commit()
    else:
        deleted_count = 0

    return {
        "deleted": deleted_count,
        "message": "Today's cached leads removed."
    }



@router.post("/find-emails/{campaign_id}", response_model=TaskDispatchResponse)
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


@router.post("/research/{campaign_id}", response_model=TaskDispatchResponse)
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


@router.get("/{campaign_id}/research-status", response_model=ResearchStatusRead)
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


@router.post("/qualify/{campaign_id}", response_model=TaskDispatchResponse)
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


@router.post("/write-emails/{campaign_id}", response_model=TaskDispatchResponse)
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


@router.get("/{campaign_id}/email-drafts", response_model=list[EmailDraftRead])
def get_email_drafts(
    campaign_id: int,
    db: Session = Depends(get_db)
):
    """
    Returns all email drafts for leads in the specified campaign.
    """
    drafts = db.query(EmailDraft).join(Lead).options(
        joinedload(EmailDraft.lead).joinedload(Lead.research)
    ).filter(
        Lead.campaign_id == campaign_id
    ).order_by(EmailDraft.created_at.desc()).all()

    result = []
    for draft in drafts:
        research = draft.lead.research
        pain_points = None
        if research and research.pain_points and isinstance(research.pain_points, dict):
            pain_points = research.pain_points.get("possible_pain_points")
        lead_score, score_reasons = score_lead(research)
        result.append({
            "lead_id": draft.lead_id,
            "company_name": draft.lead.company_name,
            "website": draft.lead.website,
            "subject": draft.subject,
            "body": draft.body,
            "status": draft.status,
            "company_summary": research.company_summary if research else None,
            "pain_points": pain_points,
            "website_issues": research.website_issues if research else None,
            "icp_fit_score": research.icp_fit_score if research else None,
            "lead_score": lead_score if research else None,
            "score_reasons": score_reasons if research else None,
        })
    return result


@router.patch("/draft/{lead_id}", response_model=DraftUpdateResponse)
def update_email_draft(
    lead_id: int,
    data: DraftUpdate,
    db: Session = Depends(get_db)
):
    """
    Persists user edits to a draft's subject/body. Separate from approval:
    editing does not change the draft's approval status.
    """
    draft = db.query(EmailDraft).filter(EmailDraft.lead_id == lead_id).first()

    if not draft:
        raise HTTPException(status_code=404, detail="Email draft not found for lead")

    draft.subject = data.subject
    draft.body = data.body
    db.commit()
    db.refresh(draft)

    return {
        "message": "Email draft updated successfully",
        "lead_id": lead_id,
        "draft_id": draft.id,
        "subject": draft.subject,
        "body": draft.body
    }


@router.post("/draft/{lead_id}/check-quality")
def check_draft_quality(lead_id: int, ai_review: bool = False, db: Session = Depends(get_db)):
    """
    Runs free, deterministic quality checks (spam words, length, greeting,
    CTA, personalization heuristic) on demand. Pass ?ai_review=true to also
    run a deeper Groq-backed review — that part costs a real LLM call, so
    it's opt-in per click, never automatic.
    """
    draft = db.query(EmailDraft).filter(EmailDraft.lead_id == lead_id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Email draft not found for lead")

    result = check_email_quality_deterministic(draft.subject or "", draft.body or "")
    result["ai_review"] = None

    if ai_review:
        ai_result = check_email_quality_ai(draft.subject or "", draft.body or "")
        if ai_result:
            result["ai_review"] = ai_result

    return result


@router.post("/send-emails/{campaign_id}", response_model=TaskDispatchResponse)
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


@router.post("/check-replies/{campaign_id}", response_model=TaskDispatchResponse)
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


@router.patch("/approve-email/{lead_id}", response_model=ApproveDraftResponse)
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




@router.patch("/bulk-approve")
def bulk_approve_drafts(payload: BulkLeadIds, db: Session = Depends(get_db)):
    """Approves multiple drafts in one call instead of one request per lead."""
    approved = 0
    for lead_id in payload.lead_ids:
        draft = db.query(EmailDraft).filter(EmailDraft.lead_id == lead_id).first()
        if not draft:
            continue
        draft.status = "approved"
        lead = db.query(Lead).filter(Lead.id == lead_id).first()
        if lead and lead.status == LeadStatus.WAITING_APPROVAL:
            lead.status = LeadStatus.EMAIL_GENERATED
        approved += 1
    db.commit()
    return {"message": f"{approved} draft(s) approved", "approved": approved}


@router.patch("/bulk-reject")
def bulk_reject_drafts(payload: BulkLeadIds, db: Session = Depends(get_db)):
    """Rejects multiple drafts — they're excluded from sending, not deleted."""
    rejected = 0
    for lead_id in payload.lead_ids:
        draft = db.query(EmailDraft).filter(EmailDraft.lead_id == lead_id).first()
        if not draft:
            continue
        draft.status = "rejected"
        rejected += 1
    db.commit()
    return {"message": f"{rejected} draft(s) rejected", "rejected": rejected}


@router.post("/send-followups/{campaign_id}", response_model=TaskDispatchResponse)
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


@router.post("/mark-cold/{campaign_id}", response_model=TaskDispatchResponse)
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
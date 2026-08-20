from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func as sql_func
from database import get_db
from models.campaign import Campaign, CampaignStatus
from models.lead import Lead, LeadStatus
from models.email_draft import EmailDraft
from models.email_log import EmailLog
from models.lead_research import LeadResearch
from pydantic import BaseModel
from schemas.campaign import (
    CampaignRead, CampaignActionResponse, DashboardMetrics, LeadsSummary,
    PipelineProgress, CampaignPlanRequest, CampaignPlan,
    CampaignProcessingStatus, CampaignProcessingProgress,
)
from services.groq_service import generate_campaign_plan

router = APIRouter()


@router.post("/plan", response_model=CampaignPlan)
def plan_campaign(payload: CampaignPlanRequest):
    """
    Turns a one-line description ("Find dentists in Texas with fewer than
    20 employees") into a structured campaign plan. Returns a SUGGESTION
    only — does not create a campaign. The user reviews/edits the result
    and still submits it through the normal POST / below.
    """
    plan = generate_campaign_plan(payload.prompt)
    if not plan:
        raise HTTPException(status_code=502, detail="Couldn't generate a plan from that description. Try rephrasing or being more specific.")
    return plan


class CampaignCreate(BaseModel):
    name: str
    niche: str
    target_location: str
    service_description: str
    target_customer: str
    daily_limit: int = 50


@router.post("/", response_model=CampaignRead)
def create_campaign(data: CampaignCreate, db: Session = Depends(get_db)):
    campaign = Campaign(
        user_id="temp_user",  # Will be replaced with Clerk user ID later
        name=data.name,
        niche=data.niche,
        target_location=data.target_location,
        service_description=data.service_description,
        target_customer=data.target_customer,
        daily_limit=data.daily_limit
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return CampaignRead.from_orm_campaign(campaign)


@router.get("/", response_model=list[CampaignRead])
def get_campaigns(db: Session = Depends(get_db)):
    campaigns = db.query(Campaign).all()
    return [CampaignRead.from_orm_campaign(c) for c in campaigns]


@router.patch("/{id}/start", response_model=CampaignActionResponse)
def start_campaign(id: int, db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    campaign.status = CampaignStatus.active
    db.commit()
    return {"message": "Campaign started"}


@router.patch("/{id}/pause", response_model=CampaignActionResponse)
def pause_campaign(id: int, db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    campaign.status = CampaignStatus.paused
    db.commit()
    return {"message": "Campaign paused"}


@router.patch("/{id}/stop", response_model=CampaignActionResponse)
def stop_campaign(id: int, db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    campaign.status = CampaignStatus.stopped
    db.commit()
    return {"message": "Campaign stopped"}


@router.get("/{campaign_id}/dashboard", response_model=DashboardMetrics)
def get_campaign_dashboard(campaign_id: int, db: Session = Depends(get_db)):
    """
    Returns high-level dashboard metrics for a campaign.
    """
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    total_leads = db.query(Lead).filter(Lead.campaign_id == campaign_id).count()

    # Derive emails_sent / followups_sent from actual EmailLog send events rather
    # than current lead status, so a lead moving on to REPLIED/COLD after a
    # followup doesn't make either counter shrink or double-count the other.
    sent_log_counts = (
        db.query(EmailLog.lead_id, sql_func.count(EmailLog.id).label("sent_count"))
        .join(Lead, EmailLog.lead_id == Lead.id)
        .filter(Lead.campaign_id == campaign_id, EmailLog.status == "sent")
        .group_by(EmailLog.lead_id)
        .all()
    )
    emails_sent = len(sent_log_counts)
    followups_sent = sum(1 for _, sent_count in sent_log_counts if sent_count > 1)

    replies = db.query(Lead).filter(
        Lead.campaign_id == campaign_id,
        Lead.status == LeadStatus.REPLIED
    ).count()

    reply_rate = round((replies / emails_sent * 100), 1) if emails_sent > 0 else 0.0

    qualified_leads = db.query(Lead).filter(
        Lead.campaign_id == campaign_id,
        Lead.status == LeadStatus.QUALIFIED
    ).count()

    disqualified_leads = db.query(Lead).filter(
        Lead.campaign_id == campaign_id,
        Lead.status == LeadStatus.DISQUALIFIED
    ).count()

    cold_leads = db.query(Lead).filter(
        Lead.campaign_id == campaign_id,
        Lead.status == LeadStatus.COLD
    ).count()

    # Cumulative count of drafts ever generated for this campaign — unlike a
    # snapshot of leads currently sitting in EMAIL_GENERATED, this doesn't
    # decrease as leads progress to SENT.
    emails_generated = (
        db.query(EmailDraft)
        .join(Lead, EmailDraft.lead_id == Lead.id)
        .filter(Lead.campaign_id == campaign_id)
        .count()
    )

    waiting_approval = db.query(Lead).filter(
        Lead.campaign_id == campaign_id,
        Lead.status == LeadStatus.WAITING_APPROVAL
    ).count()

    research_complete = db.query(Lead).filter(
        Lead.campaign_id == campaign_id,
        Lead.status == LeadStatus.RESEARCH_COMPLETE
    ).count()

    return {
        "campaign_id": campaign.id,
        "campaign_name": campaign.name,
        "status": campaign.status.value if hasattr(campaign.status, "value") else str(campaign.status),
        "total_leads": total_leads,
        "emails_sent": emails_sent,
        "replies": replies,
        "reply_rate": reply_rate,
        "qualified_leads": qualified_leads,
        "disqualified_leads": disqualified_leads,
        "emails_generated": emails_generated,
        "waiting_approval": waiting_approval,
        "research_complete": research_complete,
        "followups_sent": followups_sent,
        "cold_leads": cold_leads
    }



@router.get("/{campaign_id}/pipeline-progress", response_model=PipelineProgress)
def get_pipeline_progress(campaign_id: int, db: Session = Depends(get_db)):
    """
    Cumulative per-stage counts for the "Process Leads" UI — deliberately
    NOT based on current lead status, since a lead leaves e.g.
    RESEARCH_COMPLETE the moment it's qualified, which would otherwise make
    the "Research done" counter shrink back toward 0 as qualification runs.
    """
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    leads_found = db.query(Lead).filter(Lead.campaign_id == campaign_id).count()

    emails_found = db.query(Lead).filter(
        Lead.campaign_id == campaign_id,
        Lead.email.isnot(None)
    ).count()

    research_done = (
        db.query(LeadResearch)
        .join(Lead, LeadResearch.lead_id == Lead.id)
        .filter(Lead.campaign_id == campaign_id)
        .count()
    )

    qualified_or_later = [
        LeadStatus.QUALIFIED, LeadStatus.EMAIL_GENERATED, LeadStatus.WAITING_APPROVAL,
        LeadStatus.QUEUED, LeadStatus.SENT, LeadStatus.FOLLOWUP_1, LeadStatus.FOLLOWUP_2,
        LeadStatus.REPLIED, LeadStatus.COLD,
    ]
    qualified_done = db.query(Lead).filter(
        Lead.campaign_id == campaign_id,
        Lead.status.in_(qualified_or_later)
    ).count()

    emails_written = (
        db.query(EmailDraft)
        .join(Lead, EmailDraft.lead_id == Lead.id)
        .filter(Lead.campaign_id == campaign_id)
        .count()
    )

    return PipelineProgress(
        leads_found=leads_found,
        emails_found=emails_found,
        research_done=research_done,
        qualified_done=qualified_done,
        emails_written=emails_written,
    )


@router.get("/{campaign_id}/leads-summary", response_model=LeadsSummary)
def get_campaign_leads_summary(campaign_id: int, db: Session = Depends(get_db)):
    """
    Returns breakdown of leads by status for a campaign.
    """
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    leads = db.query(Lead).filter(Lead.campaign_id == campaign_id).all()

    summary = {
        "found": 0,
        "email_searching": 0,
        "email_found": 0,
        "email_not_found": 0,
        "research_pending": 0,
        "research_complete": 0,
        "qualified": 0,
        "disqualified": 0,
        "email_generated": 0,
        "waiting_approval": 0,
        "queued": 0,
        "sent": 0,
        "followup_1": 0,
        "followup_2": 0,
        "replied": 0,
        "cold": 0
    }


    for lead in leads:
        status_key = lead.status.value.lower() if hasattr(lead.status, "value") else str(lead.status).lower()
        if status_key in summary:
            summary[status_key] += 1

    return summary


@router.post("/{campaign_id}/resume-pipeline")
def resume_pipeline(campaign_id: int, db: Session = Depends(get_db)):
    """
    If a campaign's pipeline stalled partway through (worker restart, a task
    died before dispatching the next stage, etc.), this inspects which
    stages currently have eligible leads and re-dispatches all of them —
    each stage only touches its own status bucket, so running several at
    once is safe, and the existing auto-chain (see tasks/*.py) cascades
    onward from there instead of requiring a full restart from scratch.
    """
    from tasks.email_tasks import process_email_discovery_task
    from tasks.research_tasks import process_lead_research_task
    from tasks.qualification_tasks import process_qualification_task, process_email_writing_task

    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    counts = {
        "find_emails": db.query(Lead).filter(Lead.campaign_id == campaign_id, Lead.status == LeadStatus.FOUND).count(),
        "research": db.query(Lead).filter(
            Lead.campaign_id == campaign_id,
            Lead.status.in_([LeadStatus.EMAIL_FOUND, LeadStatus.RESEARCH_PENDING])
        ).count(),
        "qualify": db.query(Lead).filter(Lead.campaign_id == campaign_id, Lead.status == LeadStatus.RESEARCH_COMPLETE).count(),
        "write_emails": db.query(Lead).filter(Lead.campaign_id == campaign_id, Lead.status == LeadStatus.QUALIFIED).count(),
    }

    dispatched = []
    if counts["find_emails"] > 0:
        process_email_discovery_task.delay(campaign_id=campaign_id)
        dispatched.append("find_emails")
    if counts["research"] > 0:
        process_lead_research_task.delay(campaign_id=campaign_id)
        dispatched.append("research")
    if counts["qualify"] > 0:
        process_qualification_task.delay(campaign_id=campaign_id)
        dispatched.append("qualify")
    if counts["write_emails"] > 0:
        process_email_writing_task.delay(campaign_id=campaign_id)
        dispatched.append("write_emails")

    if not dispatched:
        return {"message": "Nothing pending — pipeline is already caught up.", "dispatched": [], "pending_counts": counts}

    return {
        "message": f"Resumed: dispatched {', '.join(dispatched)}.",
        "dispatched": dispatched,
        "pending_counts": counts,
    }


@router.get("/{campaign_id}/processing-status", response_model=CampaignProcessingStatus)
def get_campaign_processing_status(campaign_id: int, db: Session = Depends(get_db)):
    """
    Returns the real-time, deterministic pipeline processing stage of a campaign
    derived directly from persistent PostgreSQL database state.
    """
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    status_str = campaign.status.value if hasattr(campaign.status, "value") else str(campaign.status)
    total_leads = db.query(Lead).filter(Lead.campaign_id == campaign_id).count()

    # Query counts across pipeline stages
    finding_emails_count = db.query(Lead).filter(
        Lead.campaign_id == campaign_id,
        Lead.status.in_([LeadStatus.FOUND, LeadStatus.EMAIL_SEARCHING])
    ).count()

    researching_count = db.query(Lead).filter(
        Lead.campaign_id == campaign_id,
        Lead.status.in_([LeadStatus.EMAIL_FOUND, LeadStatus.RESEARCH_PENDING])
    ).count()

    qualifying_count = db.query(Lead).filter(
        Lead.campaign_id == campaign_id,
        Lead.status == LeadStatus.RESEARCH_COMPLETE,
        Lead.qualification_reason.is_(None)
    ).count()

    # Qualified leads that do not yet have an EmailDraft
    drafted_lead_ids = db.query(EmailDraft.lead_id).filter(
        EmailDraft.lead_id == Lead.id,
        Lead.campaign_id == campaign_id
    )
    generating_emails_count = db.query(Lead).filter(
        Lead.campaign_id == campaign_id,
        Lead.status == LeadStatus.QUALIFIED,
        ~Lead.id.in_(drafted_lead_ids)
    ).count()

    qualified_count = db.query(Lead).filter(
        Lead.campaign_id == campaign_id,
        Lead.status == LeadStatus.QUALIFIED
    ).count()

    email_generated_count = db.query(Lead).filter(
        Lead.campaign_id == campaign_id,
        Lead.status.in_([LeadStatus.EMAIL_GENERATED, LeadStatus.WAITING_APPROVAL])
    ).count()

    disqualified_count = db.query(Lead).filter(
        Lead.campaign_id == campaign_id,
        Lead.status == LeadStatus.DISQUALIFIED
    ).count()

    sent_count = db.query(Lead).filter(
        Lead.campaign_id == campaign_id,
        Lead.status.in_([LeadStatus.SENT, LeadStatus.FOLLOWUP_1, LeadStatus.FOLLOWUP_2, LeadStatus.REPLIED, LeadStatus.COLD])
    ).count()

    email_not_found_count = db.query(Lead).filter(
        Lead.campaign_id == campaign_id,
        Lead.status == LeadStatus.EMAIL_NOT_FOUND
    ).count()

    progress = CampaignProcessingProgress(
        total=total_leads,
        finding_leads=0 if total_leads > 0 else 1,
        finding_emails=finding_emails_count,
        researching=researching_count,
        qualifying=qualifying_count,
        generating_emails=generating_emails_count,
        qualified=qualified_count,
        email_generated=email_generated_count,
        disqualified=disqualified_count,
        sent=sent_count,
        email_not_found=email_not_found_count
    )

    # Determine processing stage deterministically
    if status_str != "active":
        return CampaignProcessingStatus(
            campaign_id=campaign_id,
            campaign_status=status_str,
            processing_stage="idle",
            processing_label="Idle",
            is_processing=False,
            progress=progress
        )

    if total_leads == 0:
        return CampaignProcessingStatus(
            campaign_id=campaign_id,
            campaign_status=status_str,
            processing_stage="finding_leads",
            processing_label="Finding Leads",
            is_processing=True,
            progress=progress
        )

    # Earliest active stage priority
    if finding_emails_count > 0:
        stage = "finding_emails"
        label = "Finding Emails"
        is_proc = True
    elif researching_count > 0:
        stage = "researching_leads"
        label = "Researching Leads"
        is_proc = True
    elif qualifying_count > 0:
        stage = "qualifying_leads"
        label = "Qualifying Leads"
        is_proc = True
    elif generating_emails_count > 0:
        stage = "generating_emails"
        label = "Generating Emails"
        is_proc = True
    else:
        # All leads have reached terminal states
        stage = "finished"
        label = "Finished"
        is_proc = False

    return CampaignProcessingStatus(
        campaign_id=campaign_id,
        campaign_status=status_str,
        processing_stage=stage,
        processing_label=label,
        is_processing=is_proc,
        progress=progress
    )
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.campaign import Campaign, CampaignStatus
from models.lead import Lead, LeadStatus
from pydantic import BaseModel

router = APIRouter()


class CampaignCreate(BaseModel):
    name: str
    niche: str
    target_location: str
    service_description: str
    target_customer: str
    daily_limit: int = 50


@router.post("/")
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
    return campaign


@router.get("/")
def get_campaigns(db: Session = Depends(get_db)):
    return db.query(Campaign).all()


@router.patch("/{id}/start")
def start_campaign(id: int, db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    campaign.status = CampaignStatus.active
    db.commit()
    return {"message": "Campaign started"}


@router.patch("/{id}/pause")
def pause_campaign(id: int, db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    campaign.status = CampaignStatus.paused
    db.commit()
    return {"message": "Campaign paused"}


@router.patch("/{id}/stop")
def stop_campaign(id: int, db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    campaign.status = CampaignStatus.stopped
    db.commit()
    return {"message": "Campaign stopped"}


@router.get("/{campaign_id}/dashboard")
def get_campaign_dashboard(campaign_id: int, db: Session = Depends(get_db)):
    """
    Returns high-level dashboard metrics for a campaign.
    """
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    total_leads = db.query(Lead).filter(Lead.campaign_id == campaign_id).count()

    sent_statuses = [
        LeadStatus.SENT,
        LeadStatus.FOLLOWUP_1,
        LeadStatus.FOLLOWUP_2,
        LeadStatus.REPLIED,
        LeadStatus.COLD
    ]
    emails_sent = db.query(Lead).filter(
        Lead.campaign_id == campaign_id,
        Lead.status.in_(sent_statuses)
    ).count()

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

    followups_sent = db.query(Lead).filter(
        Lead.campaign_id == campaign_id,
        Lead.status.in_([LeadStatus.FOLLOWUP_1, LeadStatus.FOLLOWUP_2])
    ).count()

    cold_leads = db.query(Lead).filter(
        Lead.campaign_id == campaign_id,
        Lead.status == LeadStatus.COLD
    ).count()

    emails_generated = db.query(Lead).filter(
        Lead.campaign_id == campaign_id,
        Lead.status == LeadStatus.EMAIL_GENERATED
    ).count()

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



@router.get("/{campaign_id}/leads-summary")
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
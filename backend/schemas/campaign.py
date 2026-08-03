from datetime import datetime
from pydantic import BaseModel, ConfigDict


class CampaignRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: str
    name: str
    niche: str
    target_location: str
    service_description: str
    target_customer: str
    daily_limit: int
    status: str
    created_at: datetime | None

    @classmethod
    def from_orm_campaign(cls, campaign):
        return cls(
            id=campaign.id,
            user_id=campaign.user_id,
            name=campaign.name,
            niche=campaign.niche,
            target_location=campaign.target_location,
            service_description=campaign.service_description,
            target_customer=campaign.target_customer,
            daily_limit=campaign.daily_limit,
            status=campaign.status.value if hasattr(campaign.status, "value") else str(campaign.status),
            created_at=campaign.created_at,
        )


class CampaignPlanRequest(BaseModel):
    prompt: str


class CampaignPlan(BaseModel):
    campaign_name: str
    industry: str
    location: str
    ideal_customer: str
    pain_points: list[str] = []
    search_queries: list[str] = []
    email_angle: str | None = None
    qualification_rules: list[str] = []


class CampaignActionResponse(BaseModel):
    message: str


class DashboardMetrics(BaseModel):
    campaign_id: int
    campaign_name: str
    status: str
    total_leads: int
    emails_sent: int
    replies: int
    reply_rate: float
    qualified_leads: int
    disqualified_leads: int
    emails_generated: int
    waiting_approval: int
    research_complete: int
    followups_sent: int
    cold_leads: int


class PipelineProgress(BaseModel):
    """
    Cumulative "how many leads have ever completed this stage" counts —
    unlike LeadsSummary's per-status snapshot, these don't shrink as leads
    move on to the next stage (e.g. research_done stays correct even after
    a lead has since been qualified and moved past RESEARCH_COMPLETE).
    """
    leads_found: int
    emails_found: int
    research_done: int
    qualified_done: int
    emails_written: int


class LeadsSummary(BaseModel):
    found: int
    email_searching: int
    email_found: int
    email_not_found: int
    research_pending: int
    research_complete: int
    qualified: int
    disqualified: int
    email_generated: int
    waiting_approval: int
    queued: int
    sent: int
    followup_1: int
    followup_2: int
    replied: int
    cold: int

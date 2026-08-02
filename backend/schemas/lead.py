from pydantic import BaseModel


class LeadListItem(BaseModel):
    id: int
    company_name: str
    contact_name: str | None
    website: str | None
    email: str | None
    source: str | None
    source_url: str | None = None
    status: str
    website_issues: list[str] | None = None
    icp_fit_score: int | None = None
    company_summary: str | None = None
    qualification_reason: str | None = None
    lead_score: int | None = None
    score_reasons: list[str] | None = None


class EmailDraftRead(BaseModel):
    lead_id: int
    company_name: str
    website: str | None
    subject: str | None
    body: str | None
    status: str
    company_summary: str | None = None
    pain_points: list[str] | None = None
    website_issues: list[str] | None = None
    icp_fit_score: int | None = None
    lead_score: int | None = None
    score_reasons: list[str] | None = None


class BulkLeadIds(BaseModel):
    lead_ids: list[int]


class DraftUpdate(BaseModel):
    subject: str
    body: str


class ResearchStatusRead(BaseModel):
    total_leads: int
    researched: int
    insufficient: int
    average_confidence: float


class ResetCacheResponse(BaseModel):
    deleted: int
    message: str


class ApproveDraftResponse(BaseModel):
    message: str
    lead_id: int
    draft_id: int
    status: str
    lead_status: str | None


class DraftUpdateResponse(BaseModel):
    message: str
    lead_id: int
    draft_id: int
    subject: str
    body: str

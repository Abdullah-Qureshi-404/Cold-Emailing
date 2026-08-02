export type CampaignStatus = 'active' | 'paused' | 'stopped';

export interface Campaign {
  id: number;
  user_id: string;
  name: string;
  niche: string;
  target_location: string;
  service_description: string;
  target_customer: string;
  daily_limit: number;
  status: CampaignStatus;
  created_at: string;
}

export interface CampaignCreatePayload {
  name: string;
  niche: string;
  target_location: string;
  service_description: string;
  target_customer: string;
  daily_limit?: number;
}

export interface CampaignDashboardMetrics {
  campaign_id: number;
  campaign_name: string;
  status: string;
  total_leads: number;
  emails_sent: number;
  replies: number;
  reply_rate: number;
  qualified_leads: number;
  disqualified_leads: number;
  emails_generated: number;
  waiting_approval: number;
  research_complete: number;
  followups_sent: number;
  cold_leads: number;
}

export interface LeadSummaryBreakdown {
  found: number;
  email_searching: number;
  email_found: number;
  email_not_found: number;
  research_pending: number;
  research_complete: number;
  qualified: number;
  disqualified: number;
  email_generated: number;
  waiting_approval: number;
  queued: number;
  sent: number;
  followup_1: number;
  followup_2: number;
  replied: number;
  cold: number;
}

export interface LeadListItem {
  id: number;
  company_name: string;
  contact_name: string | null;
  website: string | null;
  email: string | null;
  source: string | null;
  source_url: string | null;
  status: string;
  website_issues: string[] | null;
  icp_fit_score: number | null;
  company_summary: string | null;
  qualification_reason: string | null;
  lead_score: number | null;
  score_reasons: string[] | null;
}

export interface ResearchStatusMetrics {
  total_leads: number;
  researched: number;
  insufficient: number;
  average_confidence: number;
}

export interface EmailDraft {
  lead_id: number;
  company_name: string;
  website: string | null;
  subject: string | null;
  body: string | null;
  status: string;
  company_summary: string | null;
  pain_points: string[] | null;
  website_issues: string[] | null;
  icp_fit_score: number | null;
  lead_score: number | null;
  score_reasons: string[] | null;
}

export interface DraftQualityCheck {
  quality_score: number;
  spam_risk: 'low' | 'medium' | 'high';
  personalization_score: number;
  cta_strength: 'missing' | 'weak' | 'good' | 'strong';
  issues: string[];
  ai_review: {
    quality_score: number;
    spam_risk: string;
    personalization_score: number;
    cta_strength: string;
    issues: string[];
  } | null;
}

export interface CampaignPlanRequest {
  prompt: string;
}

export interface CampaignPlan {
  campaign_name: string;
  industry: string;
  location: string;
  ideal_customer: string;
  pain_points: string[];
  search_queries: string[];
  email_angle: string | null;
  qualification_rules: string[];
}

export interface PipelineProgress {
  leads_found: number;
  emails_found: number;
  research_done: number;
  qualified_done: number;
  emails_written: number;
}

/**
 * Shape returned by every task-dispatch endpoint (backend schemas/task.py).
 * - status "queued": `task_id` is set and must be polled via /tasks/{id}/status
 * - status "skipped": the daily-dedupe check found today's work already done,
 *   `task_id` is null and `total_saved` holds the existing count.
 */
export interface TaskResponse {
  message: string;
  status: 'queued' | 'skipped';
  task_id: string | null;
  campaign_id: number | null;
  total_saved: number | null;
}

export interface TaskProgress {
  current: number;
  total: number;
  eta_seconds: number | null;
}

export interface TaskStatusResponse {
  task_id: string;
  /** Celery state string: PENDING | STARTED | PROGRESS | SUCCESS | FAILURE | RETRY | ... */
  state: string;
  ready: boolean;
  successful: boolean | null;
  result: unknown;
  error: string | null;
  progress: TaskProgress | null;
}

export interface DraftUpdateResponse {
  message: string;
  lead_id: number;
  draft_id: number;
  subject: string;
  body: string;
}

export interface ApproveDraftResponse {
  message: string;
  lead_id: number;
  draft_id: number;
  status: string;
  lead_status: string | null;
}

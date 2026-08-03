export const QUERY_KEYS = {
  campaigns: ['campaigns'] as const,
  campaignDetails: (id: number) => ['campaigns', id] as const,
  campaignDashboard: (id: number | null) => ['campaign-dashboard', id] as const,
  campaignLeadsSummary: (id: number | null) => ['campaign-summary', id] as const,
  researchStatus: (id: number | null) => ['research-status', id] as const,
  emailDrafts: (id: number | null) => ['email-drafts', id] as const,
  analytics: (id: number | null) => ['analytics', id] as const,
  taskStatus: (taskId: string | null) => ['task-status', taskId] as const,
};

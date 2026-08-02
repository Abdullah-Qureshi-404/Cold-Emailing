import { useUIStore } from '../store/useUIStore';
import { useCampaigns } from '../features/campaigns/hooks/useCampaigns';

/**
 * Returns a campaign id only once it has been confirmed to exist in the live
 * campaigns list, otherwise `null`.
 *
 * `activeCampaignId` is restored synchronously from localStorage, so it can
 * point at a campaign that was deleted server-side. Components that pass the
 * raw value into a query would fire a doomed 404 request; gating here means
 * those queries stay disabled (via their `enabled: !!campaignId`) instead.
 *
 * @param override When provided (e.g. the `:id` route param on the Campaign
 * Workspace), it is validated and used instead of the global active campaign.
 */
export function useValidatedActiveCampaignId(override?: number | null): number | null {
  const activeCampaignId = useUIStore((state) => state.activeCampaignId);
  const { data: campaigns, isSuccess } = useCampaigns();

  const candidate = override ?? activeCampaignId;

  if (!candidate || candidate <= 0) return null;
  if (!isSuccess || !campaigns) return null;

  return campaigns.some((c) => c.id === candidate) ? candidate : null;
}

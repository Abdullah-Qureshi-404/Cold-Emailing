import { useEffect } from 'react';
import { useUIStore } from '../store/useUIStore';
import { useCampaigns } from '../features/campaigns/hooks/useCampaigns';

/**
 * Keeps activeCampaignId in sync with the campaigns list:
 * - Selects the first campaign when none is selected
 * - Clears/reselects when the saved id is missing from the list (stale localStorage)
 */
export function useActiveCampaignSync() {
  const { activeCampaignId, setActiveCampaignId } = useUIStore();
  const { data: campaigns, isSuccess } = useCampaigns();

  useEffect(() => {
    if (!isSuccess || !campaigns) return;

    // Read fresh rather than using the render-time value: this hook runs in
    // AppShell, whose effects fire *after* its children's. The Campaign
    // Workspace sets the active campaign from its route param on mount, and a
    // stale closure here would immediately overwrite that selection.
    const current = useUIStore.getState().activeCampaignId;

    if (campaigns.length === 0) {
      if (current !== null) {
        setActiveCampaignId(null);
      }
      return;
    }

    const exists = current !== null && campaigns.some((c) => c.id === current);
    if (!exists) {
      setActiveCampaignId(campaigns[0].id);
    }
  }, [activeCampaignId, campaigns, isSuccess, setActiveCampaignId]);

  return { activeCampaignId, campaigns };
}

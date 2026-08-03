import React, { useState } from 'react';
import { Search, Upload } from 'lucide-react';
import { LeadMetricsBar } from './LeadMetricsBar';
import { ResearchProgressCard } from './ResearchProgressCard';
import { LeadPipelineOverview } from './LeadPipelineOverview';
import { LeadActionCenter } from './LeadActionCenter';
import { ScrapeLeadsModal } from './ScrapeLeadsModal';
import { DispatchNoticeBanner } from '../../../components/common/DispatchNoticeBanner';
import { useDispatchNotice } from '../../../hooks/useDispatchNotice';
import { useLeadActions } from '../hooks/useLeadActions';

interface LeadWorkspacePanelProps {
  campaignId: number;
}

/**
 * Lead acquisition & pipeline surface for a single campaign.
 * Mounted as the "Leads" tab of the Campaign Workspace — the campaign context
 * comes from the route, so there is no "select a campaign" state to handle.
 */
export const LeadWorkspacePanel: React.FC<LeadWorkspacePanelProps> = ({ campaignId }) => {
  const { scrapeLeads, importFreeOutbound } = useLeadActions(campaignId);
  const { notice, notify } = useDispatchNotice();
  const [isScrapeModalOpen, setIsScrapeModalOpen] = useState(false);

  const handleScrapeSubmit = async (query: string, location: string) => {
    try {
      const response = await scrapeLeads({ query, location });
      notify(
        `Google Maps scrape for "${query}" in "${location}"`,
        `POST /leads/scrape/${campaignId}`,
        response
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Scraping task failed';
      alert(`Scrape task error: ${msg}`);
    }
  };

  const handleImportCSVClick = async () => {
    try {
      const response = await importFreeOutbound();
      notify(
        'Import Free Outbound CSV',
        `POST /leads/import-free-outbound/${campaignId}`,
        response
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Import failed';
      alert(`Import error: ${msg}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">Lead Intelligence & Pipeline</h2>
          <p className="text-xs text-zinc-400">
            Prospect enrichment, AI research confidence, and 16-stage pipeline progress.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleImportCSVClick}
            className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#141417] px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:border-white/20"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Import CSV</span>
          </button>
          <button
            onClick={() => setIsScrapeModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-purple-500 ai-glow-sm"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Scrape Leads</span>
          </button>
        </div>
      </div>

      <DispatchNoticeBanner notice={notice} />

      <LeadMetricsBar campaignId={campaignId} />
      <ResearchProgressCard campaignId={campaignId} />
      <LeadActionCenter
        campaignId={campaignId}
        onOpenScrapeModal={() => setIsScrapeModalOpen(true)}
        onTriggerTask={notify}
      />
      <LeadPipelineOverview campaignId={campaignId} />

      <ScrapeLeadsModal
        isOpen={isScrapeModalOpen}
        onClose={() => setIsScrapeModalOpen(false)}
        onTriggerScrape={handleScrapeSubmit}
      />
    </div>
  );
};

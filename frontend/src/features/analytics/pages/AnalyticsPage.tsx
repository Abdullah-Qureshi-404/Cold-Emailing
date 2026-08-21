import React from 'react';
import { PageHeader } from '../../../components/common/PageHeader';
import { CampaignTelemetryGrid } from '../components/CampaignTelemetryGrid';
import { PipelineConversionFunnel } from '../components/PipelineConversionFunnel';
import { ResearchQualityCard } from '../components/ResearchQualityCard';
export const AnalyticsPage: React.FC = () => {

  return (
    <div className="space-y-6">
      <PageHeader
        title="Outreach Analytics & Sequence Telemetry"
        description="Campaign analytics and funnel conversion tracking. Run actions from a Campaign Workspace."
      />



      {/* Main Campaign Telemetry KPI Grid */}
      <CampaignTelemetryGrid />

      {/* Recharts Pipeline Funnel */}
      <PipelineConversionFunnel />

      {/* Groq AI Research Quality Stats */}
      <ResearchQualityCard />
    </div>
  );
};

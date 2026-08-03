import React, { useState } from 'react';
import { X, Sparkles, Wand2, Layers, Target, MapPin, FileText } from 'lucide-react';
import { useCreateCampaign } from '../hooks/useCreateCampaign';

interface CreateCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate?: () => void;
}

export const CreateCampaignModal: React.FC<CreateCampaignModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const [name, setName] = useState('');
  const [niche, setNiche] = useState('');
  const [targetLocation, setTargetLocation] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [targetCustomer, setTargetCustomer] = useState('');
  const [dailyLimit, setDailyLimit] = useState(50);

  const createCampaignMutation = useCreateCampaign();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !niche.trim() || !targetLocation.trim()) return;

    try {
      await createCampaignMutation.mutateAsync({
        name,
        niche,
        target_location: targetLocation,
        service_description: serviceDescription || 'Outreach campaign',
        target_customer: targetCustomer || 'Ideal prospects',
        daily_limit: Number(dailyLimit),
      });

      setName('');
      setNiche('');
      setTargetLocation('');
      setServiceDescription('');
      setTargetCustomer('');
      setDailyLimit(50);
      onCreate?.();
      onClose();
    } catch (err) {
      console.error('Failed to create campaign:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg overflow-hidden rounded-xl border border-white/[0.12] bg-[#141417] p-6 shadow-2xl ai-glow">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-400" />
            <h2 className="text-base font-semibold text-zinc-100">Create AI Campaign</h2>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
          <div>
            <label className="block text-zinc-400 font-medium mb-1 flex items-center gap-1">
              <Layers className="h-3.5 w-3.5 text-purple-400" /> Campaign Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. SaaS AI Automation Campaign"
              className="w-full rounded-lg border border-white/[0.12] bg-[#18181c] p-2.5 text-zinc-100 placeholder-zinc-500 focus:border-purple-500/50 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-400 font-medium mb-1 flex items-center gap-1">
                <Target className="h-3.5 w-3.5 text-purple-400" /> Niche / Industry
              </label>
              <input
                type="text"
                required
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                placeholder="e.g. Software Companies"
                className="w-full rounded-lg border border-white/[0.12] bg-[#18181c] p-2.5 text-zinc-100 placeholder-zinc-500 focus:border-purple-500/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-zinc-400 font-medium mb-1 flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-purple-400" /> Target Location
              </label>
              <input
                type="text"
                required
                value={targetLocation}
                onChange={(e) => setTargetLocation(e.target.value)}
                placeholder="e.g. San Francisco, CA"
                className="w-full rounded-lg border border-white/[0.12] bg-[#18181c] p-2.5 text-zinc-100 placeholder-zinc-500 focus:border-purple-500/50 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-zinc-400 font-medium mb-1 flex items-center gap-1">
              <FileText className="h-3.5 w-3.5 text-purple-400" /> Service Description
            </label>
            <input
              type="text"
              required
              value={serviceDescription}
              onChange={(e) => setServiceDescription(e.target.value)}
              placeholder="e.g. AI Agent development and workflow automation"
              className="w-full rounded-lg border border-white/[0.12] bg-[#18181c] p-2.5 text-zinc-100 placeholder-zinc-500 focus:border-purple-500/50 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-zinc-400 font-medium mb-1 flex items-center gap-1">
              <Target className="h-3.5 w-3.5 text-purple-400" /> Target Customer Profile
            </label>
            <input
              type="text"
              required
              value={targetCustomer}
              onChange={(e) => setTargetCustomer(e.target.value)}
              placeholder="e.g. CTOs and Founders at Seed/Series A startups"
              className="w-full rounded-lg border border-white/[0.12] bg-[#18181c] p-2.5 text-zinc-100 placeholder-zinc-500 focus:border-purple-500/50 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-zinc-400 font-medium mb-1">Daily Email Limit</label>
            <input
              type="number"
              min={1}
              max={1000}
              value={dailyLimit}
              onChange={(e) => setDailyLimit(Number(e.target.value))}
              className="w-full rounded-lg border border-white/[0.12] bg-[#18181c] p-2.5 text-zinc-100 focus:border-purple-500/50 focus:outline-none font-mono"
            />
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/[0.08] px-4 py-2 text-zinc-400 hover:text-zinc-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createCampaignMutation.isPending}
              className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 font-semibold text-white hover:bg-purple-500 transition ai-glow-sm"
            >
              <Wand2 className="h-3.5 w-3.5" />
              <span>{createCampaignMutation.isPending ? 'Creating...' : 'Launch with AI'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

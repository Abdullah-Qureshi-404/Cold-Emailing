import React, { useState } from 'react'
import { X, Search, MapPin, Wand2 } from 'lucide-react'

interface ScrapeLeadsModalProps {
  isOpen: boolean
  onClose: () => void
  onTriggerScrape: (query: string, location: string) => void
}

export const ScrapeLeadsModal: React.FC<ScrapeLeadsModalProps> = ({
  isOpen,
  onClose,
  onTriggerScrape,
}) => {
  const [query, setQuery] = useState('software company')
  const [location, setLocation] = useState('New York')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim() || !location.trim()) return
    onTriggerScrape(query, location)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md overflow-hidden rounded-xl border border-white/[0.12] bg-[#141417] p-6 shadow-2xl ai-glow">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-purple-400" />
            <h2 className="text-base font-semibold text-zinc-100">Google Maps Lead Scraper</h2>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          <div>
            <label className="block text-zinc-400 font-medium mb-1 flex items-center gap-1">
              <Search className="h-3.5 w-3.5 text-purple-400" /> Target Industry Keyword
            </label>
            <input
              type="text"
              required
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. software company, fintech startup"
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
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. New York, San Francisco, London"
              className="w-full rounded-lg border border-white/[0.12] bg-[#18181c] p-2.5 text-zinc-100 placeholder-zinc-500 focus:border-purple-500/50 focus:outline-none"
            />
          </div>

          <div className="rounded-lg border border-purple-500/20 bg-purple-950/20 p-3 text-[11px] text-purple-300 font-mono">
            POST /leads/scrape/&#123;campaign_id&#125;
            <br />
            Status: Dispatches async Celery task to scrape Google Maps entries into database (status: FOUND).
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
              className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 font-semibold text-white hover:bg-purple-500 transition ai-glow-sm"
            >
              <Wand2 className="h-3.5 w-3.5" />
              <span>Launch Scraper Task</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

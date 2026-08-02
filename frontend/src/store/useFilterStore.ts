import { create } from 'zustand'

interface FilterState {
  dateRange: '7d' | '30d' | '90d' | 'all'
  setDateRange: (range: '7d' | '30d' | '90d' | 'all') => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  statusFilter: string
  setStatusFilter: (status: string) => void
  resetFilters: () => void
}

export const useFilterStore = create<FilterState>((set) => ({
  dateRange: '30d',
  setDateRange: (range) => set({ dateRange: range }),
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  statusFilter: 'all',
  setStatusFilter: (status) => set({ statusFilter: status }),
  resetFilters: () => set({ dateRange: '30d', searchQuery: '', statusFilter: 'all' }),
}))

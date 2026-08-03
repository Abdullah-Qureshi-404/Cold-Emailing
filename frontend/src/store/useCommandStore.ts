import { create } from 'zustand'

interface CommandState {
  isOpen: boolean
  toggleCommandPalette: () => void
  setOpen: (open: boolean) => void
  query: string
  setQuery: (query: string) => void
}

export const useCommandStore = create<CommandState>((set) => ({
  isOpen: false,
  toggleCommandPalette: () => set((state) => ({ isOpen: !state.isOpen })),
  setOpen: (open) => set({ isOpen: open }),
  query: '',
  setQuery: (query) => set({ query }),
}))

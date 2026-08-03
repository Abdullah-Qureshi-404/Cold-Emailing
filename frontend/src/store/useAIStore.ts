import { create } from 'zustand'

interface AIState {
  isAIDrawerOpen: boolean
  toggleAIDrawer: () => void
  setAIDrawerOpen: (open: boolean) => void
  activePrompt: string
  setActivePrompt: (prompt: string) => void
  isStreaming: boolean
  setIsStreaming: (streaming: boolean) => void
}

export const useAIStore = create<AIState>((set) => ({
  isAIDrawerOpen: false,
  toggleAIDrawer: () => set((state) => ({ isAIDrawerOpen: !state.isAIDrawerOpen })),
  setAIDrawerOpen: (open) => set({ isAIDrawerOpen: open }),
  activePrompt: '',
  setActivePrompt: (prompt) => set({ activePrompt: prompt }),
  isStreaming: false,
  setIsStreaming: (streaming) => set({ isStreaming: streaming }),
}))

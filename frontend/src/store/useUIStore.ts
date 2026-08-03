import { create } from 'zustand';

interface UIState {
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  isMobileMenuOpen: boolean;
  toggleMobileMenu: () => void;
  setMobileMenuOpen: (open: boolean) => void;
  isTaskDrawerOpen: boolean;
  toggleTaskDrawer: () => void;
  setTaskDrawerOpen: (open: boolean) => void;
  activeCampaignId: number | null;
  setActiveCampaignId: (id: number | null) => void;
}

const getInitialCampaignId = (): number | null => {
  const saved = localStorage.getItem('activeCampaignId');
  if (saved) {
    const parsed = parseInt(saved, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return null;
};

export const useUIStore = create<UIState>((set) => ({
  isSidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),
  isMobileMenuOpen: false,
  toggleMobileMenu: () => set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen })),
  setMobileMenuOpen: (open) => set({ isMobileMenuOpen: open }),
  isTaskDrawerOpen: false,
  toggleTaskDrawer: () => set((state) => ({ isTaskDrawerOpen: !state.isTaskDrawerOpen })),
  setTaskDrawerOpen: (open) => set({ isTaskDrawerOpen: open }),
  activeCampaignId: getInitialCampaignId(),
  setActiveCampaignId: (id) => {
    if (id) {
      localStorage.setItem('activeCampaignId', id.toString());
    } else {
      localStorage.removeItem('activeCampaignId');
    }
    set({ activeCampaignId: id });
  },
}));

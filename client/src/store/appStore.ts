import { create } from 'zustand';

interface AppState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  currentEditionId: string | null;
  setCurrentEdition: (id: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  currentEditionId: null,
  setCurrentEdition: (id) => set({ currentEditionId: id }),
}));

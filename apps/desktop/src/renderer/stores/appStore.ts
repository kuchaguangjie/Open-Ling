import { create } from "zustand";

export type AppPage = "lobby" | "room" | "counselors" | "memory" | "settings";
export type SettingsOriginPage = Exclude<AppPage, "settings">;

interface AppState {
  activePage: AppPage;
  settingsOriginPage: SettingsOriginPage;
  consultationRequest?: { counselorId: string; requestId: string };
  clearConsultationRequest: () => void;
  closeSettings: () => void;
  requestConsultation: (counselorId: string) => void;
  setActivePage: (page: AppPage) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activePage: "lobby",
  settingsOriginPage: "lobby",
  consultationRequest: undefined,
  clearConsultationRequest: () => set({ consultationRequest: undefined }),
  closeSettings: () => set((state) => ({ activePage: state.settingsOriginPage })),
  requestConsultation: (counselorId) =>
    set({
      activePage: "lobby",
      consultationRequest: {
        counselorId,
        requestId: `${Date.now()}-${Math.random().toString(36).slice(2)}`
      }
    }),
  setActivePage: (page) =>
    set((state) => ({
      activePage: page,
      settingsOriginPage:
        page === "settings" && state.activePage !== "settings"
          ? state.activePage
          : state.settingsOriginPage
    }))
}));

export function resetAppStore() {
  useAppStore.setState({ activePage: "lobby", settingsOriginPage: "lobby", consultationRequest: undefined });
}

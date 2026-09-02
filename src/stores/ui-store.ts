import { create } from "zustand";
import type { ThemePreference } from "../types";

interface UiState {
  theme: ThemePreference;
  sidebarOpen: boolean;
  handGuideVisible: boolean;
  soundEnabled: boolean;
  setTheme: (theme: ThemePreference) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleHandGuide: () => void;
  setSoundEnabled: (enabled: boolean) => void;
}

function readStoredTheme(): ThemePreference {
  try {
    const value = localStorage.getItem("onetype:theme");
    if (value === "light" || value === "dark" || value === "system") return value;
  } catch {
    /* ignore */
  }
  return "system";
}

function readStoredSound(): boolean {
  try {
    return localStorage.getItem("onetype:sound") !== "off";
  } catch {
    return true;
  }
}

function applyTheme(theme: ThemePreference) {
  const root = document.documentElement;
  const resolved = theme === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : theme;
  root.dataset.theme = resolved;
  root.classList.toggle("dark", resolved === "dark");
}

export const useUiStore = create<UiState>((set) => ({
  theme: readStoredTheme(),
  sidebarOpen: true,
  handGuideVisible: true,
  soundEnabled: readStoredSound(),
  setTheme: (theme) => {
    localStorage.setItem("onetype:theme", theme);
    applyTheme(theme);
    set({ theme });
  },
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleHandGuide: () => set((state) => ({ handGuideVisible: !state.handGuideVisible })),
  setSoundEnabled: (enabled) => {
    localStorage.setItem("onetype:sound", enabled ? "on" : "off");
    set({ soundEnabled: enabled });
  },
}));

export function initUi() {
  applyTheme(useUiStore.getState().theme);
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (useUiStore.getState().theme === "system") applyTheme("system");
  });
}
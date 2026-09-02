import { create } from "zustand";
import * as backend from "../services/backend";

export const APP_SETTING_KEYS = [
  "app.language",
  "design.theme",
  "practice.sound",
  "practice.handGuide",
  "practice.confirmExit",
  "view.sidebar",
  "teacher.studentCodePrefix",
] as const;

export type AppSettingKey = (typeof APP_SETTING_KEYS)[number];

export const DEFAULT_SETTINGS: Record<AppSettingKey, string> = {
  "app.language": "myanmar",
  "design.theme": "system",
  "practice.sound": "on",
  "practice.handGuide": "on",
  "practice.confirmExit": "on",
  "view.sidebar": "on",
  "teacher.studentCodePrefix": "STU",
};

interface SettingsState {
  values: Record<string, string>;
  loaded: boolean;
  load: () => Promise<void>;
  get: (key: AppSettingKey) => string;
  set: (key: AppSettingKey, value: string) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  values: { ...DEFAULT_SETTINGS },
  loaded: false,
  load: async () => {
    try {
      const all = await backend.allSettings();
      set({ values: { ...DEFAULT_SETTINGS, ...all }, loaded: true });
    } catch {
      set({ values: { ...DEFAULT_SETTINGS }, loaded: true });
    }
  },
  get: (key) => {
    return get().values[key] ?? DEFAULT_SETTINGS[key];
  },
  set: async (key, value) => {
    await backend.setSetting(key, value);
    set((state) => ({ values: { ...state.values, [key]: value } }));
  },
}));
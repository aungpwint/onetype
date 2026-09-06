import { create } from 'zustand'
import * as backend from '@/services/backend'

export const APP_SETTING_KEYS = [
    'app.language',
    'app.autoUpdate',
    'design.theme',
    'practice.sound',
    'practice.handGuide',
    'practice.confirmExit',
    'practice.focusGuard',
    'practice.indicateTypos',
    'practice.quickRestart',
    'practice.soundVolume',
    'practice.timeWarning',
    'practice.highlightMode',
    'practice.blindMode',
    'practice.hideExtraLetters',
    'practice.caretStyle',
    'practice.smoothCaret',
    'practice.paceCaret',
    'practice.timerStyle',
    'view.sidebar',
    'teacher.studentCodePrefix',
    'updater.lastChecked',
    'notification.enabled',
    'notification.notifyUpdates',
    'notification.lastNotifiedVersion',
] as const

export type AppSettingKey = (typeof APP_SETTING_KEYS)[number]

export const DEFAULT_SETTINGS: Record<AppSettingKey, string> = {
    'app.language': 'myanmar',
    'app.autoUpdate': 'on',
    'design.theme': 'system',
    'practice.sound': 'on',
    'practice.handGuide': 'on',
    'practice.confirmExit': 'on',
    'practice.focusGuard': 'pause',
    'practice.indicateTypos': 'below',
    'practice.quickRestart': 'tab',
    'practice.soundVolume': '0.5',
    'practice.timeWarning': 'on',
    'practice.highlightMode': 'word',
    'practice.blindMode': 'off',
    'practice.hideExtraLetters': 'off',
    'practice.caretStyle': 'bar',
    'practice.smoothCaret': 'medium',
    'practice.paceCaret': 'off',
    'practice.timerStyle': 'text',
    'view.sidebar': 'on',
    'teacher.studentCodePrefix': 'STU',
    'updater.lastChecked': '0',
    'notification.enabled': 'on',
    'notification.notifyUpdates': 'on',
    'notification.lastNotifiedVersion': '',
}

interface SettingsState {
    values: Record<string, string>
    loaded: boolean
    load: () => Promise<void>
    get: (key: AppSettingKey) => string
    set: (key: AppSettingKey, value: string) => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
    values: { ...DEFAULT_SETTINGS },
    loaded: false,
    load: async () => {
        try {
            const all = await backend.allSettings()
            set({ values: { ...DEFAULT_SETTINGS, ...all }, loaded: true })
        } catch {
            set({ values: { ...DEFAULT_SETTINGS }, loaded: true })
        }
    },
    get: (key) => {
        return get().values[key] ?? DEFAULT_SETTINGS[key]
    },
    set: async (key, value) => {
        await backend.setSetting(key, value)
        set((state) => ({ values: { ...state.values, [key]: value } }))
    },
}))

import { create } from 'zustand'
import * as backend from '@/services/backend'

export const APP_SETTING_KEYS = [
    'app.language',
    'app.autoUpdate',
    'design.theme',
    'practice.sound',
    'practice.handGuide',
    'practice.showKeyboard',
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
    'practice.unit',
    'practice.time',
    'practice.words',
    'practice.lang',
    'practice.punctuation',
    'practice.numbers',
    'design.themeEffect',
    'view.sidebar',
    'dashboard.dailyGoalMinutes',
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
    'practice.showKeyboard': 'on',
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
    'practice.unit': 'time',
    'practice.time': '30',
    'practice.words': '25',
    'practice.lang': 'english',
    'practice.punctuation': 'off',
    'practice.numbers': 'off',
    'design.themeEffect': 'none',
    'view.sidebar': 'on',
    'dashboard.dailyGoalMinutes': '15',
    'teacher.studentCodePrefix': 'STU',
    'updater.lastChecked': '0',
    'notification.enabled': 'on',
    'notification.notifyUpdates': 'on',
    'notification.lastNotifiedVersion': '',
}

const ON_OFF: readonly string[] = ['on', 'off']

// Per-key value rules. Any value failing its predicate is coerced back to the
// default at write time, so garbage (a bad editor value, a malformed import, a
// stale setting blob) can never be persisted and then resurface as a dead
// setting that the getters silently fall back on.
const SETTING_RULES: Partial<Record<AppSettingKey, (value: string) => boolean>> = {
    'app.language': (v) => v === 'myanmar' || v === 'english',
    'app.autoUpdate': (v) => ON_OFF.includes(v),
    'design.theme': (v) => v === 'system' || v === 'light' || v === 'dark',
    'design.themeEffect': (v) => v === 'none' || v === 'aurora' || v === 'dots',
    'practice.sound': (v) => ON_OFF.includes(v),
    'practice.handGuide': (v) => ON_OFF.includes(v),
    'practice.showKeyboard': (v) => ON_OFF.includes(v),
    'practice.confirmExit': (v) => ON_OFF.includes(v),
    'practice.focusGuard': (v) => v === 'pause' || v === 'soft' || v === 'off',
    'practice.indicateTypos': (v) => v === 'below' || v === 'replace',
    'practice.quickRestart': (v) => v === 'tab' || v === 'enter' || v === 'off',
    'practice.soundVolume': (v) => {
        const n = Number(v)
        return Number.isFinite(n) && n >= 0 && n <= 1
    },
    'practice.timeWarning': (v) => ON_OFF.includes(v),
    'practice.highlightMode': (v) => v === 'word' || v === 'letter' || v === 'none',
    'practice.blindMode': (v) => v === 'on' || v === 'off',
    'practice.hideExtraLetters': (v) => ON_OFF.includes(v),
    'practice.caretStyle': (v) => v === 'bar' || v === 'block' || v === 'line' || v === 'underline',
    'practice.smoothCaret': (v) => v === 'off' || v === 'slow' || v === 'medium' || v === 'fast',
    'practice.paceCaret': (v) => ON_OFF.includes(v),
    'practice.timerStyle': (v) => v === 'text' || v === 'bar' || v === 'mini' || v === 'off',
    'practice.unit': (v) => v === 'time' || v === 'words',
    'practice.time': (v) => positiveInteger(v),
    'practice.words': (v) => positiveInteger(v),
    'practice.lang': (v) => v === 'english' || v === 'myanmar',
    'practice.punctuation': (v) => ON_OFF.includes(v),
    'practice.numbers': (v) => ON_OFF.includes(v),
    'view.sidebar': (v) => ON_OFF.includes(v),
    'dashboard.dailyGoalMinutes': (v) => nonNegativeNumber(v),
    'teacher.studentCodePrefix': (v) => /^[A-Za-z]{1,6}$/.test(v),
    'updater.lastChecked': (v) => nonNegativeNumber(v),
    'notification.enabled': (v) => ON_OFF.includes(v),
    'notification.notifyUpdates': (v) => ON_OFF.includes(v),
    'notification.lastNotifiedVersion': (v) => v.length <= 64,
}

function positiveInteger(value: string): boolean {
    const n = Number(value)
    return Number.isInteger(n) && n >= 1 && n <= 100_000
}

function nonNegativeNumber(value: string): boolean {
    const n = Number(value)
    return Number.isFinite(n) && n >= 0
}

export function sanitizeSettingValue(key: AppSettingKey, value: string): string {
    const rule = SETTING_RULES[key]
    if (!rule || rule(value)) return value
    return DEFAULT_SETTINGS[key]
}

interface SettingsState {
    values: Record<string, string>
    loaded: boolean
    load: () => Promise<void>
    get: (key: AppSettingKey) => string
    getBoolean: (key: AppSettingKey, fallback?: boolean) => boolean
    getNumber: (key: AppSettingKey, fallback?: number) => number
    getEnum: <T extends string>(key: AppSettingKey, valid: readonly T[], fallback: T) => T
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
    getBoolean: (key, fallback = false) => {
        const value = get().values[key] ?? DEFAULT_SETTINGS[key]
        if (value === 'on') return true
        if (value === 'off') return false
        return fallback
    },
    getNumber: (key, fallback = 0) => {
        const value = get().values[key] ?? DEFAULT_SETTINGS[key]
        const parsed = Number(value)
        return Number.isFinite(parsed) ? parsed : fallback
    },
    getEnum: <T extends string>(key: AppSettingKey, valid: readonly T[], fallback: T) => {
        const value = get().values[key] ?? DEFAULT_SETTINGS[key]
        return (valid as readonly string[]).includes(value) ? (value as T) : fallback
    },
    set: async (key, value) => {
        const safe = sanitizeSettingValue(key, value)
        await backend.setSetting(key, safe)
        set((state) => ({ values: { ...state.values, [key]: safe } }))
    },
}))

import { create } from 'zustand'
import type { ThemePreference } from '@/types'
import { syncWindowTheme, type ResolvedTheme } from '@/services/window-theme'
import { getThemePreset, isThemePresetId, applyThemePalette, DEFAULT_THEME_PRESET_ID } from '@/core/themes/registry'

interface UiState {
    theme: ThemePreference
    themePreset: string
    sidebarOpen: boolean
    handGuideVisible: boolean
    soundEnabled: boolean
    focusMode: boolean
    setTheme: (theme: ThemePreference) => void
    setThemePreset: (preset: string) => void
    toggleSidebar: () => void
    setSidebarOpen: (open: boolean) => void
    toggleHandGuide: () => void
    setSoundEnabled: (enabled: boolean) => void
    setFocusMode: (enabled: boolean) => void
}

function readStoredTheme(): ThemePreference {
    try {
        const value = localStorage.getItem('onetype:theme')
        if (value === 'light' || value === 'dark' || value === 'system') return value
    } catch {
        return 'system'
    }
    return 'system'
}

function readStoredThemePreset(): string {
    try {
        const value = localStorage.getItem('onetype:theme-preset')
        if (value && isThemePresetId(value)) return value
    } catch {
        return DEFAULT_THEME_PRESET_ID
    }
    return DEFAULT_THEME_PRESET_ID
}

function readStoredSound(): boolean {
    try {
        return localStorage.getItem('onetype:sound') !== 'off'
    } catch {
        return true
    }
}

function readStoredFocusMode(): boolean {
    try {
        return localStorage.getItem('onetype:focus-mode') === 'on'
    } catch {
        return false
    }
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
    if (preference !== 'system') return preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(theme: ThemePreference, presetId = readStoredThemePreset()) {
    const resolved = resolveTheme(theme)
    applyThemePaletteToRoot(getThemePreset(presetId), resolved)
    syncWindowTheme(resolved)
}

/** Paint the current tone + stored preset, then sync the window chrome. */
export function applyCurrentTheme() {
    const state = useUiStore.getState()
    const resolved = resolveTheme(state.theme)
    applyThemePaletteToRoot(getThemePreset(state.themePreset), resolved)
}

function applyThemePaletteToRoot(preset: ReturnType<typeof getThemePreset>, resolved: ResolvedTheme) {
    const root = document.documentElement
    root.dataset.theme = resolved
    root.classList.toggle('dark', resolved === 'dark')
    applyThemePalette(root, preset, resolved)
}

/** Non-persisted live preview; call applyCurrentTheme() to revert. */
export function previewThemePreset(presetId: string) {
    const state = useUiStore.getState()
    const resolved = resolveTheme(state.theme)
    applyThemePalette(document.documentElement, getThemePreset(presetId), resolved)
}

export const useUiStore = create<UiState>((set) => ({
    theme: readStoredTheme(),
    themePreset: readStoredThemePreset(),
    sidebarOpen: true,
    handGuideVisible: false,
    soundEnabled: readStoredSound(),
    focusMode: readStoredFocusMode(),
    setTheme: (theme) => {
        localStorage.setItem('onetype:theme', theme)
        applyTheme(theme)
        set({ theme })
    },
    setThemePreset: (presetId) => {
        if (!isThemePresetId(presetId)) return
        localStorage.setItem('onetype:theme-preset', presetId)
        const theme = useUiStore.getState().theme
        applyTheme(theme, presetId)
        set({ themePreset: presetId })
    },
    toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    setSidebarOpen: (open) => set({ sidebarOpen: open }),
    toggleHandGuide: () => set((state) => ({ handGuideVisible: !state.handGuideVisible })),
    setSoundEnabled: (enabled) => {
        localStorage.setItem('onetype:sound', enabled ? 'on' : 'off')
        set({ soundEnabled: enabled })
    },
    setFocusMode: (enabled) => {
        localStorage.setItem('onetype:focus-mode', enabled ? 'on' : 'off')
        set({ focusMode: enabled })
    },
}))

export function initUi() {
    applyTheme(useUiStore.getState().theme)
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (useUiStore.getState().theme === 'system') applyTheme('system')
    })
}

import { create } from 'zustand'
import type { ThemePreference } from '@/types'
import { syncWindowTheme, type ResolvedTheme } from '@/services/window-theme'

interface UiState {
    theme: ThemePreference
    sidebarOpen: boolean
    handGuideVisible: boolean
    soundEnabled: boolean
    focusMode: boolean
    setTheme: (theme: ThemePreference) => void
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

function applyTheme(theme: ThemePreference) {
    const resolved = resolveTheme(theme)
    const root = document.documentElement
    root.dataset.theme = resolved
    root.classList.toggle('dark', resolved === 'dark')
    syncWindowTheme(resolved)
}

export const useUiStore = create<UiState>((set) => ({
    theme: readStoredTheme(),
    sidebarOpen: true,
    handGuideVisible: false,
    soundEnabled: readStoredSound(),
    focusMode: readStoredFocusMode(),
    setTheme: (theme) => {
        localStorage.setItem('onetype:theme', theme)
        applyTheme(theme)
        set({ theme })
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

import { getCurrentWindow } from '@tauri-apps/api/window'
import { isTauriRuntime } from '@/services/ipc'

export type ResolvedTheme = 'light' | 'dark'

export function syncWindowTheme(theme: ResolvedTheme): void {
    if (!isTauriRuntime()) return
    void getCurrentWindow()
        .setTheme(theme)
        .catch(() => {})
}

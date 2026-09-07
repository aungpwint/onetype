/**
 * Defense-in-depth protection against web-inspector shortcuts.
 *
 * The primary enforcement happens at the native/WebView layer: in release
 * builds DevTools are disabled on the WebView itself (see `lib.rs`, where the
 * window is created with `.devtools(cfg!(debug_assertions))`). This module adds
 * a DOM-level guard for common inspection shortcuts so they are swallowed
 * before the WebView can act on them.
 *
 * It is compiled in only for production builds: Vite statically replaces
 * `import.meta.env.PROD`, so in `tauri dev` the guard is dead code and DevTools
 * remain fully available. This is protection-in-depth only — frontend code and
 * data must never be treated as un-inspectable.
 */

export interface ShortcutEvent {
    key: string
    ctrlKey: boolean
    metaKey: boolean
    altKey: boolean
    shiftKey: boolean
}

export interface BlockableShortcutEvent extends ShortcutEvent {
    preventDefault: () => void
}

/** True when the event matches a common inspection shortcut (key-based). */
export function isDevToolsShortcut(event: ShortcutEvent): boolean {
    const key = event.key.toLowerCase()
    if (key === 'f12') return true
    if (key !== 'i' && key !== 'j' && key !== 'c') return false
    return (event.ctrlKey && event.shiftKey) || (event.metaKey && event.altKey)
}

/**
 * Swallows an inspection shortcut. Returns true when the event was recognized
 * (and `preventDefault` was called), false otherwise.
 */
export function blockDevToolsShortcut(event: BlockableShortcutEvent): boolean {
    if (!isDevToolsShortcut(event)) return false
    event.preventDefault()
    return true
}

/** Registers the production-only inspection-shortcut guard on the window. */
export function installDevToolsGuards(): void {
    if (!import.meta.env.PROD) return

    window.addEventListener(
        'keydown',
        (event) => {
            blockDevToolsShortcut(event)
        },
        { capture: true },
    )
}

/**
 * Window-focus stewardship for typing rounds.
 *
 * OneType types through a global window keydown handler (not a filled input),
 * so the web platform's own focus semantics don't automatically govern a
 * round — the app must decide what losing the window's focus means. Monkeytype
 * pauses the timer and dims the UI on blur for the same reason.
 *
 * The core guarantee: a lost window/tab focus must NEVER silently inflate a
 * learner's timing, and keystrokes meant for another app must never leak into
 * a running session.
 */

export type FocusPolicy = 'off' | 'pause' | 'soft'

export interface FocusInfo {
    /** Whether the window currently has keyboard focus. */
    focused: boolean
    /** Timestamp (ms) of the last focus loss while a round was in flight. */
    lostFocusAt: number | null
    /** Milliseconds the window was away when it regained focus (AFK gap). */
    afkGapMs: number | null
}

export const NO_FOCUS_INFO: FocusInfo = { focused: true, lostFocusAt: null, afkGapMs: null }

export interface FocusEventListener {
    (event?: unknown): void
}

export interface FocusEventTarget {
    addEventListener: (type: string, listener: FocusEventListener) => void
    removeEventListener: (type: string, listener: FocusEventListener) => void
}

/**
 * Register the window/document focus + visibility listeners for a typing
 * round. Returns a cleanup function.
 *
 * - `onLostFocus` fires when the window loses keyboard focus OR the tab is
 *   hidden while a round is active. Typically pauses the timer.
 * - `onRegainedFocus(gapMs)` fires when focus comes back after an outstanding
 *   loss. `gapMs` is the time the window was away — used to detect AFK so the
 *   learner can be asked whether to continue.
 *
 * `targets` may be injected for tests (the round trips through an EventTarget
 * rather than the real browser).
 */
export function bindWindowFocusGuard(
    opts: {
        onLostFocus: () => void
        onRegainedFocus: (afkGapMs: number) => void
        isSessionActive: () => boolean
    },
    targets: { win: FocusEventTarget; doc: { visibilityState: 'hidden' | 'visible' | 'prerender' | 'unloaded'; addEventListener: (t: 'visibilitychange', l: FocusEventListener) => void; removeEventListener: (t: 'visibilitychange', l: FocusEventListener) => void } } = {
        win: window,
        doc: document,
    },
): () => void {
    const { onLostFocus, onRegainedFocus, isSessionActive } = opts
    const { win, doc } = targets

    let lostAt: number | null = null

    const handleBlur = () => {
        if (!isSessionActive()) return
        lostAt = Date.now()
        onLostFocus()
    }

    const handleVisibility = () => {
        if (doc.visibilityState === 'hidden') handleBlur()
    }

    const handleFocus = () => {
        if (lostAt !== null) {
            const gap = Date.now() - lostAt
            lostAt = null
            if (isSessionActive()) onRegainedFocus(gap)
        } else {
            lostAt = null
        }
    }

    if (doc.visibilityState === 'hidden') {
        lostAt = Date.now()
    }

    win.addEventListener('blur', handleBlur)
    win.addEventListener('focus', handleFocus)
    doc.addEventListener('visibilitychange', handleVisibility)

    return () => {
        win.removeEventListener('blur', handleBlur)
        win.removeEventListener('focus', handleFocus)
        doc.removeEventListener('visibilitychange', handleVisibility)
    }
}
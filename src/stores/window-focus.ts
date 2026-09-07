// Window-focus stewardship for typing rounds. Typing goes through a global
// window keydown handler (not a filled input), so the app itself must decide
// what losing window focus means: a lost focus must never silently inflate a
// learner's timing, and keystrokes meant for another app must never leak into
// a running session.

export type FocusPolicy = 'off' | 'pause' | 'soft'

export interface FocusInfo {
    focused: boolean
    lostFocusAt: number | null
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

// `onLostFocus` fires when the window loses keyboard focus or the tab is
// hidden while a round is active. `onRegainedFocus(gapMs)` fires when focus
// returns after an outstanding loss; the gap detects AFK so the learner can
// be asked whether to continue. `targets` may be injected for tests.
export function bindWindowFocusGuard(
    opts: {
        onLostFocus: () => void
        onRegainedFocus: (afkGapMs: number) => void
        isSessionActive: () => boolean
    },
    targets: {
        win: FocusEventTarget
        doc: {
            visibilityState: 'hidden' | 'visible' | 'prerender' | 'unloaded'
            addEventListener: (t: 'visibilitychange', l: FocusEventListener) => void
            removeEventListener: (t: 'visibilitychange', l: FocusEventListener) => void
        }
    } = {
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

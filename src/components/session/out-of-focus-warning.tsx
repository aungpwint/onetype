import { useTypingStore } from '@/stores/typing-store'
import { useSettingsStore } from '@/stores/settings-store'
import { Button } from '@/components/ui/button'

/**
 * Re-entry UX for a lost window focus.
 *
 * While the window is blurred the timer is (depending on the focus policy)
 * already paused, so this component's job is communication: tell the learner
 * the round is on hold because they stepped away, and — when they come back
 * after a meaningful gap — ask whether to pick up where they left off or start
 * a clean run.
 */

/** Gaps longer than this (ms) are treated as AFK rather than a quick tab-out. */
const AFK_THRESHOLD_MS = 5_000

export function OutOfFocusWarning() {
    const windowFocused = useTypingStore((s) => s.windowFocused)
    const afkGapMs = useTypingStore((s) => s.afkGapMs)
    const status = useTypingStore((s) => s.status)
    const togglePause = useTypingStore((s) => s.togglePause)
    const restart = useTypingStore((s) => s.restart)
    const focusPolicy = useSettingsStore((s) => s.get('practice.focusGuard'))

    // Regained focus after an AFK gap — treat the run as stale and surface a
    // clear "resume or restart" choice instead of silently continuing.
    const afk = afkGapMs !== null && afkGapMs > AFK_THRESHOLD_MS

    // Only show while a round is actually in flight; a finished/abandoned
    // session should not keep the dialog around.
    const live = status === 'running' || status === 'ready' || status === 'paused'

    if (!windowFocused) {
        const paused = focusPolicy === 'pause'
        return (
            <div
                className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center"
                aria-live="polite"
            >
                <div className="mt-28 rounded-2xl border border-line bg-background/85 px-6 py-4 text-center shadow-(--shadow-2) backdrop-blur-xl">
                    <p className="text-sm font-semibold text-foreground">{paused ? 'Round paused' : 'Round on hold'}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        {paused ? 'Click anywhere and resume to keep typing' : 'Keystrokes are paused until you return'}
                    </p>
                </div>
            </div>
        )
    }

    if (!afk || !live) return null

    const pausedText = focusPolicy === 'pause'

    // Under `pause` the round is stopped: resume it. Under `soft` it kept
    // running, so "Continue" just acknowledges and lets the learner proceed.
    const continueAction = () => {
        if (focusPolicy === 'pause') togglePause()
    }

    return (
        <div
            className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center"
            role="dialog"
            aria-modal="false"
            aria-label="You stepped away"
        >
            <div className="pointer-events-auto w-full max-w-sm rounded-2xl border border-line bg-card p-6 shadow-(--shadow-3)">
                <h2 className="font-display text-lg">Welcome back</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                    {pausedText
                        ? 'You were away for a moment. This round is paused — pick up where you left off or start a clean run.'
                        : 'You were away for a moment — pick up where you left off or start a clean run.'}
                </p>
                <div className="mt-5 flex justify-end gap-2">
                    <Button variant="outline" onClick={restart}>
                        Restart
                    </Button>
                    <Button onClick={continueAction}>{pausedText ? 'Resume' : 'Continue'}</Button>
                </div>
            </div>
        </div>
    )
}
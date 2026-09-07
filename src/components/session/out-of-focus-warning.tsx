import { useTypingStore } from '@/stores/typing-store'
import { useSettingsStore } from '@/stores/settings-store'
import { Button } from '@/components/ui/button'

const AFK_THRESHOLD_MS = 5_000

export function OutOfFocusWarning() {
    const windowFocused = useTypingStore((s) => s.windowFocused)
    const afkGapMs = useTypingStore((s) => s.afkGapMs)
    const status = useTypingStore((s) => s.status)
    const togglePause = useTypingStore((s) => s.togglePause)
    const restart = useTypingStore((s) => s.restart)
    const acknowledgeAway = useTypingStore((s) => s.acknowledgeAway)
    const focusPolicy = useSettingsStore((s) => s.getEnum('practice.focusGuard', ['off', 'pause', 'soft'] as const, 'off'))

    const afk = afkGapMs !== null && afkGapMs > AFK_THRESHOLD_MS

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

    const continueAction = () => {
        if (focusPolicy === 'pause') togglePause()
        acknowledgeAway()
    }

    const restartAction = () => {
        restart()
        acknowledgeAway()
    }

    return (
        <div
            className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center"
            role="dialog"
            aria-modal="true"
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
                    <Button variant="outline" onClick={restartAction}>
                        Restart
                    </Button>
                    <Button onClick={continueAction}>{pausedText ? 'Resume' : 'Continue'}</Button>
                </div>
            </div>
        </div>
    )
}

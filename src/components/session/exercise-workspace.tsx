import { motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, Pause, Play } from 'lucide-react'
import { useTypingStore } from '@/stores/typing-store'
import { useSettingsStore } from '@/stores/settings-store'
import { containsMyanmar } from '@/core/unicode/myanmar'
import { cn, eyebrowClass } from '@/lib/utils'
import { KeyboardContainer } from '@/components/keyboard/keyboard-container'
import { TargetText } from '@/components/target-text'
import { ResultDialog } from '@/components/result-dialog'
import { ConfirmAbandon } from '@/components/session/confirm-abandon'
import { OutOfFocusWarning } from '@/components/session/out-of-focus-warning'
import { SessionError, KeyboardLoading } from '@/components/session/session-status'
import { useConfirmExit } from '@/components/session/use-confirm-exit'
import { SessionTools } from '@/components/session/session-tools'
import { Metric } from '@/components/ui'
import { Button } from '@/components/ui/button'

const LEVEL_LABEL: Record<string, string> = {
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
}

export function ExerciseWorkspace({ onExit }: { onExit?: () => void }) {
    const status = useTypingStore((s) => s.status)
    const tick = useTypingStore((s) => s.tick)
    void tick
    const session = useTypingStore((s) => s.session)
    const engine = useTypingStore((s) => s.engine)
    const error = useTypingStore((s) => s.error)
    const togglePause = useTypingStore((s) => s.togglePause)
    const abandon = useTypingStore((s) => s.abandon)
    const exitGuard = useConfirmExit(() => {
        abandon()
        onExit?.()
    })
    const reduceMotion = useReducedMotion()

    const resolved = session?.resolved
    const layout = engine?.layout ?? null

    if (!session || !resolved) return null

    const level = LEVEL_LABEL[resolved.level] ?? resolved.level
    const label = `${level} • ${resolved.number}`
    const title = resolved.title
    const hasMyanmar = containsMyanmar(title)

    const stats = useTypingStore.getState().getLiveStats()
    const isPaused = status === 'paused'

    return (
        <motion.div
            className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
        >
            <header className="shrink-0 border-b border-line bg-background/60 backdrop-blur-xl">
                <div className="flex items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
                    <div className="flex min-w-0 items-center gap-3">
                        <Button variant="ghost" size="sm" onClick={exitGuard.requestExit} className="-ml-2 shrink-0" aria-label="Back to lessons">
                            <ArrowLeft className="size-4" />
                            <span>Back</span>
                        </Button>
                        <span className="h-5 w-px shrink-0 bg-line/70" aria-hidden />
                        <div className="hidden min-w-0 items-center gap-2 md:flex">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent font-mono text-sm font-bold text-accent-ink shadow-sm">
                                Ot
                            </span>
                            <span className="font-display text-sm leading-none">OneType</span>
                            <span className="h-5 w-px bg-line/70" aria-hidden />
                        </div>
                        <div className="min-w-0">
                            <p className={eyebrowClass}>{label}</p>
                            <h1
                                className={cn(
                                    'mt-0.5 truncate font-display text-sm leading-tight font-semibold text-foreground sm:text-base',
                                    hasMyanmar ? 'font-myanmar' : '',
                                )}
                            >
                                {title}
                            </h1>
                        </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-3 sm:gap-4">
                        <RoundProgress />
                        <Metric align="end" size="sm" value={String(Math.round(stats.wpm))} label="WPM" />
                        <Metric align="end" size="sm" value={`${Math.round(stats.accuracy)}%`} label="Accuracy" />
                        <span className="mx-1 hidden h-5 w-px bg-line/70 sm:block" aria-hidden />
                        <div className="flex items-center gap-1">
                            <SessionTools />
                            <Button
                                variant="outline"
                                size="icon-sm"
                                onClick={togglePause}
                                disabled={status !== 'running' && status !== 'paused'}
                                aria-label={isPaused ? 'Resume' : 'Pause'}
                                title={isPaused ? 'Resume' : 'Pause'}
                            >
                                {isPaused ? <Play className="size-4" /> : <Pause className="size-4" />}
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            {error ? <SessionError message={error} /> : null}

            {!layout || !engine ? (
                <KeyboardLoading />
            ) : (
                <div className="flex min-h-0 w-full flex-1 flex-col items-center overflow-hidden px-4 py-5 sm:px-8">
                    <div className="relative flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-4 lg:gap-5">
                        {status === 'ready' ? <TabStartHint /> : null}
                        <QuickRestartHint />
                        <TargetText />
                        <KeyboardContainer layout={layout} hideReadyMessage />
                        <ExerciseFooter />
                        <OutOfFocusWarning />
                    </div>
                </div>
            )}

            <ResultDialog />

            <ConfirmAbandon open={exitGuard.open} onClose={exitGuard.cancel} onConfirm={exitGuard.confirm} />
        </motion.div>
    )
}

function RoundProgress() {
    const tick = useTypingStore((s) => s.tick)
    void tick
    const engine = useTypingStore((s) => s.engine)
    const phases = useTypingStore((s) => s.session?.resolved.phases)

    const total = engine?.sequence.units.length ?? 0
    let round = 1
    const rounds = phases && phases.length > 0 ? phases.length : 1
    let current = engine ? engine.unitIndex + 1 : 1
    let chapter = total

    if (phases && phases.length > 0 && engine) {
        const idx = Math.min(engine.unitIndex + 1, total)
        const within = phases.find((p) => idx > p.startUnit && idx <= p.endUnit) ?? phases[phases.length - 1]
        round = phases.indexOf(within) + 1
        current = idx - within.startUnit
        chapter = within.endUnit - within.startUnit
    }

    return <Metric align="end" size="sm" label={`Round ${round}/${rounds}`} value={`${current} / ${chapter}`} />
}

function TabStartHint() {
    return (
        <div className="flex items-center justify-center gap-2.5" aria-live="polite">
            <span className="rounded-lg border border-line bg-card px-2.5 py-1 font-mono text-[0.6875rem] font-bold tracking-[0.15em] text-foreground uppercase shadow-sm">
                Tab
            </span>
            <span className="text-xs font-medium text-muted-foreground">Press Tab to start</span>
        </div>
    )
}

export function QuickRestartHint() {
    const pendingRestartAt = useTypingStore((s) => s.pendingRestartAt)
    const quickRestart = useSettingsStore((s) => s.getEnum('practice.quickRestart', ['tab', 'enter'] as const, 'tab'))
    if (!pendingRestartAt) return null
    const label = quickRestart === 'enter' ? 'Enter' : 'Tab'
    return (
        <div className="flex items-center justify-center gap-2.5" aria-live="polite">
            <span className="rounded-lg border border-line bg-card px-2.5 py-1 font-mono text-[0.6875rem] font-bold tracking-[0.15em] text-foreground uppercase shadow-sm">
                {label}
            </span>
            <span className="text-xs font-medium text-muted-foreground">Press {label} again to restart</span>
        </div>
    )
}

function ExerciseFooter() {
    return (
        <div className="flex flex-col items-center gap-1 pb-1">
            <p className="font-mono text-[0.6875rem] tracking-wide text-muted-foreground">Click to focus · Backspace to fix</p>
            <p className="max-w-xl text-center text-xs text-muted-foreground/80">
                The keyboard helps you type more accurately with your fingers and keys.
            </p>
        </div>
    )
}

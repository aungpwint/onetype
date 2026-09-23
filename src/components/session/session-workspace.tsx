import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { AlertTriangle, Check, Keyboard, Loader2, Pause, Play, RotateCcw, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDuration } from '@/lib/format'
import { useTypingStore } from '@/stores/typing-store'
import { useUiStore } from '@/stores/ui-store'
import { useCapsLockState } from '@/hooks/use-caps-lock'
import { useScrollLock } from '@/hooks/use-scroll-lock'
import { isCapsLockWarningVisible } from '@/core/session/caps-lock'
import { KeyboardContainer } from '@/components/keyboard/keyboard-container'
import { TargetText } from '@/components/target-text'
import { StatsBar } from '@/components/stats-bar'
import { PacePill } from '@/components/pace-pill'
import { BackButton } from '@/components/session/back-button'
import { ParagraphToggle } from '@/components/session/paragraph-toggle'
import { SessionHeader } from '@/components/session/session-header'
import { QuickRestartHint } from '@/components/session/exercise-workspace'
import { ConfirmAbandon } from '@/components/session/confirm-abandon'
import { OutOfFocusWarning } from '@/components/session/out-of-focus-warning'
import { SessionError, KeyboardLoading } from '@/components/session/session-status'
import { useConfirmExit } from '@/components/session/use-confirm-exit'
import { ResultDialog } from '@/components/result-dialog'
import { Spinner } from '@/components/ui'
import { Button } from '@/components/ui/button'

export function Session({
    durationSeconds,
    sourceName,
    eyebrow,
    onExit,
    hideKeyboard,
    keyboardDefault,
}: {
    durationSeconds: number | null
    sourceName: string
    eyebrow?: string
    onExit?: () => void
    hideKeyboard?: boolean
    keyboardDefault?: boolean
}) {
    const status = useTypingStore((s) => s.status)
    const engine = useTypingStore((s) => s.engine)
    const error = useTypingStore((s) => s.error)
    const session = useTypingStore((s) => s.session)
    const start = useTypingStore((s) => s.start)
    const togglePause = useTypingStore((s) => s.togglePause)
    const abandon = useTypingStore((s) => s.abandon)
    const focusMode = useUiStore((s) => s.focusMode)
    const capsLockOn = useCapsLockState()
    const exitGuard = useConfirmExit(() => {
        abandon()
        onExit?.()
    })

    const layout = engine?.layout ?? null

    const toggleAction = status === 'running' || status === 'paused' ? togglePause : start

    const minimalChrome = focusMode && (status === 'running' || status === 'ready') && !error

    const level = session?.resolved.level

    const reduceMotion = useReducedMotion()

    return (
        <motion.div
            className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
        >
            <AnimatePresence initial={false}>
                {minimalChrome ? (
                    <motion.div
                        key="chrome"
                        className="flex shrink-0 items-center justify-center gap-2 px-5 pt-3"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.12 }}
                    >
                        <div className="flex items-center gap-1.5 rounded-full border border-line/70 bg-background/60 px-2.5 py-1.5 opacity-50 backdrop-blur transition-opacity hover:opacity-100">
                            <BackButton compact onClick={exitGuard.requestExit} />
                            <ParagraphToggle level={level} compact />
                            <span className="h-4 w-px bg-line/70" aria-hidden />
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                    e.currentTarget.blur()
                                    toggleAction()
                                }}
                            >
                                {status === 'running' ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                                {status === 'running' ? 'Pause' : 'Start'}
                            </Button>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div key="chrome" initial={false} animate={{ opacity: 1 }}>
                        <SessionHeader
                            eyebrow={eyebrow ?? (durationSeconds !== null ? 'Timed practice' : 'Lesson')}
                            title={sourceName}
                            status={status}
                            durationSeconds={durationSeconds}
                            level={session?.resolved.level}
                            onToggle={toggleAction}
                            onExit={exitGuard.requestExit}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {error ? <SessionError message={error} /> : null}

            {!layout || !engine ? (
                <KeyboardLoading />
            ) : (
                <div className="flex min-h-0 w-full flex-1 flex-col items-center overflow-hidden px-5 py-4 sm:px-8">
                    <div className="relative flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-4 lg:gap-5">
                        <StatsBar />
                        <QuickRestartHint />
                        <TargetText />
                        <PacePill />
                        <AnimatePresence>
                            {isCapsLockWarningVisible(capsLockOn, status) ? (
                                <motion.div
                                    key="caps-lock"
                                    role="alert"
                                    className="flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs text-foreground"
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -4 }}
                                >
                                    <ShieldAlert className="size-3.5 text-amber-500" />
                                    Caps Lock is on — every letter will type in capitals.
                                </motion.div>
                            ) : null}
                        </AnimatePresence>
                        {hideKeyboard ? null : <KeyboardContainer layout={layout} defaultVisible={keyboardDefault} />}
                        <OutOfFocusWarning />
                    </div>
                </div>
            )}

            <ResultDialog />

            <ConfirmAbandon open={exitGuard.open} onClose={exitGuard.cancel} onConfirm={exitGuard.confirm} />
        </motion.div>
    )
}

const PREP_STEP_MS = 360
// After this long without a result the preparation card stops pretending it is
// making progress and hands the learner concrete choices instead.
const PREPARING_ATTENTION_AFTER_MS = 10_000

const PREP_IS_LOCAL_LINE = 'Everything is set up on your device — no internet needed.'

function PreparingCard({
    steps,
    note,
    elapsedMs,
    attention,
    attempt,
    onRetry,
    onLeave,
}: {
    steps: string[]
    note?: string
    elapsedMs: number
    attention: boolean
    attempt: number
    onRetry: () => void
    onLeave?: () => void
}) {
    const [active, setActive] = useState(0)
    const reduceMotion = useReducedMotion()
    const shownActive = attention ? steps.length - 1 : active

    useEffect(() => {
        if (attention) return
        const id = window.setInterval(() => setActive((a) => (a + 1) % steps.length), PREP_STEP_MS)
        return () => window.clearInterval(id)
    }, [attention, steps.length])

    return (
        <motion.div
            role="status"
            aria-live="polite"
            className="relative isolate my-auto w-full max-w-sm overflow-hidden rounded-3xl border border-line bg-card/75 p-8 shadow-(--shadow-3) backdrop-blur-2xl sm:p-10"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
            <span aria-hidden className="pointer-events-none absolute inset-0">
                <span className="absolute -top-24 -right-20 h-64 w-64 rounded-full bg-blue-600/10 blur-[100px]" />
                <span className="absolute -bottom-28 -left-16 h-56 w-56 rounded-full bg-indigo-500/10 blur-[100px]" />
                <span className="absolute inset-0 bg-linear-to-br from-blue-500/5 via-transparent to-transparent" />
            </span>

            <div className="relative flex flex-col items-center text-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-(--shadow-2)">
                    <Keyboard className="size-5" />
                </span>

                <p className="mt-5 font-display text-xl font-semibold tracking-[-0.01em]">
                    {attention ? 'Still getting ready…' : 'Preparing your run'}
                </p>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">{PREP_IS_LOCAL_LINE}</p>

                <ol className="mt-6 flex flex-col gap-3 text-sm">
                    {steps.map((step, i) => {
                        const done = i < shownActive
                        const current = i === shownActive
                        return (
                            <motion.li
                                key={step}
                                initial={{ opacity: 0, x: -6 }}
                                animate={{ opacity: current || done ? 1 : 0.45, x: 0 }}
                                transition={{ duration: 0.25 }}
                                className={cn('flex items-center gap-3', current ? 'text-foreground' : done ? 'text-ink-soft' : 'text-ink-faint')}
                            >
                                {done ? (
                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                                        <Check className="size-3.5" strokeWidth={3} />
                                    </span>
                                ) : current ? (
                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line-strong bg-paper-2/70 text-accent">
                                        <Loader2 className="size-3.5 animate-spin" />
                                    </span>
                                ) : (
                                    <span className="mr-2 ml-2 size-2 shrink-0 rounded-full bg-line-strong" />
                                )}
                                <span>{step}</span>
                            </motion.li>
                        )
                    })}
                </ol>

                {/* An honest clock beats fake progress: the elapsed readout is what
                    the learner can actually hold the app to. */}
                <span
                    aria-hidden
                    className="mt-6 inline-flex items-center gap-2 rounded-full border border-line/70 bg-background/60 px-3 py-1 font-mono text-[0.6875rem] font-semibold tracking-[0.15em] text-muted-foreground uppercase"
                >
                    {attention ? 'taking a moment' : 'working'} · {formatDuration(elapsedMs)}
                </span>

                {attention ? (
                    <div className="mt-6 flex flex-col items-center gap-2">
                        <p className="text-base font-medium text-foreground">This is taking a little longer than usual.</p>
                        <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
                            Nothing is downloading and no connection is being waited on, so a retry is quick and safe.
                            {attempt > 0 ? ` You're on attempt ${attempt + 1}.` : ''}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                            <Button
                                onClick={(e) => {
                                    e.currentTarget.blur()
                                    onRetry()
                                }}
                            >
                                <RotateCcw className="size-4" />
                                Try again
                            </Button>
                            {onLeave ? <BackButton onClick={onLeave} ariaLabel="Leave this session" compact /> : null}
                        </div>
                    </div>
                ) : null}

                {note ? <p className="mt-4 max-w-xs text-xs leading-relaxed text-muted-foreground">{note}</p> : null}
            </div>
        </motion.div>
    )
}

export function SessionGate({
    ready,
    loadingLabel,
    steps,
    note,
    onReload,
    onLeave,
    children,
}: {
    ready: boolean
    loadingLabel: string
    steps?: string[]
    note?: string
    onReload?: () => void
    onLeave?: () => void
    children: ReactNode
}) {
    const error = useTypingStore((s) => s.error)
    const clearError = useTypingStore((s) => s.clearError)
    const [attempt, setAttempt] = useState(0)
    const [elapsedMs, setElapsedMs] = useState(0)

    useScrollLock()

    const preparing = !ready && !error

    // Tick an honest elapsed clock while a prepare is in flight. Rebinding to
    // `attempt` resets the clock on each retry so a fresh try reads as fresh.
    useEffect(() => {
        if (!preparing) return
        const startedAt = Date.now()
        const id = window.setInterval(() => setElapsedMs(Date.now() - startedAt), 1000)
        return () => window.clearInterval(id)
    }, [preparing, attempt])

    const retry = useCallback(() => {
        clearError()
        setElapsedMs(0)
        setAttempt((n) => n + 1)
        if (onReload) onReload()
        else window.location.reload()
    }, [clearError, onReload])

    const attention = preparing && elapsedMs >= PREPARING_ATTENTION_AFTER_MS

    return (
        <AnimatePresence mode="wait">
            {ready ? (
                <motion.div
                    key="session"
                    className="flex h-full min-h-0 flex-1 flex-col overflow-hidden"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.12 }}
                >
                    {children}
                </motion.div>
            ) : error ? (
                <motion.div
                    key="error"
                    className="flex h-full min-h-0 flex-1 items-center justify-center overflow-y-auto px-6 py-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.12 }}
                >
                    <PrepareFailedCard message={error} onRetry={retry} onLeave={onLeave} />
                </motion.div>
            ) : (
                <motion.div
                    key="loading"
                    className="flex h-full min-h-0 flex-1 items-center justify-center overflow-y-auto px-6 py-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.12 }}
                >
                    {steps ? (
                        <PreparingCard
                            // Keyed by attempt so a retry remounts the card with a
                            // fresh step cycle and entrance animation.
                            key={attempt}
                            steps={steps}
                            note={note}
                            elapsedMs={elapsedMs}
                            attention={attention}
                            attempt={attempt}
                            onRetry={retry}
                            onLeave={onLeave}
                        />
                    ) : (
                        <Spinner label={loadingLabel} />
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    )
}

function PrepareFailedCard({ message, onRetry, onLeave }: { message: string; onRetry: () => void; onLeave?: () => void }) {
    const reduceMotion = useReducedMotion()

    return (
        <motion.div
            role="alert"
            className="relative isolate my-auto w-full max-w-sm overflow-hidden rounded-3xl border border-line bg-card/75 p-8 shadow-(--shadow-3) backdrop-blur-2xl sm:p-10"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
            <span aria-hidden className="pointer-events-none absolute inset-0">
                <span className="absolute -top-24 -right-20 h-64 w-64 rounded-full bg-red-600/10 blur-[100px]" />
                <span className="absolute -bottom-28 -left-16 h-56 w-56 rounded-full bg-amber-500/10 blur-[100px]" />
                <span className="absolute inset-0 bg-linear-to-br from-red-500/5 via-transparent to-transparent" />
            </span>

            <div className="relative flex flex-col items-center text-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-destructive/15 text-destructive shadow-(--shadow-2)">
                    <AlertTriangle className="size-5" />
                </span>

                <p className="mt-5 font-display text-xl font-semibold tracking-[-0.01em]">Couldn't start this run</p>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">{message}</p>
                <p className="mt-3 max-w-xs text-xs leading-relaxed text-muted-foreground">
                    {PREP_IS_LOCAL_LINE} Nothing is waiting on a network, so retrying won't change your setup.
                </p>

                <div className="mt-6 flex items-center justify-center gap-2">
                    <Button
                        onClick={(e) => {
                            e.currentTarget.blur()
                            onRetry()
                        }}
                    >
                        <RotateCcw className="size-4" />
                        Try again
                    </Button>
                    {onLeave ? <BackButton onClick={onLeave} ariaLabel="Leave this session" compact /> : null}
                </div>
            </div>
        </motion.div>
    )
}

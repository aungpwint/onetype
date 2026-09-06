import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, ArrowLeft, Check, Keyboard, LayoutDashboard, Loader2, Pause, Play, LogOut, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import * as backend from '@/services/backend'
import { useTypingStore, buildAdaptiveDrill } from '@/stores/typing-store'
import { useSettingsStore } from '@/stores/settings-store'
import { useUiStore } from '@/stores/ui-store'
import { useCapsLockState } from '@/hooks/use-caps-lock'
import { isCapsLockWarningVisible } from '@/core/session/caps-lock'
import { KeyboardContainer } from '@/components/keyboard/keyboard-container'
import { TargetText } from '@/components/target-text'
import { StatsBar } from '@/components/stats-bar'
import { ProgressLine } from '@/components/progress-line'
import { PacePill } from '@/components/pace-pill'
import { SessionHeader } from '@/components/session/session-header'
import { ExerciseWorkspace, QuickRestartHint } from '@/components/session/exercise-workspace'
import { ConfirmAbandon } from '@/components/session/confirm-abandon'
import { OutOfFocusWarning } from '@/components/session/out-of-focus-warning'
import { useConfirmExit } from '@/components/session/use-confirm-exit'
import { ResultDialog } from '@/components/result-dialog'
import { Spinner, EmptyState } from '@/components/ui'
import { Button } from '@/components/ui/button'
import type { TypingMode } from '@/types'

export function Session({
    durationSeconds,
    sourceName,
    eyebrow,
    onExit,
}: {
    durationSeconds: number | null
    sourceName: string
    eyebrow?: string
    onExit?: () => void
}) {
    const status = useTypingStore((s) => s.status)
    const engine = useTypingStore((s) => s.engine)
    const error = useTypingStore((s) => s.error)
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

    // Focus mode keeps only the target text + keyboard on screen while typing,
    // replacing the header chrome with a tiny floating control row.
    const minimalChrome = focusMode && (status === 'running' || status === 'ready') && !error

    return (
        <motion.div
            className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
        >
            <AnimatePresence initial={false}>
                {minimalChrome ? (
                    <motion.div
                        key="chrome"
                        className="flex shrink-0 items-center justify-center gap-2 px-5 pt-3"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <div className="flex items-center gap-1.5 rounded-full border border-line/70 bg-background/60 px-2.5 py-1.5 opacity-50 backdrop-blur transition-opacity hover:opacity-100">
                            <Button variant="ghost" size="sm" onClick={(e) => { e.currentTarget.blur(); exitGuard.requestExit() }}>
                                <LogOut className="size-3.5" />
                                Exit
                            </Button>
                            <span className="h-4 w-px bg-line/70" aria-hidden />
                            <Button variant="ghost" size="sm" onClick={(e) => { e.currentTarget.blur(); toggleAction() }}>
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
                            onToggle={toggleAction}
                            onExit={exitGuard.requestExit}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {error ? (
                <p
                    className="mx-5 mt-3 flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive sm:mx-8"
                    role="alert"
                >
                    <AlertCircle className="size-4 shrink-0" />
                    {error}
                </p>
            ) : null}

            {!layout || !engine ? (
                <div className="flex min-h-0 flex-1 items-center justify-center">
                    <Spinner label="Loading the keys…" />
                </div>
            ) : (
                <div className="flex min-h-0 w-full flex-1 flex-col items-center overflow-hidden px-5 py-4 sm:px-8">
                    <div className="relative flex w-full max-w-4xl flex-1 flex-col items-center justify-center gap-4 lg:gap-5">
                        <StatsBar />
                        <TargetText />
                        <ProgressLine />
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
                        <QuickRestartHint />
                        <KeyboardContainer layout={layout} />
                        <OutOfFocusWarning />
                    </div>
                </div>
            )}

            <ResultDialog />

            <ConfirmAbandon open={exitGuard.open} onClose={exitGuard.cancel} onConfirm={exitGuard.confirm} />
        </motion.div>
    )
}

const PREP_STEP_MS = 420

function PreparingCard({ steps, note }: { steps: string[]; note?: string }) {
    const [active, setActive] = useState(0)

    useEffect(() => {
        const id = window.setInterval(() => setActive((a) => (a + 1) % steps.length), PREP_STEP_MS)
        return () => window.clearInterval(id)
    }, [steps.length])

    return (
        <motion.div
            role="status"
            aria-live="polite"
            className="relative isolate my-auto w-full max-w-sm overflow-hidden rounded-3xl border border-line bg-card/75 p-8 shadow-(--shadow-3) backdrop-blur-2xl sm:p-10"
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
        >
            <span aria-hidden className="pointer-events-none absolute inset-0">
                <span className="absolute -top-24 -right-20 h-64 w-64 rounded-full bg-blue-600/10 blur-[100px]" />
                <span className="absolute -bottom-28 -left-16 h-56 w-56 rounded-full bg-indigo-500/10 blur-[100px]" />
                <span className="absolute inset-0 bg-linear-to-br from-blue-500/5 via-transparent to-transparent" />
            </span>

            <div className="relative flex flex-col items-center text-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary font-mono text-sm font-bold text-primary-foreground shadow-(--shadow-2)">
                    <Keyboard className="size-5" />
                </span>

                <p className="mt-5 font-display text-xl font-semibold tracking-[-0.01em]">Preparing your run</p>

                <ol className="mt-6 flex flex-col gap-3 text-sm">
                    {steps.map((step, i) => {
                        const done = i < active
                        const current = i === active
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
                                    <span className="ml-2 mr-2 size-2 shrink-0 rounded-full bg-line-strong" />
                                )}
                                <span>{step}</span>
                            </motion.li>
                        )
                    })}
                </ol>

                <div className="mt-6 h-1 w-44 overflow-hidden rounded-full bg-muted" aria-hidden>
                    <motion.span
                        key={active}
                        className="block h-full rounded-full bg-accent"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: PREP_STEP_MS / 1000, ease: 'easeInOut' }}
                        style={{ transformOrigin: 'left' }}
                    />
                </div>

                {note ? <p className="mt-4 max-w-xs text-xs leading-relaxed text-muted-foreground">{note}</p> : null}
            </div>
        </motion.div>
    )
}

function SessionGate({
    ready,
    loadingLabel,
    steps,
    note,
    children,
}: {
    ready: boolean
    loadingLabel: string
    steps?: string[]
    note?: string
    children: ReactNode
}) {
    useEffect(() => {
        const html = document.documentElement
        const body = document.body
        const restored = { html: html.style.overflowY, body: body.style.overflowY }
        html.style.overflowY = 'hidden'
        body.style.overflowY = 'hidden'
        return () => {
            html.style.overflowY = restored.html
            body.style.overflowY = restored.body
        }
    }, [])

    return (
        <AnimatePresence mode="wait">
            {ready ? (
                <motion.div
                    key="session"
                    className="flex h-full min-h-0 flex-1 flex-col overflow-hidden"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    {children}
                </motion.div>
            ) : (
                <motion.div
                    key="loading"
                    className="flex h-full min-h-0 flex-1 items-center justify-center overflow-y-auto px-6 py-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                >
                    {steps ? <PreparingCard steps={steps} note={note} /> : <Spinner label={loadingLabel} />}
                </motion.div>
            )}
        </AnimatePresence>
    )
}

function useBeginSession(id: string | undefined, load: () => Promise<void>) {
    const status = useTypingStore((s) => s.status)
    const sessionKind = useTypingStore((s) => s.session?.kind)
    const startedFor = useRef<string | null>(null)

    useEffect(() => {
        if (!id) return
        if (status === 'idle' && startedFor.current !== id) {
            startedFor.current = id
            void load()
        }
    }, [id, status, sessionKind, load])
}

export function LessonPage() {
    const { lessonId } = useParams<{ lessonId: string }>()
    const navigate = useNavigate()
    const session = useTypingStore((s) => s.session)
    const beginLesson = useTypingStore((s) => s.beginLesson)

    const load = useCallback(() => {
        const mode = (localStorage.getItem('onetype:lesson-mode') as TypingMode | null) ?? 'guided'
        return lessonId ? beginLesson(lessonId, mode) : Promise.resolve()
    }, [lessonId, beginLesson])

    useBeginSession(lessonId, load)

    return (
        <SessionGate
            ready={session?.kind === 'lesson'}
            loadingLabel="Loading lesson text, keyboard and attempt…"
            steps={['Loading lesson text', 'Warming up the keyboard', 'Setting up your attempt']}
            note="Your progress is saved after every run."
        >
            {session?.kind === 'lesson' ? <ExerciseWorkspace onExit={() => navigate('/learn')} /> : null}
        </SessionGate>
    )
}

export function TestPage() {
    const { testId } = useParams<{ testId: string }>()
    const navigate = useNavigate()
    const session = useTypingStore((s) => s.session)
    const beginTest = useTypingStore((s) => s.beginTest)

    const load = useCallback(async () => {
        if (!testId) return
        const tests = await backend.listTypingTests()
        const test = tests.find((t) => t.id === testId)
        if (test) await beginTest(test)
    }, [testId, beginTest])

    useBeginSession(testId, load)

    return (
        <SessionGate
            ready={session?.kind === 'test' && !!session?.test}
            loadingLabel="Preparing test text, keyboard and attempt…"
            steps={['Preparing test text', 'Warming up the keyboard', 'Setting up your attempt']}
            note="Every run is timed, scored and saved against the paper's target. Always prepare carefully and write."
        >
            {session?.kind === 'test' && session.test ? (
                <Session durationSeconds={session.test.durationSeconds} sourceName={session.test.name} onExit={() => navigate('/tests')} />
            ) : null}
        </SessionGate>
    )
}

export function DrillPage() {
    const navigate = useNavigate()
    const session = useTypingStore((s) => s.session)
    const beginDrill = useTypingStore((s) => s.beginDrill)
    const practiceLang = useSettingsStore((s) => s.values['practice.lang'])
    const [searchParams] = useSearchParams()
    const [error, setError] = useState<string | null>(null)

    const layoutId =
        searchParams.get('layout') === 'myanmar' || (searchParams.get('layout') === null && practiceLang === 'myanmar')
            ? 'myanmar'
            : 'english-qwerty'

    const load = useCallback(async () => {
        try {
            const drill = await buildAdaptiveDrill({ layoutId })
            if (drill) await beginDrill(drill)
            else setError('Not enough typing data yet to spot weaknesses. Finish a few lessons first.')
        } catch {
            setError('Could not prepare an adaptive drill right now.')
        }
    }, [beginDrill, layoutId])

    useBeginSession('drill', load)

    if (error && session?.kind !== 'drill') {
        return (
            <div className="flex h-full min-h-0 w-full flex-1 items-center justify-center px-6">
                <EmptyState icon={<AlertCircle className="size-8" />} title="Never mind the keys for now">
                    <p className="text-destructive">{error}</p>
                    <div className="mt-5 flex justify-center gap-2">
                        <Button variant="outline" onClick={() => navigate('/learn')}>
                            <ArrowLeft className="size-4" />
                            Back to lessons
                        </Button>
                        <Button onClick={() => navigate('/')}>
                            <LayoutDashboard className="size-4" />
                            Dashboard
                        </Button>
                    </div>
                </EmptyState>
            </div>
        )
    }

    return (
        <SessionGate
            ready={session?.kind === 'drill'}
            loadingLabel="Building drill from your weak keys…"
            steps={['Building your drill', 'Warming up the keyboard', 'Setting up your attempt']}
            note="Built from the keys you keep missing."
        >
            {session?.kind === 'drill' && session.drill ? (
                <Session durationSeconds={null} sourceName={session.resolved.title} eyebrow="Adaptive drill" onExit={() => navigate('/')} />
            ) : null}
        </SessionGate>
    )
}

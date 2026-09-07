import { Component, useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Gauge, Target, ArrowRight, RotateCcw, ArrowLeft, Trophy, CheckCircle2, AlertTriangle, Crown, Keyboard } from 'lucide-react'
import { useTypingStore } from '@/stores/typing-store'
import { useLessonStore } from '@/stores/lesson-store'
import { useStudentStore } from '@/stores/student-store'
import { extractMissedWords } from '@/core/materials/missed-words'
import { ACHIEVEMENT_CATALOG } from '@/data/achievements'
import * as backend from '@/services/backend'
import { computePersonalBest, type PersonalBestInfo } from '@/core/scoring/personal-best'
import { classStanding, type Standing } from '@/core/leaderboard/standing'
import { Modal } from './ui'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { formatDuration } from '@/lib/format'
import { containsMyanmar } from '@/core/unicode/myanmar'
import { summarizeClusterDiagnoses, type ClusterSlipSummary } from '@/core/unicode/comparison'
import { cn, eyebrowClass } from '@/lib/utils'
import { speedSeries } from '@/core/scoring/score'
import { WpmBars } from '@/components/wpm-bars'
import { summarizeKeyTaps, worstKeys, keyTapTone } from '@/core/session/key-outcomes'
import { troubleKeyIds, troubleDrillHref } from '@/core/session/trouble-drill'
import { summarizeMiskeys, topMiskeys, isShiftSlip } from '@/core/session/miskeys'
import { characterBreakdown, breakdownUnit } from '@/core/session/character-breakdown'
import { keyIdLabel } from '@/core/reinforcement'
import type { MasteryDelta, MasteryLevel } from '@/core/mastery'

const MASTERY_COPY: Record<MasteryLevel, string> = {
    'not-started': 'new',
    attempted: 'attempted',
    passed: 'passed',
    mastered: 'mastered',
}

function MasteryNotice({ delta }: { delta: MasteryDelta }) {
    const { before, after, improved } = delta
    return (
        <div className="rounded-xl border border-brass/40 bg-brass/10 p-3">
            <p className={eyebrowClass}>Mastery</p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted-foreground tabular-nums">{MASTERY_COPY[before]}</span>
                <ArrowRight className="size-4 text-muted-foreground" />
                <span className={cn('font-medium tabular-nums', after === 'mastered' ? 'text-brass' : 'text-foreground')}>{MASTERY_COPY[after]}</span>
                {improved ? (
                    <Badge variant="success">
                        <CheckCircle2 className="size-3" />
                        improved
                    </Badge>
                ) : null}
            </div>
            {after === 'mastered' ? (
                <p className="mt-1 text-xs text-muted-foreground">This lesson is mastered. Nice consistency!</p>
            ) : (
                <p className="mt-1 text-xs text-muted-foreground">Reach the accuracy margin on consecutive passes to master this lesson.</p>
            )}
        </div>
    )
}

class ResultDialogBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
    state = { hasError: false }

    static getDerivedStateFromError() {
        return { hasError: true }
    }

    componentDidCatch(error: unknown) {
        console.error('Result dialog crashed.', error)
    }

    render() {
        if (this.state.hasError) {
            return (
                <Modal open onClose={() => useTypingStore.getState().clear()} ariaLabel="Results unavailable">
                    <div className="flex flex-col items-start gap-3 p-4">
                        <p className="text-sm text-muted-foreground">
                            The result summary could not be rendered, but your session was saved. You can safely close this dialog and review your
                            progress from the Progress page.
                        </p>
                        <Button onClick={() => useTypingStore.getState().clear()}>Close</Button>
                    </div>
                </Modal>
            )
        }
        return this.props.children
    }
}

export function ResultDialog() {
    const resultReady = useTypingStore((s) => s.result != null)

    if (!resultReady) return null
    return (
        <ResultDialogBoundary>
            <ResultDialogInner />
        </ResultDialogBoundary>
    )
}

function ResultDialogInner() {
    const navigate = useNavigate()
    const result = useTypingStore((s) => s.result)
    const session = useTypingStore((s) => s.session)
    const clear = useTypingStore((s) => s.clear)
    const retry = useTypingStore((s) => s.retry)
    const practiceMissed = useTypingStore((s) => s.practiceMissedWords)
    const engine = useTypingStore((s) => s.engine)
    const lessonsByLevel = useLessonStore((s) => s.lessonsByLevel)
    const loadCatalog = useLessonStore((s) => s.loadCatalog)

    const pb = usePersonalBest(result?.metrics.speed ?? 0, result?.metrics.speedUnit ?? 'wpm', session?.startedAt ?? 0, session?.layout.id ?? '')
    const rank = useClassResultRank(session?.test?.id ?? null)

    const nextLessonId =
        result?.passed && session?.kind === 'lesson'
            ? (lessonsByLevel[session.resolved.level]?.find(
                  (l) => l.number === session.resolved.number + 1 && l.language === session.resolved.language,
              )?.id ?? null)
            : null

    useEffect(() => {
        void loadCatalog()
    }, [loadCatalog])

    useEffect(() => {
        if (!nextLessonId) return
        const onKey = (event: KeyboardEvent) => {
            if (event.key !== 'Enter') return
            const tag = (event.target as HTMLElement | null)?.tagName
            if (tag === 'BUTTON' || tag === 'A' || tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return
            event.preventDefault()
            clear()
            navigate(`/lesson/${nextLessonId}`)
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [nextLessonId, clear, navigate])

    if (!result || !session) return null

    const missedCount = engine ? extractMissedWords(engine).count : 0

    const newly = result.newlyUnlocked ?? []
    const achieved = newly.map((id) => ACHIEVEMENT_CATALOG[id]).filter(Boolean)

    const metrics = result.metrics
    const unitLabel = metrics.speedUnit === 'units/min' ? 'units/min' : 'wpm'
    const breakdown = characterBreakdown(metrics.correctAttempts, metrics.incorrectAttempts, metrics.graphemeClusters, metrics.speedUnit)
    const isLesson = session.kind === 'lesson'
    const isDrill = session.kind === 'drill'
    const isPractice = session.kind === 'practice'
    const target = isLesson
        ? session.resolved.completion
        : isDrill || isPractice
          ? { minAccuracy: 0, minWpm: null as number | null }
          : { minAccuracy: session.test!.minAccuracy, minWpm: session.test!.minWpm }

    const close = () => {
        clear()
    }

    const retryNow = () => {
        retry()
    }

    const beforeNavigate = (to: string) => () => {
        clear()
        navigate(to)
    }

    return (
        <Modal
            open
            onClose={close}
            ariaLabel="Session result"
            width="max-w-4xl"
            closeOnBackdrop={false}
            className="max-h-[min(calc(100vh-3rem),900px)] overflow-y-auto"
        >
            <div className="pr-10">
                <p className={cn(eyebrowClass, 'flex items-center gap-2')}>
                    <span aria-hidden className={cn('size-1.5 rounded-full', result.passed ? 'bg-success' : 'bg-warning')} />
                    {isDrill ? (
                        `Adaptive drill · ${session.resolved.focusKeys?.join('') ?? 'weak keys'} · attempt ${result.attempt}`
                    ) : isLesson ? (
                        <>
                            Exercise ·
                            <span className={containsMyanmar(session.resolved.title) ? 'font-myanmar tracking-normal' : undefined}>
                                {session.resolved.title}
                            </span>
                        </>
                    ) : isPractice ? (
                        `Quick practice · attempt ${result.attempt}`
                    ) : (
                        `Test · ${session.test!.code}`
                    )}{' '}
                    · attempt {result.attempt}
                </p>
                <h2 className="mt-1.5 font-display text-2xl">
                    {isDrill
                        ? 'Drill complete'
                        : result.passed
                          ? isLesson || isPractice
                              ? 'Lesson passed'
                              : 'Test passed'
                          : 'Round finished — not yet passed'}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    {isDrill
                        ? 'Loosened up those weak spots. Practice keeps the finger memory sharp.'
                        : result.passed
                          ? isLesson || isPractice
                              ? isPractice
                                  ? 'Clean run. Repeat to sharpen, or tweak the add-ons and go again.'
                                  : 'Well typed. Move to the next line.'
                              : 'You beat the target. Keep the form.'
                          : `Target was ${target.minAccuracy}% accuracy${target.minWpm !== null ? ` and ${target.minWpm} WPM` : ''}. One more round.`}
                </p>
            </div>

            <div
                className={cn(
                    'mt-5 overflow-hidden rounded-2xl border bg-surface shadow-[var(--shadow-1)]',
                    result.passed ? 'border-success/25' : 'border-warning/30',
                )}
            >
                <div className="grid grid-cols-3 divide-x divide-line">
                    <HeroMetric
                        label={metrics.speedUnit === 'units/min' ? 'Net units/min' : 'Net speed'}
                        value={String(Math.round(metrics.speed))}
                        unit={unitLabel}
                        primary
                    />
                    <HeroMetric label="Accuracy" value={`${metrics.accuracy.toFixed(1)}%`} />
                    <HeroMetric label="Raw" value={String(Math.round(metrics.rawSpeed))} unit={unitLabel} />
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 border-t border-line bg-muted/40 px-4 py-3.5 text-sm sm:grid-cols-3 lg:grid-cols-6">
                    <Detail label="Consistency" value={`${metrics.consistency.toFixed(0)}%`} />
                    <Detail label="Errors" value={String(metrics.incorrectAttempts)} />
                    <Detail label="Backspaces" value={String(metrics.backspaceCount)} />
                    <Detail
                        label={breakdownUnit(metrics.speedUnit) === 'clusters' ? 'Clusters typed' : 'Characters typed'}
                        value={
                            <>
                                {breakdown.correct}
                                {breakdown.wrong > 0 ? <span className="text-muted-foreground"> + {breakdown.wrong} wrong</span> : null}
                            </>
                        }
                    />
                    <Detail label="Time" value={formatDuration(metrics.elapsedSeconds * 1000)} />
                    {!isDrill && !isPractice ? (
                        <Detail label="Target" value={`${target.minAccuracy}% acc${target.minWpm !== null ? ` · ${target.minWpm} wpm` : ''}`} />
                    ) : null}
                </dl>
            </div>

            {(pb && pb.total > 0) || (rank && rank.hasStanding) ? (
                <div className="mt-3 flex flex-wrap gap-3">
                    {pb && pb.total > 0 ? (
                        <div
                            className={cn(
                                'flex min-w-56 flex-1 flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border px-3 py-2.5',
                                pb.isNewBest ? 'border-brass/40 bg-brass/10' : 'border-line bg-muted/40',
                            )}
                        >
                            <p className={cn(eyebrowClass, 'flex w-full items-center gap-1.5')}>
                                {pb.isNewBest ? <Crown className="size-3.5 text-brass" /> : <Trophy className="size-3.5 text-ink-faint" />}
                                {pb.isNewBest ? 'New personal best' : 'Personal best'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {pb.isNewBest ? (
                                    <>
                                        <span className="font-semibold text-brass tabular-nums">
                                            {Math.round(metrics.speed)} {unitLabel}
                                        </span>
                                        {pb.previousBest !== null ? <> · was {Math.round(pb.previousBest)}</> : ' · first round on this desk'}
                                    </>
                                ) : (
                                    <>
                                        {Math.round(pb.previousBest ?? 0)} {unitLabel} ·{' '}
                                        <span className="tabular-nums">{Math.round(metrics.speed)}</span> today
                                    </>
                                )}
                            </p>
                        </div>
                    ) : null}
                    {rank && rank.hasStanding ? (
                        <div className="flex min-w-40 flex-1 flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-line bg-muted/40 px-3 py-2.5">
                            <p className={cn(eyebrowClass, 'flex w-full items-center gap-1.5')}>
                                <Trophy className="size-3.5 text-brass" />
                                Class rank
                            </p>
                            <p className="text-sm text-muted-foreground">
                                <span className="font-semibold tabular-nums">#{rank.rank}</span> of {rank.total} on this paper
                            </p>
                        </div>
                    ) : null}
                </div>
            ) : null}

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <PacingChart />

                <KeyTapMap />

                <MiskeyList />

                {metrics.speedUnit === 'units/min' ? <ClusterSlips /> : null}

                {isLesson && result.masteryDelta ? <MasteryNotice delta={result.masteryDelta} /> : null}

                {result.saveError ? (
                    <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm md:col-span-2" role="alert">
                        <span className="font-medium">Couldn't save this round.</span>{' '}
                        <span className="text-muted-foreground">{result.saveError}</span>
                    </div>
                ) : null}

                {achieved.length > 0 ? (
                    <div className="rounded-xl border border-brass/40 bg-brass/10 p-3 md:col-span-2">
                        <p className={cn(eyebrowClass, 'flex items-center gap-1.5')}>
                            <Trophy className="size-3.5 text-brass" />
                            Achievement unlocked
                        </p>
                        <ul className="mt-2 grid gap-x-8 gap-y-1.5 sm:grid-cols-2">
                            {achieved.map((a) => (
                                <li key={a.id} className="flex items-center gap-2 text-sm">
                                    <span aria-hidden className="text-base">
                                        {a.icon}
                                    </span>
                                    <span className="font-medium">{a.title}</span>
                                    <span className="text-xs text-muted-foreground">{a.description}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : null}
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-line pt-4">
                <Button variant="outline" onClick={beforeNavigate(isDrill ? '/' : isLesson ? '/learn' : isPractice ? '/practice' : '/tests')}>
                    <ArrowLeft className="size-4" />
                    {isDrill ? 'Dashboard' : 'Back to list'}
                </Button>
                {nextLessonId ? (
                    <Button variant="brass" onClick={beforeNavigate(`/lesson/${nextLessonId}`)}>
                        Next lesson
                        <ArrowRight className="size-4" />
                    </Button>
                ) : null}
                {missedCount > 0 ? (
                    <Button variant="outline" onClick={() => void practiceMissed()}>
                        <Target className="size-4" />
                        Practice {missedCount} missed
                    </Button>
                ) : null}
                <Button onClick={retryNow}>
                    <RotateCcw className="size-4" />
                    Type again
                </Button>
            </div>
        </Modal>
    )
}

function KeyTapMap() {
    const navigate = useNavigate()
    const engine = useTypingStore((s) => s.engine)
    const session = useTypingStore((s) => s.session)
    const clear = useTypingStore((s) => s.clear)
    if (!engine || !session) return null
    const summary = summarizeKeyTaps(engine.keyOutcomes)
    if (summary.distinctKeys === 0) return null
    const worst = worstKeys(summary, 5)
    const layout = session.layout
    const trouble = troubleKeyIds(summary, layout)

    const practiceTrouble = () => {
        const href = troubleDrillHref(layout.id, trouble)
        clear()
        navigate(href)
    }

    return (
        <div className="rounded-xl border border-line bg-muted/40 p-3">
            <p className={cn(eyebrowClass, 'flex items-center gap-1.5')}>
                <Keyboard className="size-3.5 text-accent" />
                Key taps
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
                {Math.round(summary.keystrokeAccuracy)}% of {summary.totalKeystrokes} keystrokes hit the right key.
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
                {summary.keys.map((tap) => {
                    const label = keyIdLabel(tap.id, layout)
                    const tone = keyTapTone(tap)
                    return (
                        <span
                            key={tap.id}
                            title={`${label} · ${tap.correct} correct · ${tap.incorrect} wrong`}
                            className={cn(
                                'flex h-8 min-w-8 items-center justify-center rounded-md border px-1.5 font-mono text-sm tabular-nums',
                                tone === 'clean' && 'border-success/50 bg-success/10 text-success',
                                tone === 'slip' && 'border-brass/50 bg-brass/10 text-brass',
                                tone === 'heavy' && 'border-destructive/50 bg-destructive/10 text-destructive',
                            )}
                        >
                            {label}
                        </span>
                    )
                })}
            </div>
            {worst.length > 0 ? (
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                        Trouble keys: <span className="font-medium text-foreground">{worst.map((t) => keyIdLabel(t.id, layout)).join(', ')}</span>
                    </p>
                    {trouble.length > 0 ? (
                        <Button variant="outline" size="sm" onClick={practiceTrouble}>
                            <Target className="size-3.5" />
                            Practice {trouble.length} of them now
                        </Button>
                    ) : null}
                </div>
            ) : null}
        </div>
    )
}

function MiskeyList() {
    const engine = useTypingStore((s) => s.engine)
    const session = useTypingStore((s) => s.session)
    if (!engine || !session) return null
    const summary = summarizeMiskeys(engine.wrongPresses)
    if (summary.miskeyCount === 0) return null
    const top = topMiskeys(summary, 5)
    const layout = session.layout
    const hasShiftSlips = top.some(isShiftSlip)

    return (
        <div className="rounded-xl border border-line bg-muted/40 p-3">
            <p className={cn(eyebrowClass, 'flex items-center gap-1.5')}>
                <ArrowRight className="size-3.5 text-accent" />
                Miskeys
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{summary.miskeyCount} presses landed on the wrong key. The most frequent mix-ups:</p>
            <ul className="mt-2 space-y-1.5">
                {top.map((pair) => (
                    <li key={`${pair.expectedId}-${pair.pressedId}`} className="flex items-center gap-2 text-sm">
                        <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs">{keyIdLabel(pair.expectedId, layout)}</span>
                        <ArrowRight className="size-3.5 text-muted-foreground" />
                        <span
                            className={cn(
                                'rounded-md px-1.5 py-0.5 font-mono text-xs',
                                isShiftSlip(pair) ? 'bg-brass/10 text-brass' : 'bg-destructive/10 text-destructive',
                            )}
                        >
                            {keyIdLabel(pair.pressedId, layout)}
                        </span>
                        <span className="text-xs text-muted-foreground tabular-nums">{pair.count}×</span>
                        {isShiftSlip(pair) ? <Badge variant="outline">shift slip</Badge> : null}
                    </li>
                ))}
            </ul>
            {hasShiftSlips ? (
                <p className="mt-2 text-xs text-muted-foreground">Shift slips are the right key pressed with the wrong Shift state.</p>
            ) : null}
        </div>
    )
}

function ClusterSlips() {
    const engine = useTypingStore((s) => s.engine)
    const diagnoses = engine?.diagnoseClusters() ?? []
    const summary = summarizeClusterDiagnoses(diagnoses)
    if (summary.length === 0) return null

    const copy: Record<ClusterSlipSummary['kind'], { title: string; hint: string }> = {
        'missing-mark': { title: 'Missing mark', hint: 'A tone mark, medial or vowel was left out' },
        'extra-mark': { title: 'Extra mark', hint: 'An unneeded mark was typed' },
        'wrong-order': { title: 'Order slip', hint: 'The marks are right but typed in the wrong order' },
        'wrong-sequence': { title: 'Mixed marks', hint: 'One or more marks were replaced by the wrong one' },
        'wrong-character': { title: 'Wrong base', hint: 'The base letter or token was wrong' },
    }

    return (
        <div className="rounded-xl border border-line bg-muted/40 p-3">
            <p className={cn(eyebrowClass, 'flex items-center gap-1.5')}>
                <AlertTriangle className="size-3.5 text-brass" />
                Common Myanmar slips
            </p>
            <ul className="mt-2 space-y-2">
                {summary.map((s) => (
                    <li key={s.kind} className="flex items-start gap-2 text-sm">
                        <span className="mt-0.5 rounded-md bg-muted px-1.5 py-0.5 text-xs tabular-nums">{s.count}×</span>
                        <span>
                            <span className="font-medium">{copy[s.kind].title}</span>
                            <span className="text-muted-foreground"> — {copy[s.kind].hint}</span>
                            <span className="ml-1 font-myanmar text-xs text-muted-foreground tabular-nums">{s.example}</span>
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    )
}

function HeroMetric({ label, value, unit, primary }: { label: string; value: string; unit?: string; primary?: boolean }) {
    return (
        <div className={cn('flex flex-col items-center gap-1.5 px-2 py-4 text-center md:py-5', primary && 'bg-brass/5')}>
            <p
                className={cn(
                    'font-display leading-none font-semibold tracking-[-0.02em] tabular-nums',
                    primary ? 'text-4xl text-brass md:text-5xl' : 'text-3xl md:text-4xl',
                )}
            >
                {value}
                {unit ? <span className="ml-1 text-sm font-medium tracking-normal text-ink-faint tabular-nums md:text-base">{unit}</span> : null}
            </p>
            <p className={eyebrowClass}>{label}</p>
        </div>
    )
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex items-baseline justify-between gap-2 sm:flex-col sm:items-start sm:gap-1">
            <dt className={eyebrowClass}>{label}</dt>
            <dd className="text-sm font-medium tabular-nums">{value}</dd>
        </div>
    )
}

function usePersonalBest(speed: number, unit: string, startedAt: number, layoutId: string): PersonalBestInfo | null {
    const studentId = useStudentStore((s) => s.active?.id ?? null)
    const [info, setInfo] = useState<PersonalBestInfo | null>(null)

    useEffect(() => {
        // Session history only stores WPM, so units/min rounds have no comparable priors.
        if (speed <= 0 || unit !== 'wpm' || !studentId) return
        let alive = true
        void backend
            .listTypingSessions(studentId, 500)
            .then((sessions) => {
                if (!alive) return
                const prior = sessions
                    .filter((session) => session.startedAt !== startedAt && session.layoutId === layoutId)
                    .map((session) => session.wpm)
                setInfo(computePersonalBest(prior, speed))
            })
            .catch(() => undefined)
        return () => {
            alive = false
        }
    }, [speed, unit, startedAt, layoutId, studentId])

    return info
}

function useClassResultRank(testId: string | null): Standing | null {
    const studentId = useStudentStore((s) => s.active?.id ?? null)
    const [standing, setStanding] = useState<Standing | null>(null)

    useEffect(() => {
        if (!testId || !studentId) return
        let alive = true
        void backend
            .classLeaderboard(testId)
            .then((board) => {
                if (!alive) return
                const entry = studentId ? (board.find((e) => e.studentId === studentId) ?? null) : null
                setStanding(classStanding(entry, board.length))
            })
            .catch(() => undefined)
        return () => {
            alive = false
        }
    }, [testId, studentId])

    return standing
}

function PacingChart() {
    const engine = useTypingStore((s) => s.engine)
    const metrics = useTypingStore((s) => s.result?.metrics)
    if (!engine || !metrics) return null
    const series = speedSeries({
        correctAttempts: metrics.correctAttempts,
        incorrectAttempts: metrics.incorrectAttempts,
        backspaceCount: metrics.backspaceCount,
        elapsedSeconds: metrics.elapsedSeconds,
        language: metrics.language,
        correctTimes: engine.correctTimes,
    })
    const unit = metrics.speedUnit === 'units/min' ? 'units/min' : 'wpm'
    return (
        <div className="rounded-xl border border-line bg-muted/40 p-3">
            <p className={cn(eyebrowClass, 'flex items-center gap-1.5')}>
                <Gauge className="size-3.5 text-accent" />
                Speed over time
            </p>
            <div className="mt-2">
                <WpmBars values={series} unit={unit} ariaLabel={`Typing speed over time (${unit})`} />
            </div>
        </div>
    )
}

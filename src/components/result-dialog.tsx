import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Gauge, Target, AlignLeft, ArrowRight, RotateCcw, ArrowLeft, Trophy, CheckCircle2, AlertTriangle, Crown, Keyboard } from 'lucide-react'
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
        <div className="mt-4 rounded-xl border border-brass/40 bg-brass/10 p-3">
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

export function ResultDialog() {
    const navigate = useNavigate()
    const result = useTypingStore((s) => s.result)
    const session = useTypingStore((s) => s.session)
    const clear = useTypingStore((s) => s.clear)
    const retry = useTypingStore((s) => s.retry)
    const practiceMissed = useTypingStore((s) => s.practiceMissedWords)
    const engine = useTypingStore((s) => s.engine)
    const lessonsByLevel = useLessonStore((s) => s.lessonsByLevel)

    const pb = usePersonalBest(result?.metrics.speed ?? 0, result?.metrics.speedUnit ?? 'wpm', session?.startedAt ?? 0, session?.layout.id ?? '')
    const rank = useClassResultRank(session?.test?.id ?? null)

    if (!result || !session) return null

    const missedCount = engine ? extractMissedWords(engine).count : 0

    const newly = result.newlyUnlocked ?? []
    const achieved = newly.map((id) => ACHIEVEMENT_CATALOG[id]).filter(Boolean)

    const metrics = result.metrics
    const unitLabel = metrics.speedUnit === 'units/min' ? 'units/min' : 'wpm'
    const isLesson = session.kind === 'lesson'
    const isDrill = session.kind === 'drill'
    const isPractice = session.kind === 'practice'
    // Drills are practice without a pass/fail gate, so they always show as complete.
    const target = isLesson
        ? session.resolved.completion
        : isDrill || isPractice
          ? { minAccuracy: 0, minWpm: null as number | null }
          : { minAccuracy: session.test!.minAccuracy, minWpm: session.test!.minWpm }

    let nextLessonId: string | null = null
    if (isLesson && result.passed) {
        const lesson = session.resolved
        const sameLevel = lessonsByLevel[lesson.level]
        const next = sameLevel.find((l) => l.number === lesson.number + 1 && l.language === lesson.language)
        nextLessonId = next?.id ?? null
    }

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
        <Modal open onClose={close} ariaLabel="Session result">
            <div className="flex items-start justify-between pr-10">
                <div>
                    <p className={eyebrowClass}>
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
                    <h2 className="mt-1 font-display text-2xl">
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
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
                <Metric
                    icon={<Gauge className="size-4" />}
                    label={metrics.speedUnit === 'units/min' ? 'Units/min' : 'WPM'}
                    value={String(Math.round(metrics.speed))}
                />
                <Metric icon={<Target className="size-4" />} label="Accuracy" value={`${metrics.accuracy.toFixed(1)}%`} />
                <Metric
                    icon={<AlignLeft className="size-4" />}
                    label={metrics.speedUnit === 'units/min' ? 'Raw units/min' : 'Raw WPM'}
                    value={String(Math.round(metrics.rawSpeed))}
                />
            </div>

            {pb && pb.total > 0 ? (
                <div
                    className={
                        'mt-3 flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 text-sm ' +
                        (pb.isNewBest ? 'border-brass/40 bg-brass/10' : 'border-line bg-muted/40')
                    }
                >
                    {pb.isNewBest ? <Crown className="size-4 shrink-0 text-brass" /> : <Trophy className="size-4 shrink-0 text-ink-faint" />}
                    {pb.isNewBest ? (
                        <span>
                            <span className="font-semibold text-brass">New personal best</span>
                            <span className="text-muted-foreground">
                                {' '}
                                — {Math.round(metrics.speed)} {unitLabel}
                                {pb.previousBest !== null ? ` · was ${Math.round(pb.previousBest)}` : ' · first round on this desk'}
                            </span>
                        </span>
                    ) : (
                        <span>
                            <span className="font-medium">Personal best</span>
                            <span className="text-muted-foreground">
                                {' '}
                                {Math.round(pb.previousBest ?? 0)} {unitLabel} · {Math.round(metrics.speed)} today
                            </span>
                        </span>
                    )}
                </div>
            ) : null}

            {rank && rank.hasStanding ? (
                <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-muted/40 px-3 py-2 text-sm">
                    <Trophy className="size-4 shrink-0 text-brass" />
                    <span>
                        <span className="font-medium">Class rank {rank.rank}</span>
                        <span className="text-muted-foreground"> of {rank.total} on this paper</span>
                    </span>
                </div>
            ) : null}

            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                <div className="flex justify-between">
                    <dt className="text-muted-foreground">Consistency</dt>
                    <dd className="tabular-nums">{metrics.consistency.toFixed(0)}%</dd>
                </div>
                <div className="flex justify-between">
                    <dt className="text-muted-foreground">Errors</dt>
                    <dd className="tabular-nums">{metrics.incorrectAttempts}</dd>
                </div>
                <div className="flex justify-between">
                    <dt className="text-muted-foreground">Backspaces</dt>
                    <dd className="tabular-nums">{metrics.backspaceCount}</dd>
                </div>
                {metrics.speedUnit === 'units/min' ? (
                    <div className="flex justify-between">
                        <dt className="text-muted-foreground">Grapheme clusters</dt>
                        <dd className="tabular-nums">{metrics.graphemeClusters}</dd>
                    </div>
                ) : (
                    <div className="flex justify-between">
                        <dt className="text-muted-foreground">Characters typed</dt>
                        <dd className="tabular-nums">{metrics.correctAttempts}</dd>
                    </div>
                )}
                <div className="flex justify-between">
                    <dt className="text-muted-foreground">Time</dt>
                    <dd className="tabular-nums">{formatDuration(metrics.elapsedSeconds * 1000)}</dd>
                </div>
                {!isDrill && !isPractice ? (
                    <div className="flex justify-between">
                        <dt className="text-muted-foreground">Target</dt>
                        <dd className="tabular-nums">
                            {target.minAccuracy}% acc{target.minWpm !== null ? ` · ${target.minWpm} wpm` : ''}
                        </dd>
                    </div>
                ) : null}
                <div className="flex justify-between">
                    <dt className="text-muted-foreground">Pass</dt>
                    <dd className={cn('tabular-nums', result.passed ? 'text-success' : 'text-destructive')}>
                        {result.passed ? 'passed' : 'not yet'}
                    </dd>
                </div>
            </dl>

            {metrics.elapsedSeconds > 1 ? <PacingChart /> : null}

            <KeyTapMap />

            {metrics.speedUnit === 'units/min' ? <ClusterSlips /> : null}

            {isLesson && result.masteryDelta ? <MasteryNotice delta={result.masteryDelta} /> : null}

            {result.saveError ? (
                <div className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm" role="alert">
                    <span className="font-medium">Couldn't save this round.</span> <span className="text-muted-foreground">{result.saveError}</span>
                </div>
            ) : null}

            {achieved.length > 0 ? (
                <div className="mt-4 rounded-xl border border-brass/40 bg-brass/10 p-3">
                    <p className={cn(eyebrowClass, 'flex items-center gap-1.5')}>
                        <Trophy className="size-3.5 text-brass" />
                        Achievement unlocked
                    </p>
                    <ul className="mt-2 space-y-1.5">
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

            <div className="mt-6 flex flex-wrap justify-end gap-2">
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
        <div className="mt-4 rounded-xl border border-line bg-muted/40 p-3">
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
                        Trouble keys:{' '}
                        <span className="font-medium text-foreground">{worst.map((t) => keyIdLabel(t.id, layout)).join(', ')}</span>
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
        <div className="mt-4 rounded-xl border border-line bg-muted/40 p-3">
            <p className={cn(eyebrowClass, 'flex items-center gap-1.5')}>
                <AlertTriangle className="size-3.5 text-brass" />
                Common Myanmar slips
            </p>
            <ul className="mt-2 space-y-2">
                {summary.map((s) => (
                    <li key={s.kind} className="flex items-start gap-2 text-sm">
                        <span className="mt-0.5 rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs">{s.count}×</span>
                        <span>
                            <span className="font-medium">{copy[s.kind].title}</span>
                            <span className="text-muted-foreground"> — {copy[s.kind].hint}</span>
                            <span className="ml-1 font-mono text-xs text-muted-foreground tabular-nums">{s.example}</span>
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    )
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-muted/50 p-3 text-center">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-background text-muted-foreground shadow-sm">{icon}</span>
            <p className={eyebrowClass}>{label}</p>
            <p className="font-display text-2xl tabular-nums md:text-3xl">{value}</p>
        </div>
    )
}

function usePersonalBest(speed: number, unit: string, startedAt: number, layoutId: string): PersonalBestInfo | null {
    const studentId = useStudentStore((s) => s.active?.id ?? null)
    const [info, setInfo] = useState<PersonalBestInfo | null>(null)

    useEffect(() => {
        // Session history only ever stores WPM, so units/min rounds (Myanmar)
        // have no compatible prior speeds to compare against.
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
        <div className="mt-4 rounded-xl border border-line bg-muted/40 p-3">
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

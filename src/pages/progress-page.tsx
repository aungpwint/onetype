import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, Target, Gauge, Clock, TrendingDown, Minus, Fingerprint, CalendarDays, Sparkles } from 'lucide-react'
import { useStudentStore } from '@/stores/student-store'
import * as backend from '@/services/backend'
import type { StudentDetail, TypingSession } from '@/services/types'
import { lessonCountsWithCurriculumTotals } from '@/data/curriculum'
import { Stat, Spinner, PageHeader } from '@/components/ui'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { WpmBars } from '@/components/wpm-bars'
import { ActivityHeatmap } from '@/components/activity-heatmap'
import type { ActivityDay } from '@/lib/activity-data'
import { formatDateTime, formatLessonLabel, formatWpm, formatAccuracy, pct, bestResultByTest } from '@/lib/format'
import { cn, cardClass, appPageClass, eyebrowClass, sectionTitleClass, chipClass } from '@/lib/utils'
import { summarizePerformance, type SessionPoint } from '@/core/analytics'
import { previewWeaknessDrill, drillGoalLabel } from '@/core/reinforcement/preview'
import { keyIdLabel } from '@/core/reinforcement/service'
import { myanmar } from '@/core/keyboard-layout/myanmar'

type Range = 'week' | 'month' | 'all'

function inRange(s: TypingSession, range: Range): boolean {
    if (range === 'all') return true
    const now = Date.now()
    const ms = range === 'week' ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000
    return s.startedAt >= now - ms
}

function AccChart({ values }: { values: number[] }) {
    const w = 480
    const h = 90
    const points = values.map((v, i) => {
        const x = values.length === 1 ? 0 : (i / (values.length - 1)) * w
        const y = h - (v / 100) * (h - 16)
        return `${x},${y}`
    })
    return (
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Accuracy over recent sessions">
            <defs>
                <linearGradient id="acc-chart-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                </linearGradient>
            </defs>
            {[0.25, 0.5, 0.75].map((g) => (
                <line key={g} x1={0} x2={w} y1={h - 16 - g * (h - 16)} y2={h - 16 - g * (h - 16)} stroke="var(--line)" strokeDasharray="2 4" />
            ))}
            {points.length > 1 ? (
                <>
                    <polygon points={`0,${h} ${points.join(' ')} ${w},${h}`} fill="url(#acc-chart-fill)" />
                    <polyline
                        points={points.join(' ')}
                        fill="none"
                        stroke="var(--accent)"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </>
            ) : points.length === 1 ? (
                <circle cx={points[0].split(',')[0]} cy={points[0].split(',')[1]} r={3} fill="var(--accent)" />
            ) : null}
            <line x1={0} y1={h - 0.5} x2={w} y2={h - 0.5} stroke="var(--line-strong)" />
        </svg>
    )
}

function formatTrend(slope: number): string {
    return `${slope >= 0 ? '+' : ''}${slope.toFixed(2)}`
}

function TrendRow({ label, slope, valid, unit }: { label: string; slope: number; valid: boolean; unit: string }) {
    const up = slope > 0.0001
    const down = slope < -0.0001
    const cls = valid ? (up ? 'text-success' : down ? 'text-destructive' : 'text-muted-foreground') : 'text-muted-foreground'
    return (
        <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className={cn('tabular-nums', cls)}>
                {valid ? (
                    <>
                        {up ? (
                            <TrendingUp className="mr-1 inline size-3.5" />
                        ) : down ? (
                            <TrendingDown className="mr-1 inline size-3.5" />
                        ) : (
                            <Minus className="mr-1 inline size-3.5" />
                        )}
                        {formatTrend(slope)} {unit}/per session
                    </>
                ) : (
                    'need 2+ sessions'
                )}
            </span>
        </div>
    )
}

export default function ProgressPage() {
    const active = useStudentStore((s) => s.active)
    const navigate = useNavigate()
    const [detail, setDetail] = useState<StudentDetail | null>(null)
    const [range, setRange] = useState<Range>('all')

    useEffect(() => {
        if (!active) return
        void (async () => {
            setDetail(await backend.studentDetail(active.id))
        })()
    }, [active])

    if (!active) return null
    if (!detail)
        return (
            <div className="flex min-h-0 flex-1 items-center justify-center">
                <Spinner label="Tallying the marks…" />
            </div>
        )

    const weakPreview = previewWeaknessDrill(detail.weakKeys, 8, myanmar)
    const sessions = detail.recentSessions.filter((s) => s.correctCount > 0 && inRange(s, range))
    const wpmSeries = sessions.map((s) => s.wpm).slice(0, 24)
    const accSeries = sessions.map((s) => s.accuracy).slice(0, 24)
    const rangeSessions = sessions.length
    const rangeMinutes = sessions.reduce((sum, s) => sum + s.durationMs, 0) / 60000
    const rangeWpm = rangeSessions ? sessions.reduce((sum, s) => sum + s.wpm, 0) / rangeSessions : 0
    const rangeBest = rangeSessions ? Math.max(...sessions.map((s) => s.wpm)) : 0

    const points: SessionPoint[] = sessions.map((s) => ({
        startedAt: s.startedAt,
        wpm: s.wpm,
        accuracy: s.accuracy,
        correctCount: s.correctCount,
        errorCount: s.errorCount,
    }))
    const summary = summarizePerformance(points)

    return (
        <div className={appPageClass}>
            <PageHeader
                eyebrow={`For ${active.displayName}`}
                title="Progress"
                subtitle="Everything is derived from your saved typing sessions — accuracy, speed, and the keys that need attention."
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="grid w-full grid-cols-2 gap-3 lg:w-auto lg:grid-cols-4">
                    <Stat icon={<Target className="size-4" />} label="Avg accuracy" value={`${summary.pooledAccuracy.toFixed(1)}%`} />
                    <Stat icon={<Gauge className="size-4" />} label="Avg WPM" value={rangeSessions ? Math.round(rangeWpm) : '—'} />
                    <Stat icon={<Clock className="size-4" />} label="Minutes practiced" value={`${rangeMinutes.toFixed(0)}`} />
                    <Stat icon={<TrendingUp className="size-4" />} label="Best WPM" value={rangeSessions ? Math.round(rangeBest) : '—'} />
                </div>
                <div className="inline-flex rounded-lg border border-line bg-muted/70 p-1" role="group" aria-label="Session range">
                    {(['week', 'month', 'all'] as Range[]).map((r) => (
                        <button
                            key={r}
                            type="button"
                            aria-pressed={range === r}
                            onClick={() => setRange(r)}
                            className={cn(
                                'rounded-md px-3 py-1.5 text-xs capitalize transition-[color,background-color,box-shadow] duration-150',
                                range === r ? 'bg-background font-medium text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            {r === 'week' ? 'This week' : r === 'month' ? 'This month' : 'All time'}
                        </button>
                    ))}
                </div>
            </div>

            <div className={cn(cardClass, 'p-5')}>
                <div className="flex items-center gap-2">
                    <CalendarDays className="size-4 text-muted-foreground" />
                    <h2 className={sectionTitleClass}>Activity</h2>
                </div>
                <div className="mt-4">
                    <ActivityHeatmap
                        days={detail.recentSessions.map(
                            (s): ActivityDay =>
                                s.correctCount > 0 && s.durationMs > 0
                                    ? { date: s.startedAt, minutes: s.durationMs / 60000, sessions: 1 }
                                    : { date: s.startedAt, minutes: 0, sessions: 0 },
                        )}
                    />
                </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <div className={cn(cardClass, 'p-5')}>
                    <h2 className={sectionTitleClass}>Speed, last sessions</h2>
                    <div className="mt-3">
                        <WpmBars values={wpmSeries} />
                    </div>
                </div>
                <div className={cn(cardClass, 'p-5')}>
                    <h2 className={sectionTitleClass}>Accuracy, last sessions</h2>
                    <div className="mt-3">
                        <AccChart values={accSeries} />
                    </div>
                </div>
            </div>

            <div className={cn(cardClass, 'p-5')}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className={sectionTitleClass}>Trend &amp; consistency</h2>
                    <span className="text-xs text-muted-foreground">
                        {rangeSessions} session{rangeSessions === 1 ? '' : 's'} in range
                    </span>
                </div>
                <div className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-3">
                    <div className="space-y-2">
                        <p className={eyebrowClass}>Accuracy trend</p>
                        <TrendRow label="direction" slope={summary.accuracyTrend.slope} valid={summary.accuracyTrend.valid} unit="pp" />
                    </div>
                    <div className="space-y-2">
                        <p className={eyebrowClass}>Speed trend</p>
                        <TrendRow label="direction" slope={summary.wpmTrend.slope} valid={summary.wpmTrend.valid} unit="wpm" />
                    </div>
                    <div className="space-y-2">
                        <p className={eyebrowClass}>Consistency</p>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">WPM spread</span>
                            <span
                                className={cn(
                                    'tabular-nums',
                                    summary.wpmVariability === 0
                                        ? 'text-muted-foreground'
                                        : summary.wpmVariability <= 0.2
                                          ? 'text-success'
                                          : summary.wpmVariability <= 0.35
                                            ? 'text-brass'
                                            : 'text-destructive',
                                )}
                            >
                                {summary.wpmVariability === 0 ? '—' : `${(summary.wpmVariability * 100).toFixed(0)}%`}
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {summary.wpmVariability === 0
                                ? 'Unavailable yet.'
                                : summary.wpmVariability <= 0.2
                                  ? 'Steady pace'
                                  : summary.wpmVariability <= 0.35
                                    ? 'Some drift'
                                    : 'Highly varied'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <div className={cn(cardClass, 'p-5 lg:col-span-2')}>
                    <h2 className={sectionTitleClass}>Curriculum levels</h2>
                    <ul className="mt-4 space-y-3">
                        {lessonCountsWithCurriculumTotals(detail.lessonCounts).map((lc) => (
                            <li key={lc.level}>
                                <div className="flex items-baseline justify-between text-sm">
                                    <span className="text-muted-foreground capitalize">{lc.level}</span>
                                    <span className="text-xs text-muted-foreground tabular-nums">
                                        {lc.completed} / {lc.total}
                                    </span>
                                </div>
                                <Progress value={pct(lc.completed, lc.total)} className="mt-1.5" />
                            </li>
                        ))}
                    </ul>
                    {detail.testResults.length > 0 ? (
                        <div className="mt-5 border-t border-border pt-4">
                            <h3 className="text-sm font-medium text-muted-foreground">Timed tests bests</h3>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {Array.from(bestResultByTest(detail.testResults).values()).map((t) => (
                                    <span key={t.id} className={chipClass}>
                                        <span className="tabular-nums">{t.testId}</span>
                                        <span className="text-success tabular-nums">{formatWpm(t.wpm)} wpm</span>
                                        <span className="tabular-nums">{formatAccuracy(t.accuracy)}</span>
                                    </span>
                                ))}
                            </div>
                        </div>
                    ) : null}
                </div>

                <div className="space-y-4">
                    <div className={cn(cardClass, 'p-5')}>
                        <h2 className={cn(sectionTitleClass, 'flex items-center gap-2')}>
                            <Fingerprint className="size-4 text-muted-foreground" />
                            Weak keys
                        </h2>
                        <ul className="mt-3 space-y-2">
                            {detail.weakKeys.slice(0, 6).map((k) => (
                                <li key={k.key} className="flex items-center justify-between text-sm">
                                    <span className="rounded border border-border bg-muted px-2 py-0.5 font-myanmar">{keyIdLabel(k.key)}</span>
                                    <span className="text-muted-foreground tabular-nums">
                                        {k.attempts} tries · {k.accuracy.toFixed(0)}%
                                    </span>
                                </li>
                            ))}
                            {detail.weakKeys.length === 0 ? <li className="text-sm text-muted-foreground">No data yet.</li> : null}
                        </ul>
                        {weakPreview ? (
                            <div className="mt-3 rounded-lg border border-line bg-paper-2/50 p-3">
                                <p className="text-xs text-muted-foreground">
                                    <span className="font-medium text-foreground">{drillGoalLabel(weakPreview.goal)}</span> drill ·
                                    targets {weakPreview.count} ke{weakPreview.count === 1 ? 'y' : 'ys'}
                                    {weakPreview.keys.length > 0 ? (
                                        <span className="font-myanmar"> — {weakPreview.keys.join(' ')}</span>
                                    ) : null}
                                </p>
                                <Button size="sm" variant="default" className="mt-2.5 w-full" onClick={() => navigate('/drill?layout=myanmar')}>
                                    <Sparkles className="size-4" />
                                    Drill your weakest keys
                                </Button>
                            </div>
                        ) : null}
                    </div>
                    <div className={cn(cardClass, 'p-5')}>
                        <h2 className={cn(sectionTitleClass, 'flex items-center gap-2')}>
                            <Fingerprint className="size-4 text-muted-foreground" />
                            Weak fingers
                        </h2>
                        <ul className="mt-3 space-y-2">
                            {detail.weakFingers.slice(0, 6).map((k) => (
                                <li key={k.finger} className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">{k.finger}</span>
                                    <span className="text-muted-foreground tabular-nums">
                                        {k.attempts} tries · {k.accuracy.toFixed(0)}%
                                    </span>
                                </li>
                            ))}
                            {detail.weakFingers.length === 0 ? <li className="text-sm text-muted-foreground">No data yet.</li> : null}
                        </ul>
                    </div>
                </div>
            </div>

            <div className={cn(cardClass, 'overflow-hidden')}>
                <h2 className={cn(sectionTitleClass, 'border-b border-border px-5 py-3 text-base')}>Recent sessions</h2>
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="text-xs tracking-wider text-muted-foreground uppercase">
                            <th className="px-5 py-2 font-normal">When</th>
                            <th className="px-5 py-2 font-normal">Lesson</th>
                            <th className="px-5 py-2 text-right font-normal">WPM</th>
                            <th className="px-5 py-2 text-right font-normal">Acc</th>
                            <th className="px-5 py-2 text-right font-normal">Errors</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sessions.slice(0, 15).map((s) => (
                            <tr key={s.id} className="border-t border-border hover:bg-muted/40">
                                <td className="px-5 py-2 text-muted-foreground">{formatDateTime(s.startedAt)}</td>
                                <td className="px-5 py-2 font-myanmar">{formatLessonLabel(s.lessonId)}</td>
                                <td className="px-5 py-2 text-right tabular-nums">{formatWpm(s.wpm)}</td>
                                <td className="px-5 py-2 text-right tabular-nums">{formatAccuracy(s.accuracy)}</td>
                                <td className="px-5 py-2 text-right text-muted-foreground tabular-nums">{s.errorCount}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

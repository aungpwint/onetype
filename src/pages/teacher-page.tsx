import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { GraduationCap, Users, Clock, Target, Gauge, Trophy, FileText } from 'lucide-react'
import * as backend from '@/services/backend'
import type { StudentDetail, TeacherOverview, TypingTest } from '@/services/types'
import type { LeaderboardEntry } from '@/core/leaderboard/ranking'
import { buildTestRecord } from '@/core/tests/record'
import { Stat, Spinner, PageHeader } from '@/components/ui'
import { Progress } from '@/components/ui/progress'
import { formatDateTime, formatWpm, formatAccuracy, pct } from '@/lib/format'
import { cn, cardClass, appPageClass, sectionTitleClass, eyebrowClass } from '@/lib/utils'

const MEDAL = [
    'bg-linear-to-b from-amber-200 to-amber-500 text-amber-950',
    'bg-linear-to-b from-slate-200 to-slate-400 text-slate-800',
    'bg-linear-to-b from-orange-300 to-orange-600 text-orange-950',
]

export default function TeacherPage() {
    const { studentId } = useParams<{ studentId: string }>()
    const [overview, setOverview] = useState<TeacherOverview | null>(null)
    const [detail, setDetail] = useState<StudentDetail | null>(null)
    const [tests, setTests] = useState<TypingTest[]>([])
    const [boardTestId, setBoardTestId] = useState<string | null>(null)
    const [board, setBoard] = useState<LeaderboardEntry[] | null>(null)

    useEffect(() => {
        void (async () => {
            setOverview(await backend.teacherOverview())
        })()
    }, [])

    useEffect(() => {
        let alive = true
        void backend
            .listTypingTests()
            .then((all) => {
                if (!alive) return
                setTests(all)
                if (all.length > 0) setBoardTestId((current) => current ?? all[0].id)
            })
            .catch(() => undefined)
        return () => {
            alive = false
        }
    }, [])

    useEffect(() => {
        if (!boardTestId) return
        let alive = true
        void backend
            .classLeaderboard(boardTestId)
            .then((entries) => {
                if (alive) setBoard(entries)
            })
            .catch(() => undefined)
        return () => {
            alive = false
        }
    }, [boardTestId])

    useEffect(() => {
        if (!studentId) {
            return
        }
        void (async () => {
            setDetail(await backend.studentDetail(studentId))
        })()
    }, [studentId])

    const boardTest = useMemo(() => (boardTestId ? tests.find((t) => t.id === boardTestId) ?? null : null), [tests, boardTestId])

    if (!overview)
        return (
            <div className="flex min-h-0 flex-1 items-center justify-center">
                <Spinner label="Opening the teacher's desk…" />
            </div>
        )

    return (
        <div className={appPageClass}>
            <PageHeader
                eyebrow="Teacher's desk"
                title="Overview"
                subtitle="A roll of every learner on this machine. Accuracy and WPM are rolling averages across their saved sessions."
            />

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Stat icon={<Users className="size-4" />} label="Learners" value={overview.studentCount} />
                <Stat icon={<Clock className="size-4" />} label="Total minutes" value={overview.totalMinutes.toFixed(0)} />
                <Stat icon={<Target className="size-4" />} label="Avg accuracy" value={`${overview.avgAccuracy.toFixed(1)}%`} />
                <Stat icon={<Gauge className="size-4" />} label="Avg WPM" value={overview.avgWpm ? Math.round(overview.avgWpm) : '—'} />
            </div>

            <div className={cn(cardClass, 'overflow-hidden')}>
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="text-xs tracking-wider text-muted-foreground uppercase">
                            <th className="px-5 py-2 font-normal">Learner</th>
                            <th className="px-5 py-2 font-normal">At</th>
                            <th className="px-5 py-2 text-right font-normal">WPM</th>
                            <th className="px-5 py-2 text-right font-normal">Acc</th>
                            <th className="px-5 py-2 text-right font-normal">Min</th>
                            <th className="px-5 py-2 text-right font-normal">Progress</th>
                            <th className="px-5 py-2 text-right font-normal">Last</th>
                        </tr>
                    </thead>
                    <tbody>
                        {overview.students.map((s) => (
                            <tr key={s.student.id} className="border-t border-border transition-colors hover:bg-muted/40">
                                <td className="px-5 py-2.5">
                                    <a
                                        className="rounded font-medium text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                        href={`#/teacher/${s.student.id}`}
                                    >
                                        {s.student.displayName}
                                    </a>
                                    <span className="block font-myanmar text-xs text-muted-foreground">{s.student.studentCode}</span>
                                </td>
                                <td className="px-5 py-2.5 text-muted-foreground capitalize">{s.level ?? '—'}</td>
                                <td className="px-5 py-2.5 text-right tabular-nums">{formatWpm(s.wpm)}</td>
                                <td className="px-5 py-2.5 text-right tabular-nums">{formatAccuracy(s.accuracy)}</td>
                                <td className="px-5 py-2.5 text-right tabular-nums">{s.totalMinutes.toFixed(0)}</td>
                                <td className="px-5 py-2.5">
                                    <div className="flex items-center gap-2">
                                        <Progress value={pct(s.progress, 1)} className="w-28" />
                                        <span className="text-xs text-muted-foreground tabular-nums">{Math.round(s.progress * 100)}%</span>
                                    </div>
                                </td>
                                <td className="px-5 py-2.5 text-right text-muted-foreground">
                                    {s.lastPracticedAt ? formatDateTime(s.lastPracticedAt) : '—'}
                                </td>
                            </tr>
                        ))}
                        {overview.students.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-5 py-8 text-center text-sm text-muted-foreground">
                                    No learners yet — add one from the Learners page.
                                </td>
                            </tr>
                        ) : null}
                    </tbody>
                </table>
            </div>

            <section className={cn(cardClass, 'overflow-hidden')}>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-paper-2/30 px-5 py-3">
                    <h2 className={cn(sectionTitleClass, 'flex items-center gap-2')}>
                        <Trophy className="size-4 text-muted-foreground" />
                        Class leaderboard
                    </h2>
                    <select
                        value={boardTestId ?? ''}
                        onChange={(e) => setBoardTestId(e.target.value || null)}
                        className="rounded-md border border-line bg-background px-2 py-1 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        aria-label="Leaderboard paper"
                    >
                        {tests.map((t) => (
                            <option key={t.id} value={t.id}>
                                {t.code} · {t.name} ({t.durationSeconds}s)
                            </option>
                        ))}
                    </select>
                </div>

                {boardTest && (board === null ? (
                    <div className="px-5 py-10 text-center text-sm text-muted-foreground">
                        <Spinner label="Ranking the class…" />
                    </div>
                ) : board.length === 0 ? (
                    <p className="px-5 py-10 text-center text-sm text-muted-foreground">
                        No learner has run <span className="font-medium text-foreground">{boardTest.name}</span> yet — results will
                        land here ranked by best run.
                    </p>
                ) : (
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="text-xs tracking-wider text-muted-foreground uppercase">
                                <th className="px-5 py-2 font-normal">Rank</th>
                                <th className="px-5 py-2 font-normal">Learner</th>
                                <th className="px-5 py-2 text-right font-normal">Best</th>
                                <th className="px-5 py-2 text-right font-normal">Acc</th>
                                <th className="px-5 py-2 text-right font-normal">Passed</th>
                                <th className="hidden px-5 py-2 text-right font-normal sm:table-cell">When</th>
                            </tr>
                        </thead>
                        <tbody>
                            {board.map((e) => (
                                <tr key={e.studentId} className="border-t border-border transition-colors hover:bg-muted/40">
                                    <td className="px-5 py-2.5">
                                        <span
                                            className={cn(
                                                'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums',
                                                e.rank <= 3 && e.rank >= 1 ? MEDAL[e.rank - 1] : 'border border-line bg-muted/40 text-muted-foreground',
                                            )}
                                        >
                                            {e.rank}
                                        </span>
                                    </td>
                                    <td className="px-5 py-2.5">
                                        <a
                                            className="rounded font-medium text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                            href={`#/teacher/${e.studentId}`}
                                        >
                                            {e.name}
                                        </a>
                                    </td>
                                    <td className="px-5 py-2.5 text-right font-display font-semibold tabular-nums">{formatWpm(e.bestWpm)}</td>
                                    <td className="px-5 py-2.5 text-right tabular-nums">{formatAccuracy(e.bestAccuracy)}</td>
                                    <td className="px-5 py-2.5 text-right tabular-nums">
                                        <span className={e.passed ? 'text-success' : 'text-muted-foreground'}>
                                            {e.passedAttempts}/{e.attempts}
                                        </span>
                                    </td>
                                    <td className="hidden px-5 py-2.5 text-right text-muted-foreground tabular-nums sm:table-cell">
                                        {formatDateTime(e.scoredOn)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ))}
            </section>

            {detail ? (
                <div className={cn(cardClass, 'p-5')}>
                    <h2 className={sectionTitleClass}>
                        Detail — {detail.student.displayName}{' '}
                        <span className="font-myanmar text-sm font-normal text-muted-foreground">{detail.student.studentCode}</span>
                    </h2>
                    <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <Stat icon={<Gauge className="size-4" />} label="Avg WPM" value={Math.round(detail.overallWpm)} />
                        <Stat icon={<Target className="size-4" />} label="Avg accuracy" value={`${detail.overallAccuracy.toFixed(1)}%`} />
                        <Stat icon={<Clock className="size-4" />} label="Minutes" value={detail.totalMinutes.toFixed(0)} />
                        <Stat icon={<GraduationCap className="size-4" />} label="Sessions" value={detail.totalSessions} />
                    </div>
                    <div className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                        {detail.lessonCounts.map((lc) => (
                            <div key={lc.level} className="flex items-center gap-2">
                                <span className="w-32 capitalize">{lc.level}</span>
                                <Progress value={pct(lc.completed, lc.total)} className="flex-1" />
                                <span className="text-xs tabular-nums">
                                    {lc.completed}/{lc.total}
                                </span>
                            </div>
                        ))}
                    </div>

                    {(() => {
                        const record = buildTestRecord(detail.testResults, tests)
                        if (record.length === 0) {
                            return (
                                <p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
                                    <FileText className="size-3.5" />
                                    No timed-test results yet.
                                </p>
                            )
                        }
                        return (
                            <div className="mt-5">
                                <p className={cn(eyebrowClass, 'flex items-center gap-1.5')}>
                                    <FileText className="size-3.5" />
                                    Timed test record
                                </p>
                                <ul className="mt-2 space-y-1.5 text-sm">
                                    {record.map((e) => (
                                        <li key={e.testId} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                            <span className="rounded border border-line bg-muted/40 px-1.5 font-mono text-xs tabular-nums">
                                                {e.code}
                                            </span>
                                            <span className="text-muted-foreground">{e.name}</span>
                                            <span className="ml-auto text-right tabular-nums">
                                                <span className="font-display font-semibold">{formatWpm(e.bestWpm)}</span>
                                                <span className="text-xs text-muted-foreground"> · {formatAccuracy(e.bestAccuracy)}</span>
                                            </span>
                                            <span className={e.passed ? 'text-xs font-medium text-success' : 'text-xs text-muted-foreground'}>
                                                {e.passed ? `passed · ${e.attempts} run${e.attempts === 1 ? '' : 's'}` : `not yet · ${e.attempts} run${e.attempts === 1 ? '' : 's'}`}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )
                    })()}
                </div>
            ) : (
                <p className="text-center text-xs text-muted-foreground">Select a learner above to see their detail.</p>
            )}
        </div>
    )
}

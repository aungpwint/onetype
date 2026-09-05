import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Flame, Trophy, Timer, Target, Gauge, BookOpen, BarChart3 } from 'lucide-react'
import { useStudentStore } from '@/stores/student-store'
import { useLessonStore } from '@/stores/lesson-store'
import { useSettingsStore } from '@/stores/settings-store'
import { useProgressionStore } from '@/stores/progression-store'
import * as backend from '@/services/backend'
import type { TestResult, TypingSession, TypingTest } from '@/services/types'
import { ACHIEVEMENT_CATALOG } from '@/data/achievements'
import { Spinner, Stat, PageHeader } from '@/components/ui'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { WpmBars } from '@/components/wpm-bars'
import { formatDuration, formatWpm, formatAccuracy, formatLessonLabel, pct, bestResultByTest } from '@/lib/format'
import { cn, cardClass, appPageClass, eyebrowClass, kbdClass, chipClass, sectionTitleClass, highlightClass } from '@/lib/utils'

function hourGreeting(): string {
    const h = new Date().getHours()
    if (h < 5) return 'Late night practice'
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    if (h < 21) return 'Good evening'
    return 'Night practice'
}

export default function Dashboard() {
    const active = useStudentStore((s) => s.active)
    const progress = useLessonStore((s) => s.progress)
    const progressStudentId = useLessonStore((s) => s.progressStudentId)
    const loadProgress = useLessonStore((s) => s.loadProgress)
    const lessonsByLevel = useLessonStore((s) => s.lessonsByLevel)
    const defaultLang = useSettingsStore((s) => s.get('app.language'))
    const streak = useProgressionStore((s) => s.streak)
    const unlocked = useProgressionStore((s) => s.unlocked)
    const summary = useProgressionStore((s) => s.summary)
    const loadProgression = useProgressionStore((s) => s.load)

    const [sessions, setSessions] = useState<TypingSession[] | null>(null)
    const [tests, setTests] = useState<TypingTest[]>([])
    const [testResults, setTestResults] = useState<Map<string, TestResult>>(new Map())

    useEffect(() => {
        if (!active) return
        void loadProgress(active.id)
        void loadProgression(active.id)
        void (async () => {
            setSessions(await backend.listTypingSessions(active.id, 30))
        })()
        void (async () => {
            const [all, results] = await Promise.all([backend.listTypingTests(), backend.listTestResults(active.id)])
            setTests(all)
            setTestResults(bestResultByTest(results))
        })()
    }, [active, loadProgress, loadProgression])

    const stats = useMemo(() => {
        const rows = sessions ?? []
        const withKeys = rows.filter((s) => s.correctCount > 0)
        const avgWpm = withKeys.length ? withKeys.reduce((sum, s) => sum + s.wpm, 0) / withKeys.length : 0
        const avgAcc = withKeys.length ? withKeys.reduce((sum, s) => sum + s.accuracy, 0) / withKeys.length : 0
        const completed = progress ? Object.values(progress).filter((p) => p.completed).length : 0
        const passedTests = testResults.size
        const bestWpm = withKeys.length ? Math.max(...withKeys.map((s) => s.wpm)) : 0
        return { avgWpm, avgAcc, completed, passedTests, totalSessions: rows.length, bestWpm }
    }, [sessions, progress, testResults])

    const languageStats = useMemo(() => {
        const rows = (sessions ?? []).filter((s) => s.correctCount > 0)
        const byLang: Record<string, { sessions: number; wpmSum: number; minutes: number }> = {}
        for (const s of rows) {
            const lang = s.lessonId?.startsWith('lesson-my-') ? 'myanmar' : s.lessonId?.startsWith('lesson-en-') ? 'english' : 'mixed'
            const cur = (byLang[lang] ??= { sessions: 0, wpmSum: 0, minutes: 0 })
            cur.sessions += 1
            cur.wpmSum += s.wpm
            cur.minutes += s.durationMs / 60000
        }
        return Object.entries(byLang).map(([lang, v]) => ({
            lang,
            sessions: v.sessions,
            avgWpm: v.sessions ? Math.round(v.wpmSum / v.sessions) : 0,
            minutes: Math.round(v.minutes),
        }))
    }, [sessions])

    const unlockedById = useMemo(() => new Set(unlocked.map((u) => u.achievementId)), [unlocked])

    const nextLesson = useMemo(() => {
        if (!progress) return null
        for (const level of ['beginner', 'intermediate', 'advanced'] as const) {
            const ordered = lessonsByLevel[level]
                .filter((l) => l.language === (defaultLang === 'myanmar' ? 'myanmar' : 'english'))
                .sort((a, b) => a.number - b.number)
            const first = ordered.find((l) => !progress[l.id]?.completed)
            if (first) return first
        }
        return null
    }, [progress, lessonsByLevel, defaultLang])

    if (!active) return null
    const progressLoaded = progressStudentId === active.id && (progress ?? false)

    return (
        <div className={appPageClass}>
            <PageHeader
                eyebrow={hourGreeting()}
                title={
                    <>
                        {active.displayName} <span className="font-myanmar text-muted-foreground">မင်္ဂလာပါ</span>
                    </>
                }
                subtitle={
                    <>
                        Keep your hands on home row — <span className={kbdClass}>F</span> and <span className={kbdClass}>J</span> are your anchor
                        nubs.
                    </>
                }
            >
                <Button variant="outline" asChild>
                    <Link to="/progress">
                        View full progress
                        <ArrowRight className="size-4" />
                    </Link>
                </Button>
            </PageHeader>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Stat icon={<Gauge className="size-4" />} label="Avg WPM" value={stats.avgWpm ? Math.round(stats.avgWpm) : '—'} />
                <Stat icon={<Target className="size-4" />} label="Avg accuracy" value={stats.avgAcc ? `${stats.avgAcc.toFixed(1)}%` : '—'} />
                <Stat icon={<BookOpen className="size-4" />} label="Lessons passed" value={progressLoaded ? stats.completed : '…'} />
                <Stat icon={<Timer className="size-4" />} label="Tests passed" value={tests.length ? stats.passedTests : '…'} />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <Link
                    to={nextLesson ? `/lesson/${nextLesson.id}` : '/learn'}
                    className={cn(
                        highlightClass,
                        'group p-5 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                    )}
                >
                    <p className={eyebrowClass}>Continue learning</p>
                    <div className="mt-3 flex items-center justify-between">
                        <span className="font-display font-myanmar text-xl leading-tight">
                            {nextLesson ? nextLesson.title : 'Curriculum finished'}
                        </span>
                        <ArrowRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {nextLesson ? `Level ${nextLesson.level} · line ${nextLesson.number}` : 'Every line passed. Try a timed test.'}
                    </p>
                </Link>

                <div className={cn(cardClass, 'p-5')}>
                    <p className={cn(eyebrowClass, 'flex items-center gap-1.5')}>
                        <Flame className="size-3.5 text-brass" />
                        Streak
                    </p>
                    <div className="mt-3 flex items-baseline gap-2">
                        <span className="font-display text-4xl tabular-nums">{streak?.current ?? '•'}</span>
                        <span className="text-sm text-muted-foreground">days{streak?.current === 1 ? '' : 's'}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                        {streak && streak.longest > 0 ? `Longest streak: ${streak.longest} days` : 'Type daily to build a streak.'}
                    </p>
                </div>

                <div className={cn(cardClass, 'p-5')}>
                    <p className={cn(eyebrowClass, 'flex items-center gap-1.5')}>
                        <Trophy className="size-3.5 text-brass" />
                        Personal bests
                    </p>
                    <dl className="mt-3 space-y-1.5 text-sm">
                        <div className="flex justify-between">
                            <dt className="text-muted-foreground">Fastest WPM</dt>
                            <dd className="tabular-nums">{stats.bestWpm ? Math.round(stats.bestWpm) : '—'}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-muted-foreground">Typing time</dt>
                            <dd className="tabular-nums">{summary ? formatDuration(summary.totalMinutes * 60000) : '—'}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-muted-foreground">Sessions</dt>
                            <dd className="tabular-nums">{summary?.sessions ?? '—'}</dd>
                        </div>
                    </dl>
                </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <div className={cn(cardClass, 'overflow-hidden')}>
                    <div className="flex items-center justify-between border-b border-border px-5 py-3">
                        <h2 className={sectionTitleClass}>Speed, recent sessions</h2>
                        <Link to="/progress" className="text-sm font-medium text-accent hover:underline">
                            Chart
                            <ArrowRight className="ml-1 inline size-3.5" />
                        </Link>
                    </div>
                    <div className="p-5">
                        <WpmBars
                            values={(sessions ?? [])
                                .filter((s) => s.correctCount > 0)
                                .map((s) => s.wpm)
                                .slice(0, 24)}
                        />
                    </div>
                </div>

                <div className={cn(cardClass, 'p-5')}>
                    <h2 className={sectionTitleClass}>Achievements</h2>
                    <div className="mt-3 flex flex-wrap gap-2">
                        {Object.entries(ACHIEVEMENT_CATALOG).map(([id, def]) => {
                            const earned = unlockedById.has(id)
                            return (
                                <span
                                    key={id}
                                    title={earned ? `${def.title} — ${def.description}` : `Locked — ${def.description}`}
                                    className={cn(
                                        'flex h-10 w-10 items-center justify-center rounded-lg border text-lg transition-all',
                                        earned ? 'border-transparent' : 'opacity-35 grayscale',
                                    )}
                                    style={earned ? { background: `${def.color}22`, borderColor: `${def.color}66` } : undefined}
                                >
                                    <span aria-hidden>{def.icon}</span>
                                    <span className="sr-only">{earned ? `${def.title} unlocked` : def.title}</span>
                                </span>
                            )
                        })}
                    </div>
                </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <div className={cn(cardClass, 'p-5 lg:col-span-2')}>
                    <p className={eyebrowClass}>Level progress</p>
                    <ul className="mt-3 space-y-2">
                        {(['beginner', 'intermediate', 'advanced'] as const).map((level) => {
                            const list = lessonsByLevel[level]
                            const langList = list.filter((l) => l.language === 'myanmar' && l.level === level)
                            const done = langList.filter((l) => progress?.[l.id]?.completed).length
                            const total = langList.length
                            return (
                                <li key={level} className="flex items-center gap-3 text-sm">
                                    <span className="w-28 shrink-0 text-muted-foreground capitalize">{level}</span>
                                    <Progress value={pct(done, total)} className="flex-1" />
                                    <span className="w-10 text-right text-xs text-muted-foreground tabular-nums">
                                        {done}/{total}
                                    </span>
                                </li>
                            )
                        })}
                    </ul>

                    <div className="mt-5 border-t border-border pt-4">
                        <p className={eyebrowClass}>By language</p>
                        <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                            {languageStats.length === 0 ? (
                                <li className="text-sm text-muted-foreground">No completed sessions yet.</li>
                            ) : (
                                languageStats.map((l) => (
                                    <li key={l.lang} className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground capitalize">
                                            {l.lang === 'mixed' ? 'Mixed' : l.lang === 'myanmar' ? 'Myanmar' : 'English'}
                                        </span>
                                        <span className="text-muted-foreground tabular-nums">
                                            {l.sessions} runs · {l.avgWpm} wpm
                                        </span>
                                    </li>
                                ))
                            )}
                        </ul>
                    </div>
                </div>

                <div className={cn(cardClass, 'p-5')}>
                    <p className={cn(eyebrowClass, 'flex items-center gap-1.5')}>
                        <Timer className="size-3.5" />
                        Timed tests
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                        {tests.map((test) => {
                            const best = testResults.get(test.id)
                            return (
                                <Link
                                    key={test.id}
                                    to={`/test/${test.id}`}
                                    className={cn(chipClass, 'transition-colors hover:border-border hover:text-foreground')}
                                >
                                    <span className="tabular-nums">{test.code}</span>
                                    <span className="text-muted-foreground">·</span>
                                    {best ? <span className="text-success tabular-nums">{formatWpm(best.wpm)} wpm</span> : 'new'}
                                </Link>
                            )
                        })}
                    </div>
                    {tests.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No timed tests seeded yet.</p> : null}
                </div>
            </div>

            <div className={cn(cardClass, 'overflow-hidden')}>
                <div className="flex items-center justify-between border-b border-border px-5 py-3">
                    <h2 className={cn(sectionTitleClass, 'flex items-center gap-2')}>
                        <BarChart3 className="size-4 text-muted-foreground" />
                        Recent sessions
                    </h2>
                    <Link to="/progress" className="text-sm font-medium text-accent hover:underline">
                        Chart
                        <ArrowRight className="ml-1 inline size-3.5" />
                    </Link>
                </div>
                {sessions ? (
                    sessions.length === 0 ? (
                        <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                            Nothing typed yet —{' '}
                            <Link to="/learn" className="font-medium text-accent hover:underline">
                                open a lesson
                            </Link>
                            .
                        </p>
                    ) : (
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="text-xs tracking-wider text-muted-foreground uppercase">
                                    <th className="px-5 py-2 font-normal">When</th>
                                    <th className="px-5 py-2 font-normal">Lesson</th>
                                    <th className="px-5 py-2 text-right font-normal">WPM</th>
                                    <th className="px-5 py-2 text-right font-normal">Acc</th>
                                    <th className="hidden px-5 py-2 text-right font-normal sm:table-cell">Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sessions.slice(0, 12).map((s) => (
                                    <tr key={s.id} className="border-t border-border transition-colors hover:bg-muted/40">
                                        <td className="px-5 py-2 text-muted-foreground">
                                            {new Date(s.startedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td className="px-5 py-2 font-myanmar">{formatLessonLabel(s.lessonId)}</td>
                                        <td className="px-5 py-2 text-right tabular-nums">{formatWpm(s.wpm)}</td>
                                        <td className="px-5 py-2 text-right tabular-nums">{formatAccuracy(s.accuracy)}</td>
                                        <td className="hidden px-5 py-2 text-right text-muted-foreground tabular-nums sm:table-cell">
                                            {formatDuration(s.durationMs)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )
                ) : (
                    <Spinner />
                )}
            </div>
        </div>
    )
}

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BarChart3, BookOpen, CalendarDays, Flame, Gauge, Target, Timer, Trophy } from 'lucide-react'
import { useStudentStore } from '@/stores/student-store'
import { useLessonStore } from '@/stores/lesson-store'
import { useSettingsStore } from '@/stores/settings-store'
import { useProgressionStore } from '@/stores/progression-store'
import * as backend from '@/services/backend'
import type { TestResult, TypingSession, TypingTest } from '@/services/types'
import { ACHIEVEMENT_CATALOG } from '@/data/achievements'
import { containsMyanmar } from '@/core/unicode/myanmar'
import { dailyGoalState } from '@/core/goals/daily-goal'
import { buildWeekBars } from '@/core/progress/weekly'
import { StatCard, Spinner } from '@/components/ui'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { WpmBars } from '@/components/wpm-bars'
import { formatDuration, formatWpm, formatAccuracy, formatLessonLabel, pct, bestResultByTest } from '@/lib/format'
import { cn, cardClass, appPageClass, eyebrowClass, kbdClass, chipClass, sectionTitleClass, pageTitleClass, featuredClass } from '@/lib/utils'

function hourGreeting(): string {
    const h = new Date().getHours()
    if (h < 5) return 'Late night practice'
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    if (h < 21) return 'Good evening'
    return 'Night practice'
}

function GoalRing({ minutes, goalMinutes }: { minutes: number; goalMinutes: number }) {
    const goal = dailyGoalState(minutes, goalMinutes)
    const r = 24
    const c = 2 * Math.PI * r
    const color = goal.completed ? 'var(--success)' : 'var(--accent)'
    return (
        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
            <svg viewBox="0 0 64 64" className="size-16 -rotate-90" role="img" aria-label={`Today's goal: ${goal.percent}% complete`}>
                <circle cx="32" cy="32" r={r} fill="none" stroke="var(--line)" strokeWidth="5" />
                <circle
                    cx="32"
                    cy="32"
                    r={r}
                    fill="none"
                    stroke={color}
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={c}
                    strokeDashoffset={c * (1 - goal.fraction)}
                    style={{ transition: 'stroke-dashoffset 0.4s ease, stroke 0.3s ease' }}
                />
            </svg>
            <span className={cn('absolute text-sm font-semibold tabular-nums', goal.completed && 'text-success')}>{goal.percent}%</span>
        </div>
    )
}

export default function Dashboard() {
    const active = useStudentStore((s) => s.active)
    const progress = useLessonStore((s) => s.progress)
    const progressStudentId = useLessonStore((s) => s.progressStudentId)
    const loadProgress = useLessonStore((s) => s.loadProgress)
    const lessonsByLevel = useLessonStore((s) => s.lessonsByLevel)
    const catalogLoaded = useLessonStore((s) => s.catalogLoaded)
    const loadCatalog = useLessonStore((s) => s.loadCatalog)
    const defaultLang = useSettingsStore((s) => s.get('app.language'))
    const dailyGoalMinutes = useSettingsStore((s) => Math.max(0, s.getNumber('dashboard.dailyGoalMinutes', 0)))
    const streak = useProgressionStore((s) => s.streak)
    const unlocked = useProgressionStore((s) => s.unlocked)
    const summary = useProgressionStore((s) => s.summary)
    const loadProgression = useProgressionStore((s) => s.load)

    const [sessions, setSessions] = useState<TypingSession[] | null>(null)
    const [tests, setTests] = useState<TypingTest[]>([])
    const [testResults, setTestResults] = useState<Map<string, TestResult>>(new Map())
    const [todayMinutes, setTodayMinutes] = useState<number | null>(null)
    const [weekMinutes, setWeekMinutes] = useState<number[] | null>(null)

    const todayStart = useMemo(() => {
        const d = new Date()
        d.setHours(0, 0, 0, 0)
        return d.getTime()
    }, [])
    const DAY_MS = 86_400_000

    useEffect(() => {
        void loadCatalog()
    }, [loadCatalog])

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
        void (async () => {
            const buckets = await Promise.all(
                [0, 1, 2, 3, 4, 5, 6].map((o) => backend.minutesInWindow(active.id, todayStart - o * DAY_MS, todayStart - (o - 1) * DAY_MS)),
            )
            setTodayMinutes(buckets[0])
            setWeekMinutes(buckets.slice().reverse())
        })()
    }, [active, loadProgress, loadProgression, todayStart])

    const stats = useMemo(() => {
        const rows = sessions ?? []
        const withKeys = rows.filter((s) => s.correctCount > 0)
        const avgWpm = withKeys.length ? withKeys.reduce((sum, s) => sum + s.wpm, 0) / withKeys.length : 0
        const avgAcc = withKeys.length ? withKeys.reduce((sum, s) => sum + s.accuracy, 0) / withKeys.length : 0
        const completed = progress ? Object.values(progress).filter((p) => p.completed).length : 0
        const passedTests = testResults.size
        const bestWpm = withKeys.length ? Math.max(...withKeys.map((s) => s.wpm)) : 0
        const bestAcc = withKeys.length ? Math.max(...withKeys.map((s) => s.accuracy)) : 0
        return { avgWpm, avgAcc, completed, passedTests, totalSessions: rows.length, bestWpm, bestAcc }
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
    if (!catalogLoaded) {
        return (
            <div className={cn(appPageClass, 'h-full')}>
                <div className="flex min-h-0 flex-1 items-center justify-center">
                    <Spinner label="Loading curriculum…" />
                </div>
            </div>
        )
    }
    const progressLoaded = progressStudentId === active.id && (progress ?? false)
    const continueTitle = nextLesson ? nextLesson.title : 'Curriculum finished'

    return (
        <div className={appPageClass}>
            <section className="relative isolate overflow-hidden sm:px-8 sm:py-8">
                <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                    <div className="min-w-0">
                        <p className={eyebrowClass}>{hourGreeting()}</p>
                        <h1 className={cn(pageTitleClass, 'mt-1.5')}>
                            {active.displayName}{' '}
                            <span className="align-middle font-myanmar text-xl leading-none text-muted-foreground">မင်္ဂလာပါ</span>
                        </h1>
                        <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                            Keep your hands on home row — <span className={kbdClass}>F</span> and <span className={kbdClass}>J</span> are your anchor
                            nubs.
                        </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                        <Button variant="outline" asChild>
                            <Link to="/progress">
                                <BarChart3 className="size-4" />
                                View full progress
                                <ArrowRight className="size-4" />
                            </Link>
                        </Button>
                    </div>
                </div>
            </section>

            <div className="scale-rule" aria-hidden />

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard
                    size="lg"
                    icon={<Gauge className="size-4" />}
                    label="Avg WPM"
                    value={stats.avgWpm ? Math.round(stats.avgWpm) : '—'}
                    hint={stats.bestWpm ? `Best ${Math.round(stats.bestWpm)} wpm` : 'No speed data yet'}
                />
                <StatCard
                    size="lg"
                    icon={<Target className="size-4" />}
                    label="Avg accuracy"
                    value={stats.avgAcc ? `${stats.avgAcc.toFixed(1)}%` : '—'}
                    hint={stats.bestAcc ? `Best ${stats.bestAcc.toFixed(0)}%` : 'Accuracy tracks every run'}
                />
                <StatCard
                    size="lg"
                    icon={<BookOpen className="size-4" />}
                    label="Lessons passed"
                    value={progressLoaded ? stats.completed : '…'}
                    hint="Across the whole curriculum"
                />
                <StatCard
                    size="lg"
                    icon={<Trophy className="size-4" />}
                    label="Tests passed"
                    value={tests.length ? stats.passedTests : '…'}
                    hint={tests.length ? `${tests.length} timed tests seeded` : 'No timed tests yet'}
                />
            </div>

            <div className={cn(cardClass, 'p-5')}>
                <div className="flex items-center justify-between">
                    <h2 className={cn(sectionTitleClass, 'flex items-center gap-2')}>
                        <CalendarDays className="size-4 text-muted-foreground" />
                        This week
                    </h2>
                    <span className="text-xs text-muted-foreground tabular-nums">
                        {weekMinutes ? `${Math.round(weekMinutes.reduce((sum, m) => sum + m, 0))} min typed` : '…'}
                    </span>
                </div>
                <div className="mt-3 scale-rule" aria-hidden />
                {weekMinutes ? (
                    <div
                        className="mt-2 flex h-24 items-end gap-2"
                        role="img"
                        aria-label="Minutes typed per day over the last seven days"
                    >
                        {buildWeekBars(weekMinutes, todayStart).map((b) => (
                            <div key={b.offset} className="group relative flex flex-1 flex-col items-center gap-1">
                                <span
                                    className={cn(
                                        'text-[0.6875rem] leading-none text-muted-foreground tabular-nums opacity-0 transition-opacity duration-150 group-hover:opacity-100',
                                        b.isToday && 'opacity-100',
                                    )}
                                >
                                    {b.minutes >= 1 ? `${Math.round(b.minutes)}m` : ''}
                                </span>
                                <div
                                    className={cn(
                                        'w-full rounded-t-md transition-colors',
                                        b.isToday ? 'bg-accent' : 'bg-accent/25 group-hover:bg-accent/40',
                                    )}
                                    style={{ height: `${Math.max(b.fraction * 64, b.minutes > 0 ? 4 : 2)}px` }}
                                />
                                <span className={cn('text-[0.6875rem] leading-none text-muted-foreground', b.isToday && 'font-semibold text-accent')}>
                                    {b.label}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="mt-4 flex h-24 items-center justify-center">
                        <Spinner label="Loading your week…" />
                    </div>
                )}
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <Link
                    to={nextLesson ? `/lesson/${nextLesson.id}` : '/learn'}
                    className={cn(
                        featuredClass,
                        'group p-6 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:border-[color-mix(in_srgb,var(--primary)_40%,transparent)] hover:shadow-(--shadow-3) focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                    )}
                >
                    <div aria-hidden className="pointer-events-none absolute inset-0">
                        <div className="absolute -top-24 -right-20 h-64 w-64 rounded-full bg-[color-mix(in_srgb,var(--primary)_9%,transparent)] blur-[100px]" />
                        <div className="absolute inset-0 bg-linear-to-br from-[color-mix(in_srgb,var(--primary)_7%,transparent)] via-transparent to-transparent" />
                    </div>
                    <div className="relative z-10 flex h-full flex-col">
                        <p className={eyebrowClass}>Next lesson</p>
                        <div className="mt-3 flex items-center justify-between gap-4">
                            <span
                                className={cn(
                                    'font-display text-xl leading-tight font-semibold tracking-[-0.01em] text-ink',
                                    containsMyanmar(continueTitle) ? 'font-myanmar' : '',
                                )}
                            >
                                {continueTitle}
                            </span>
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line-strong bg-card text-ink-soft transition-[transform,background-color,color] duration-300 group-hover:translate-x-0.5 group-hover:bg-primary group-hover:text-white">
                                <ArrowRight className="size-4" />
                            </span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {nextLesson ? `Level ${nextLesson.level} · line ${nextLesson.number}` : 'Every line passed. Try a timed test.'}
                        </p>
                    </div>
                </Link>

                <div
                    className={cn(
                        cardClass,
                        'group relative overflow-hidden p-5 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:border-line-strong hover:shadow-(--shadow-3)',
                    )}
                >
                    <span
                        aria-hidden
                        className="pointer-events-none absolute inset-0 bg-linear-to-b from-warning/[0.07] via-transparent to-transparent"
                    />
                    <div className="relative">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className={cn(eyebrowClass, 'flex items-center gap-1.5')}>
                                    <Flame className="size-3.5 text-warning" />
                                    Streak
                                </p>
                                <div className="mt-3 flex items-baseline gap-2">
                                    <span className="text-5xl leading-none font-semibold tracking-tight tabular-nums">
                                        {streak?.current ?? '•'}
                                    </span>
                                    <span className="text-sm text-muted-foreground">day{streak?.current === 1 ? '' : 's'}</span>
                                </div>
                                <p className="mt-2 text-xs text-muted-foreground">
                                    {streak && streak.longest > 0 ? `Longest streak: ${streak.longest} days` : 'Type daily to build a streak.'}
                                </p>
                            </div>
                            {dailyGoalMinutes > 0 ? (
                                <div className="flex flex-col items-center gap-1">
                                    <GoalRing minutes={todayMinutes ?? 0} goalMinutes={dailyGoalMinutes} />
                                    <span className="text-[0.6875rem] leading-none text-muted-foreground tabular-nums">
                                        {todayMinutes === null ? '…' : `${Math.round(todayMinutes)}/${dailyGoalMinutes} min today`}
                                    </span>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>

                <div
                    className={cn(
                        cardClass,
                        'group relative overflow-hidden p-5 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:border-line-strong hover:shadow-(--shadow-3)',
                    )}
                >
                    <span
                        aria-hidden
                        className="pointer-events-none absolute inset-0 bg-linear-to-b from-surface-elevated/60 to-transparent opacity-80"
                    />
                    <p className={cn(eyebrowClass, 'relative flex items-center gap-1.5')}>
                        <Trophy className="size-3.5 text-warning" />
                        Personal bests
                    </p>
                    <dl className="relative mt-3">
                        <div className="flex items-center justify-between border-b border-line/60 py-2 text-sm">
                            <dt className="text-muted-foreground">Fastest WPM</dt>
                            <dd className="font-semibold tabular-nums">{stats.bestWpm ? Math.round(stats.bestWpm) : '—'}</dd>
                        </div>
                        <div className="flex items-center justify-between border-b border-line/60 py-2 text-sm">
                            <dt className="text-muted-foreground">Typing time</dt>
                            <dd className="font-semibold tabular-nums">
                                {summary ? formatDuration(summary.totalMinutes * 60000) : '—'}
                            </dd>
                        </div>
                        <div className="flex items-center justify-between py-2 text-sm">
                            <dt className="text-muted-foreground">Sessions</dt>
                            <dd className="font-semibold tabular-nums">{summary?.sessions ?? '—'}</dd>
                        </div>
                    </dl>
                </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <div className={cn(cardClass, 'overflow-hidden')}>
                    <div className="flex items-center justify-between border-b border-border bg-paper-2/30 px-5 py-3">
                        <h2 className={cn(sectionTitleClass, 'flex items-center gap-2')}>
                            <BarChart3 className="size-4 text-muted-foreground" />
                            Speed, recent sessions
                        </h2>
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
                    <div className="flex items-center justify-between">
                        <h2 className={cn(sectionTitleClass, 'flex items-center gap-2')}>
                            <Trophy className="size-4 text-muted-foreground" />
                            Achievements
                        </h2>
                        <span className="text-xs text-muted-foreground tabular-nums">
                            {unlocked.length}/{Object.keys(ACHIEVEMENT_CATALOG).length}
                        </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                        {Object.entries(ACHIEVEMENT_CATALOG).map(([id, def]) => {
                            const earned = unlockedById.has(id)
                            return (
                                <span
                                    key={id}
                                    title={earned ? `${def.title} — ${def.description}` : `Locked — ${def.description}`}
                                    className={cn(
                                        'flex h-10 w-10 items-center justify-center rounded-xl border text-lg shadow-[0_1px_0_var(--line-strong)] transition-all duration-200',
                                        earned ? 'hover:-translate-y-0.5' : 'opacity-35 grayscale',
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
                            const activeLanguage = defaultLang === 'myanmar' ? 'myanmar' : 'english'
                            const langList = list.filter((l) => l.language === activeLanguage && l.level === level)
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
                <div className="flex items-center justify-between border-b border-border bg-paper-2/30 px-5 py-3">
                    <h2 className={cn(sectionTitleClass, 'flex items-center gap-2')}>
                        <Timer className="size-4 text-muted-foreground" />
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
                                    <th className="px-5 py-2.5 font-normal">When</th>
                                    <th className="px-5 py-2.5 font-normal">Lesson</th>
                                    <th className="px-5 py-2.5 text-right font-normal">WPM</th>
                                    <th className="px-5 py-2.5 text-right font-normal">Acc</th>
                                    <th className="hidden px-5 py-2.5 text-right font-normal sm:table-cell">Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sessions.slice(0, 12).map((s) => (
                                    <tr key={s.id} className="border-t border-border transition-colors hover:bg-muted/40">
                                        <td className="px-5 py-2 text-muted-foreground">
                                            {new Date(s.startedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td className="px-5 py-2 font-myanmar">{formatLessonLabel(s.lessonId)}</td>
                                        <td className="px-5 py-2 text-right font-semibold tabular-nums">{formatWpm(s.wpm)}</td>
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

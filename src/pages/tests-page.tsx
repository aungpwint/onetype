import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, Gauge, Target, Timer, Trophy, X } from 'lucide-react'
import * as backend from '@/services/backend'
import type { TestResult, TypingTest } from '@/services/types'
import { useStudentStore } from '@/stores/student-store'
import { containsMyanmar } from '@/core/unicode/myanmar'
import { Badge } from '@/components/ui/badge'
import { EmptyState, PageHeader, Spinner } from '@/components/ui'
import { formatDateTime, formatWpm, formatAccuracy, bestResultByTest } from '@/lib/format'
import { cn, cardClass, appPageClass, sectionTitleClass, eyebrowClass } from '@/lib/utils'

function groupByLanguage(tests: TypingTest[]): Array<{ language: string; tests: TypingTest[] }> {
    const order = ['myanmar', 'english', 'mixed']
    const map = new Map<string, TypingTest[]>()
    for (const t of tests) {
        const lang = t.language === 'english' ? 'english' : t.language === 'mixed' ? 'mixed' : 'myanmar'
        map.set(lang, [...(map.get(lang) ?? []), t])
    }
    return order.filter((l) => map.has(l)).map((l) => ({ language: l, tests: map.get(l)! }))
}

function StatTile({ icon, label, value, hint }: { icon: ReactNode; label: string; value: ReactNode; hint?: string }) {
    return (
        <div className="group relative overflow-hidden rounded-2xl border border-line bg-card p-4 shadow-(--shadow-1) transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:border-line-strong hover:shadow-(--shadow-3)">
            <span aria-hidden className="pointer-events-none absolute inset-0 bg-linear-to-b from-surface-elevated/60 to-transparent opacity-80" />
            <div className="relative flex items-center justify-between gap-2">
                <p className={eyebrowClass}>{label}</p>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-line bg-paper-2/70 text-accent">{icon}</span>
            </div>
            <p className="relative mt-2 font-display text-2xl leading-none font-semibold tracking-tight tabular-nums">{value}</p>
            {hint ? <p className="relative mt-1.5 text-[0.6875rem] text-muted-foreground">{hint}</p> : null}
        </div>
    )
}

export default function TestsPage() {
    const active = useStudentStore((s) => s.active)
    const [tests, setTests] = useState<TypingTest[] | null>(null)
    const [results, setResults] = useState<TestResult[]>([])

    useEffect(() => {
        void (async () => {
            const all = await backend.listTypingTests()
            setTests(all)
        })()
    }, [])

    useEffect(() => {
        if (!active) return
        void (async () => {
            setResults(await backend.listTestResults(active.id))
        })()
    }, [active])

    const bestByTest = bestResultByTest(results)

    const attemptsByTest = useMemo(() => {
        const counts = new Map<string, number>()
        for (const r of results) counts.set(r.testId, (counts.get(r.testId) ?? 0) + 1)
        return counts
    }, [results])

    const testById = useMemo(() => new Map((tests ?? []).map((t) => [t.id, t])), [tests])

    const attemptStats = useMemo(() => {
        const attempts = results.length
        const passed = results.filter((r) => r.passed).length
        const passRate = attempts ? (passed / attempts) * 100 : null
        const avgAcc = attempts ? results.reduce((sum, r) => sum + r.accuracy, 0) / attempts : 0
        return { attempts, passed, passRate, avgAcc }
    }, [results])

    const groups = tests ? groupByLanguage(tests) : []

    return (
        <div className={appPageClass}>
            <PageHeader
                eyebrow="Examination desk"
                title="Timed tests"
                subtitle="Fix a time, meet the target. In a real exam you type for the whole duration, so keep a steady pace and let the paper run."
            />

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatTile icon={<Timer className="size-4" />} label="Attempts" value={attemptStats.attempts || '—'} hint="Across every paper" />
                <StatTile
                    icon={<Target className="size-4" />}
                    label="Pass rate"
                    value={attemptStats.passRate !== null ? `${Math.round(attemptStats.passRate)}%` : '—'}
                    hint={attemptStats.attempts ? `${attemptStats.passed} of ${attemptStats.attempts} runs passed` : 'No runs yet'}
                />
                <StatTile icon={<Trophy className="size-4" />} label="Passed" value={attemptStats.passed || '—'} hint="When speed & accuracy met the target" />
                <StatTile
                    icon={<Gauge className="size-4" />}
                    label="Avg accuracy"
                    value={attemptStats.attempts ? formatAccuracy(attemptStats.avgAcc) : '—'}
                    hint="Mean accuracy over all runs"
                />
            </div>

            {tests === null ? (
                <Spinner label="Gathering the papers…" />
            ) : groups.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                    No tests seeded. Add them in <code>src/data/seeds</code>.
                </p>
            ) : (
                groups.map((group) => (
                    <section key={group.language}>
                        <div className="mb-3 flex items-center gap-2">
                            <h2 className={cn(sectionTitleClass, 'capitalize')}>
                                {group.language === 'english' ? 'English' : group.language === 'mixed' ? 'Mixed' : 'Myanmar'}
                            </h2>
                            <span className="rounded-full border border-line bg-paper-2/70 px-2 py-0.5 text-xs text-muted-foreground tabular-nums">
                                {group.tests.length} paper{group.tests.length === 1 ? '' : 's'}
                            </span>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            {group.tests.map((test) => {
                                const best = bestByTest.get(test.id)
                                const attempts = attemptsByTest.get(test.id) ?? 0
                                return (
                                    <Link
                                        key={test.id}
                                        to={`/test/${test.id}`}
                                        className={cn(
                                            cardClass,
                                            'group relative flex flex-col overflow-hidden rounded-2xl p-5 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:border-line-strong hover:shadow-(--shadow-3) focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                                        )}
                                    >
                                        <span
                                            aria-hidden
                                            className={cn(
                                                'pointer-events-none absolute inset-0 bg-linear-to-b to-transparent',
                                                best ? 'from-success/10' : 'from-surface-elevated/50 opacity-80',
                                            )}
                                        />

                                        <div className="relative flex flex-col gap-2">
                                            <div className="flex items-center gap-2">
                                                <span className="rounded-md border border-line-strong/70 bg-linear-to-b from-key-top to-key-base px-2 py-0.5 font-mono text-xs tabular-nums shadow-[0_1px_0_var(--line-strong)]">
                                                    {test.code}
                                                </span>
                                                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                                    <Timer className="size-3" />
                                                    {test.durationSeconds} s
                                                </span>
                                                <span className="ml-auto">
                                                    {best?.passed ? (
                                                        <Badge variant="success">Passed</Badge>
                                                    ) : attempts > 0 ? (
                                                        <Badge variant="warning">
                                                            {attempts} attempt{attempts === 1 ? '' : 's'}
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="secondary">New</Badge>
                                                    )}
                                                </span>
                                            </div>

                                            <p
                                                className={cn(
                                                    'font-display text-xl leading-tight font-semibold tracking-[-0.01em]',
                                                    containsMyanmar(test.name) ? 'font-myanmar' : '',
                                                )}
                                            >
                                                {test.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Target {test.minAccuracy}% acc{test.minWpm !== null ? ` · ${test.minWpm} wpm` : ''}
                                            </p>
                                        </div>

                                        <div className="relative mt-auto flex items-end justify-between gap-4 pt-5">
                                            {best ? (
                                                <div>
                                                    <p className="font-display text-2xl leading-none font-semibold text-success tabular-nums">
                                                        {formatWpm(best.wpm)}
                                                        <span className="ml-1.5 font-sans text-xs font-normal text-muted-foreground">wpm</span>
                                                    </p>
                                                    <p className="mt-1 text-xs text-muted-foreground">best run · {formatAccuracy(best.accuracy)} acc</p>
                                                </div>
                                            ) : (
                                                <div>
                                                    <p className="text-sm text-muted-foreground">Not attempted yet</p>
                                                    <p className="mt-1 text-xs text-muted-foreground">
                                                        Almost 100% effort, {test.durationSeconds}s of focus
                                                    </p>
                                                </div>
                                            )}
                                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line-strong bg-card text-ink-soft transition-[transform,background-color,color] duration-300 group-hover:translate-x-0.5 group-hover:bg-primary group-hover:text-white">
                                                <ArrowRight className="size-4" />
                                            </span>
                                        </div>
                                    </Link>
                                )
                            })}
                        </div>
                    </section>
                ))
            )}

            {results.length > 0 ? (
                <section className={cn(cardClass, 'overflow-hidden')}>
                    <div className="flex items-center justify-between border-b border-border bg-paper-2/30 px-5 py-3">
                        <h2 className={cn(sectionTitleClass, 'flex items-center gap-2')}>
                            <Trophy className="size-4 text-muted-foreground" />
                            My attempt log
                        </h2>
                        <span className="text-xs text-muted-foreground tabular-nums">
                            {results.length} run{results.length === 1 ? '' : 's'}
                        </span>
                    </div>
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="text-xs tracking-wider text-muted-foreground uppercase">
                                <th className="px-5 py-2.5 font-normal">Paper</th>
                                <th className="px-5 py-2.5 text-right font-normal">Run</th>
                                <th className="hidden px-5 py-2.5 text-right font-normal sm:table-cell">When</th>
                                <th className="px-5 py-2.5 text-right font-normal">WPM</th>
                                <th className="px-5 py-2.5 text-right font-normal">Acc</th>
                                <th className="px-5 py-2.5 text-right font-normal">Result</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[...results]
                                .sort((a, b) => b.scoredOn - a.scoredOn)
                                .slice(0, 20)
                                .map((r) => {
                                    const test = testById.get(r.testId)
                                    return (
                                        <tr key={r.id} className="border-t border-border transition-colors hover:bg-muted/40">
                                            <td className="px-5 py-2">
                                                <span className="block font-mono text-xs tabular-nums">{test?.code ?? r.testId}</span>
                                                <span className="block text-xs text-muted-foreground">{test?.name ?? r.testId}</span>
                                            </td>
                                            <td className="px-5 py-2 text-right tabular-nums">{r.attempt}</td>
                                            <td className="hidden px-5 py-2 text-right text-muted-foreground tabular-nums sm:table-cell">
                                                {formatDateTime(r.scoredOn)}
                                            </td>
                                            <td className="px-5 py-2 text-right font-display font-semibold tabular-nums">{formatWpm(r.wpm)}</td>
                                            <td className="px-5 py-2 text-right tabular-nums">{formatAccuracy(r.accuracy)}</td>
                                            <td className="px-5 py-2 text-right">
                                                {r.passed ? (
                                                    <span className="inline-flex items-center gap-1 font-medium text-success">
                                                        <Check className="size-4" />
                                                        passed
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 font-medium text-destructive">
                                                        <X className="size-4" />
                                                        <span className="sm:hidden">not yet</span>
                                                        <span className="hidden sm:inline">failed</span>
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                        </tbody>
                    </table>
                </section>
            ) : (
                <EmptyState icon={<Trophy className="size-5" />} title="No attempts yet">
                    Pick a paper above and type a full run — once you have results, your best speed per test, pass rate and full
                    attempt history will appear here.
                </EmptyState>
            )}
        </div>
    )
}
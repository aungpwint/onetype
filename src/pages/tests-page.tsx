import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, X, Trophy, Timer } from 'lucide-react'
import * as backend from '@/services/backend'
import type { TestResult, TypingTest } from '@/services/types'
import { useStudentStore } from '@/stores/student-store'
import { Spinner, PageHeader } from '@/components/ui'
import { formatWpm, formatAccuracy, bestResultByTest } from '@/lib/format'
import { cn, cardClass, appPageClass, sectionTitleClass } from '@/lib/utils'

function groupByLanguage(tests: TypingTest[]): Array<{ language: string; tests: TypingTest[] }> {
    const order = ['myanmar', 'english', 'mixed']
    const map = new Map<string, TypingTest[]>()
    for (const t of tests) {
        const lang = t.language === 'english' ? 'english' : t.language === 'mixed' ? 'mixed' : 'myanmar'
        map.set(lang, [...(map.get(lang) ?? []), t])
    }
    return order.filter((l) => map.has(l)).map((l) => ({ language: l, tests: map.get(l)! }))
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

    const groups = tests ? groupByLanguage(tests) : []

    return (
        <div className={appPageClass}>
            <PageHeader
                eyebrow="Examination desk"
                title="Timed tests"
                subtitle="Fix a time, meet the target. In a real exam you type for the whole duration, so keep a steady pace and let the paper run."
            />

            {tests === null ? (
                <Spinner label="Gathering the papers…" />
            ) : groups.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                    No tests seeded. Add them in <code>src/data/seeds</code>.
                </p>
            ) : (
                groups.map((group) => (
                    <section key={group.language}>
                        <h2 className="mb-3 text-muted-foreground capitalize">
                            {group.language === 'english' ? 'English' : group.language === 'mixed' ? 'Mixed' : 'Myanmar'}
                        </h2>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {group.tests.map((test) => {
                                const best = bestByTest.get(test.id)
                                return (
                                    <Link
                                        key={test.id}
                                        to={`/test/${test.id}`}
                                        className={cn(
                                            cardClass,
                                            'flex items-center justify-between gap-4 p-4 transition-all duration-150 hover:-translate-y-0.5 hover:border-border hover:shadow-md',
                                        )}
                                    >
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs tabular-nums">{test.code}</span>
                                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                    <Timer className="size-3" />
                                                    {test.durationSeconds} s
                                                </span>
                                            </div>
                                            <p className="mt-2 font-display font-myanmar text-xl leading-tight">{test.name}</p>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                Target {test.minAccuracy}% acc{test.minWpm !== null ? ` · ${test.minWpm} wpm` : ''}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            {best ? (
                                                <>
                                                    <p className="font-display text-2xl text-success tabular-nums">{formatWpm(best.wpm)}</p>
                                                    <p className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                                                        <Trophy className="size-3 text-brass" />
                                                        best wpm
                                                    </p>
                                                </>
                                            ) : (
                                                <p className="ml-auto text-sm text-muted-foreground">not yet</p>
                                            )}
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
                    <h2 className={cn(sectionTitleClass, 'border-b border-border px-5 py-3 text-base')}>My attempt log</h2>
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="text-xs tracking-wider text-muted-foreground uppercase">
                                <th className="px-5 py-2 font-normal">Test</th>
                                <th className="px-5 py-2 text-right font-normal">Attempt</th>
                                <th className="px-5 py-2 text-right font-normal">WPM</th>
                                <th className="px-5 py-2 text-right font-normal">Acc</th>
                                <th className="px-5 py-2 text-right font-normal">Pass</th>
                            </tr>
                        </thead>
                        <tbody>
                            {results.slice(0, 20).map((r) => (
                                <tr key={r.id} className="border-t border-border">
                                    <td className="px-5 py-2 font-myanmar">{r.testId}</td>
                                    <td className="px-5 py-2 text-right tabular-nums">{r.attempt}</td>
                                    <td className="px-5 py-2 text-right tabular-nums">{formatWpm(r.wpm)}</td>
                                    <td className="px-5 py-2 text-right tabular-nums">{formatAccuracy(r.accuracy)}</td>
                                    <td className="px-5 py-2 text-right">
                                        {r.passed ? (
                                            <span className="inline-flex items-center gap-1 text-success">
                                                <Check className="size-4" />
                                                passed
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-destructive">
                                                <X className="size-4" />
                                                <span className="sm:hidden">not yet</span>
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>
            ) : null}
        </div>
    )
}

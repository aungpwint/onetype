import type { TestResult, TypingTest } from '@/services/types'
import { bestRun, groupTestResults } from './best-run'

export interface TestRecordEntry {
    testId: string
    code: string
    name: string
    durationSeconds: number
    attempts: number
    passed: boolean
    bestWpm: number
    bestAccuracy: number
    lastAttemptAt: number
}

export function buildTestRecord(results: readonly TestResult[], tests: readonly TypingTest[]): TestRecordEntry[] {
    const byId = new Map(tests.map((t) => [t.id, t]))
    const grouped = groupTestResults(results)

    const entries: TestRecordEntry[] = []
    for (const [testId, runs] of grouped) {
        const meta = byId.get(testId)
        if (!meta) continue
        const best = bestRun(runs)
        entries.push({
            testId,
            code: meta.code,
            name: meta.name,
            durationSeconds: meta.durationSeconds,
            attempts: runs.length,
            passed: runs.some((r) => r.passed),
            bestWpm: best.wpm,
            bestAccuracy: best.accuracy,
            lastAttemptAt: Math.max(...runs.map((r) => r.scoredOn)),
        })
    }

    return entries.sort((a, b) => a.code.localeCompare(b.code))
}

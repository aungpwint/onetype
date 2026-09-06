import type { TestResult, TypingTest } from '@/services/types'

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

/** Best run per attempted paper, along with pass status and attempt count. */
export function buildTestRecord(results: readonly TestResult[], tests: readonly TypingTest[]): TestRecordEntry[] {
    const byId = new Map(tests.map((t) => [t.id, t]))
    const grouped = new Map<string, TestResult[]>()

    for (const r of results) {
        const list = grouped.get(r.testId) ?? []
        list.push(r)
        grouped.set(r.testId, list)
    }

    const entries: TestRecordEntry[] = []
    for (const [testId, runs] of grouped) {
        const meta = byId.get(testId)
        if (!meta) continue
        let best = runs[0]
        for (const r of runs) {
            if (r.wpm > best.wpm || (r.wpm === best.wpm && r.accuracy > best.accuracy)) best = r
        }
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
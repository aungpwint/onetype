import type { TestResult, TypingTest } from '@/services/types'
import { bestRun, groupTestResults } from './best-run'

interface FocusEntry {
    testId: string
    code: string
    name: string
    attempts: number
    bestWpm: number
    bestAccuracy: number
    shortfall: number
}

export function focusQueue(results: readonly TestResult[], tests: readonly TypingTest[], limit = 3): FocusEntry[] {
    const byId = new Map(tests.map((t) => [t.id, t]))
    const grouped = groupTestResults(results)

    const entries: FocusEntry[] = []
    for (const [testId, runs] of grouped) {
        if (runs.some((r) => r.passed)) continue
        const meta = byId.get(testId)
        if (!meta) continue
        const best = bestRun(runs)
        const wpmGap = meta.minWpm === null ? 0 : Math.max(0, meta.minWpm - best.wpm)
        const accGap = Math.max(0, meta.minAccuracy - best.accuracy)
        entries.push({
            testId,
            code: meta.code,
            name: meta.name,
            attempts: runs.length,
            bestWpm: best.wpm,
            bestAccuracy: best.accuracy,
            shortfall: wpmGap + accGap,
        })
    }

    return entries.sort((a, b) => a.shortfall - b.shortfall || a.code.localeCompare(b.code)).slice(0, limit)
}

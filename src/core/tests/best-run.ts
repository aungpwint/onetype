import type { TestResult } from '@/services/types'

/**
 * Returns the run with the highest WPM, breaking ties by accuracy. This is the
 * canonical "best run" comparison used across test records and the focus queue.
 */
export function bestRun(runs: readonly TestResult[]): TestResult {
    let best = runs[0]
    for (const r of runs) {
        if (r.wpm > best.wpm || (r.wpm === best.wpm && r.accuracy > best.accuracy)) best = r
    }
    return best
}

/**
 * Groups test results by test id, preserving insertion order within each group.
 */
export function groupTestResults(results: readonly TestResult[]): Map<string, TestResult[]> {
    const grouped = new Map<string, TestResult[]>()
    for (const r of results) {
        const list = grouped.get(r.testId) ?? []
        list.push(r)
        grouped.set(r.testId, list)
    }
    return grouped
}

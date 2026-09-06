export function formatDuration(milliseconds: number): string {
    const seconds = Math.round(milliseconds / 1000)
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
}

/** Fraction of a timed round still remaining, clamped to [0, 1]. */
export function timerProportion(remaining: number, total: number): number {
    if (total <= 0) return 0
    const ratio = remaining / total
    return Math.min(1, Math.max(0, ratio))
}

export function formatDateTime(timestamp: number): string {
    return new Date(timestamp).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

export function pct(part: number, total: number): number {
    return total > 0 ? (part / total) * 100 : 0
}

export function formatWpm(wpm: number): string {
    return String(Math.round(wpm))
}

export function formatAccuracy(accuracy: number, digits = 0): string {
    return `${accuracy.toFixed(digits)}%`
}

export function formatLessonLabel(lessonId?: string | null): string {
    return lessonId?.replace(/^lesson-(en|my)-/, '') ?? 'timed test'
}

export function bestResultByTest<T extends { testId: string; wpm: number }>(results: readonly T[]): Map<string, T> {
    const best = new Map<string, T>()
    for (const r of results) {
        const prev = best.get(r.testId)
        if (!prev || r.wpm > prev.wpm) best.set(r.testId, r)
    }
    return best
}

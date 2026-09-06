import type { PerformanceSummary, SessionPoint, Trend } from './types'

export function pooledAccuracy(points: SessionPoint[]): number {
    let correct = 0
    let total = 0
    for (const p of points) {
        correct += p.correctCount
        total += p.correctCount + p.errorCount
    }
    if (total <= 0) return 0
    return (correct / total) * 100
}

export function orderChronologically(points: SessionPoint[]): SessionPoint[] {
    return [...points].sort((a, b) => a.startedAt - b.startedAt)
}

export function linearTrend(values: number[]): Trend {
    const n = values.length
    if (n < 2) {
        return { slope: 0, intercept: n === 1 ? values[0] : 0, valid: false }
    }
    const meanX = (n - 1) / 2
    const meanY = values.reduce((s, v) => s + v, 0) / n
    let num = 0
    let den = 0
    for (let i = 0; i < n; i++) {
        const dx = i - meanX
        num += dx * (values[i] - meanY)
        den += dx * dx
    }
    const slope = den !== 0 ? num / den : 0
    const intercept = meanY - slope * meanX
    return { slope, intercept, valid: true }
}

export function metricTrend(points: SessionPoint[], metric: 'wpm' | 'accuracy'): Trend {
    const ordered = orderChronologically(points)
    return linearTrend(ordered.map((p) => p[metric]))
}

export function standardDeviation(values: number[]): number {
    const n = values.length
    if (n === 0) return 0
    const mean = values.reduce((s, v) => s + v, 0) / n
    if (n === 1) return 0
    const variance = values.reduce((s, v) => s + (v - mean) * (v - mean), 0) / (n - 1)
    return Math.sqrt(variance)
}

export function coefficientOfVariation(values: number[]): number {
    const n = values.length
    if (n < 2) return 0
    const mean = values.reduce((s, v) => s + v, 0) / n
    if (mean === 0) return 0
    return standardDeviation(values) / mean
}

export function summarizePerformance(points: SessionPoint[]): PerformanceSummary {
    const wpmValues = points.map((p) => p.wpm)
    const avgWpm = wpmValues.length > 0 ? wpmValues.reduce((s, v) => s + v, 0) / wpmValues.length : 0
    const bestWpm = wpmValues.length > 0 ? Math.max(...wpmValues) : 0
    return {
        pooledAccuracy: pooledAccuracy(points),
        avgWpm,
        bestWpm,
        wpmVariability: coefficientOfVariation(wpmValues),
        wpmTrend: metricTrend(points, 'wpm'),
        accuracyTrend: metricTrend(points, 'accuracy'),
    }
}

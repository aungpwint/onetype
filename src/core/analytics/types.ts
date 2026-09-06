export interface SessionPoint {
    startedAt: number
    wpm: number
    accuracy: number
    correctCount: number
    errorCount: number
}

export interface Trend {
    slope: number
    intercept: number
    valid: boolean
}

export interface PerformanceSummary {
    pooledAccuracy: number
    avgWpm: number
    bestWpm: number
    wpmVariability: number
    wpmTrend: Trend
    accuracyTrend: Trend
}

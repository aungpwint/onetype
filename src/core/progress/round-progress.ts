export interface RoundProgressInput {
    elapsedSeconds: number
    durationSeconds: number | null
    unitIndex: number
    totalUnits: number
}

function clamp01(value: number): number {
    return Math.max(0, Math.min(1, value))
}

/** Live round completion: elapsed time for timed papers, typed units otherwise. */
export function roundProgressFraction(input: RoundProgressInput): number {
    const { elapsedSeconds, durationSeconds, unitIndex, totalUnits } = input
    if (durationSeconds !== null && durationSeconds > 0) return clamp01(elapsedSeconds / durationSeconds)
    if (totalUnits > 0) return clamp01(unitIndex / totalUnits)
    return 0
}
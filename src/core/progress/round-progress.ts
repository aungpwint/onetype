import { clamp } from '@/lib/utils'

export interface RoundProgressInput {
    elapsedSeconds: number
    durationSeconds: number | null
    unitIndex: number
    totalUnits: number
}

// Live round completion: elapsed time for timed papers, typed units otherwise.
export function roundProgressFraction(input: RoundProgressInput): number {
    const { elapsedSeconds, durationSeconds, unitIndex, totalUnits } = input
    if (durationSeconds !== null && durationSeconds > 0) return clamp(elapsedSeconds / durationSeconds, 0, 1)
    if (totalUnits > 0) return clamp(unitIndex / totalUnits, 0, 1)
    return 0
}

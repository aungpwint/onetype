export interface PersonalBestInfo {
    /** Best speed (same unit as the inputs) from prior rounds, or null. */
    previousBest: number | null
    /** True when the current round set the best — including a first-ever round. */
    isNewBest: boolean
    /** Non-negative gain over the previous best (0 for a first or worse round). */
    improvedBy: number
    /** Count of valid prior rounds considered. */
    total: number
}

/** Compare the current round against earlier rounds in the same unit. */
export function computePersonalBest(priorSpeeds: readonly number[], currentSpeed: number): PersonalBestInfo {
    const valid = priorSpeeds.filter((speed) => Number.isFinite(speed) && speed > 0)
    const previousBest = valid.length > 0 ? Math.max(...valid) : null
    const isNewBest = currentSpeed > 0 && (previousBest === null || currentSpeed > previousBest)
    const improvedBy = previousBest === null ? 0 : Math.max(0, currentSpeed - previousBest)
    return { previousBest, isNewBest, improvedBy, total: valid.length }
}
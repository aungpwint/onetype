import type { SpeedUnit } from '@/core/scoring/score'

export interface CharacterBreakdown {
    /** Correctly typed, display-appropriate unit (chars vs grapheme clusters). */
    correct: number
    /** Presses that hit the wrong key. */
    wrong: number
    /** Net progress: the number of target units consumed by the caret. */
    progress: number
    total: number
}

export type CharacterUnit = 'characters' | 'clusters'

export function breakdownUnit(speedUnit: SpeedUnit): CharacterUnit {
    return speedUnit === 'units/min' ? 'clusters' : 'characters'
}

export function characterBreakdown(
    correctAttempts: number,
    incorrectAttempts: number,
    completedClusters: number,
    speedUnit: SpeedUnit,
): CharacterBreakdown {
    if (speedUnit === 'units/min') {
        return {
            correct: completedClusters,
            wrong: incorrectAttempts,
            progress: completedClusters,
            total: correctAttempts + incorrectAttempts,
        }
    }
    return { correct: correctAttempts, wrong: incorrectAttempts, progress: correctAttempts, total: correctAttempts + incorrectAttempts }
}

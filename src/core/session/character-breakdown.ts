import type { SpeedUnit } from '@/core/scoring/score'

interface CharacterBreakdown {
    correct: number
    wrong: number
    progress: number
    total: number
}

type CharacterUnit = 'characters' | 'clusters'

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

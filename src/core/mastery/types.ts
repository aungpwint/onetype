export type MasteryLevel = 'not-started' | 'attempted' | 'passed' | 'mastered'

export const MASTERY_ORDER: readonly MasteryLevel[] = ['not-started', 'attempted', 'passed', 'mastered']

export interface MasteryConfig {
    consecutivePassesRequired: number
    accuracyMargin: number
}

export const DEFAULT_MASTERY_CONFIG: MasteryConfig = {
    consecutivePassesRequired: 3,
    accuracyMargin: 10,
}

export interface AttemptRecord {
    passed: boolean
    accuracy: number
}

export interface StatInput {
    key: string
    correct: number
    incorrect: number
}

export interface WeaknessConfig {
    minAttempts: number
    confidenceZ: number
}

export interface WeaknessScore {
    key: string
    accuracy: number
    attempts: number
    lowerBound: number
}

// Pure, testable derivation of a typing character's presentation state.
//
// The renderer must answer "correct / incorrect / current / pending" plus a
// 0..1 progress value for the cluster under the caret. These are computed here
// as a single stable primitive (the "phase code") so that character components
// can subscribe to one plain value per render concern instead of receiving
// derived props from a re-rendering parent every keystroke.

export const CHAR_PENDING = 0

/** Completed without error. */
export const CHAR_CORRECT = 2

/** Completed with at least one incorrect unit typed into it. */
export const CHAR_INCORRECT = 3

// The cluster that currently contains the caret is encoded as `1 + progress`,
// so any value in [1, 2) means "current" and `progress = phase - 1`.

export type CharVisualState = 'pending' | 'current' | 'correct' | 'incorrect'

export interface CharRenderState {
    visual: CharVisualState
    /** Fraction of the cluster consumed by the caret, clamped to 0..1. */
    progress: number
}

/** Phase code for a cluster at a given caret unit index (current = 1 + p). */
export function clusterPhaseCode(unitIndex: number, startUnit: number, endUnit: number): number {
    if (unitIndex >= endUnit) return CHAR_CORRECT
    if (unitIndex >= startUnit) {
        const span = endUnit - startUnit
        return 1 + (span === 0 ? 1 : Math.min(1, (unitIndex - startUnit) / span))
    }
    return CHAR_PENDING
}

/** Expressive state object for the same inputs (used by tests and debug UI). */
export function charRenderState(unitIndex: number, startUnit: number, endUnit: number, incorrect: boolean): CharRenderState {
    if (unitIndex >= endUnit) {
        return incorrect ? { visual: 'incorrect', progress: 1 } : { visual: 'correct', progress: 1 }
    }
    if (unitIndex >= startUnit) {
        const span = endUnit - startUnit
        return { visual: 'current', progress: span === 0 ? 1 : Math.min(1, (unitIndex - startUnit) / span) }
    }
    return { visual: 'pending', progress: 0 }
}

/** Whether a transient error-flash index falls inside this cluster's range. */
export function flashIndexMatches(flashIndex: number | undefined, startUnit: number, endUnit: number): boolean {
    return typeof flashIndex === 'number' && flashIndex >= startUnit && flashIndex < endUnit
}

/** Anything answering whether a typing unit was answered incorrectly. */
export interface UnitOutcomeQuery {
    unitOutcomeAt(index: number): 'correct' | 'incorrect' | null
}

/** True when any typing unit in the cluster range was answered incorrectly. */
export function rangeHasIncorrect(outcomes: UnitOutcomeQuery, startUnit: number, endUnit: number): boolean {
    for (let i = startUnit; i < endUnit; i += 1) {
        if (outcomes.unitOutcomeAt(i) === 'incorrect') return true
    }
    return false
}
export type GraphemeCorrectness = 'pending' | 'correct' | 'incorrect'

export interface GraphemeViewState {
    /** True iff the caret is inside this grapheme → active highlight + caret. */
    isCurrent: boolean
    /** Real-time 0..1 caret slide position (only meaningful when isCurrent). */
    progress: number
    /** Complete-grapheme verdict: 'pending' while composing or untouched. */
    correctness: GraphemeCorrectness
}

export interface UnitOutcomeQuery {
    unitOutcomeAt(index: number): 'correct' | 'incorrect' | null
}

const PENDING: GraphemeViewState = { isCurrent: false, progress: 0, correctness: 'pending' }
const CORRECT: GraphemeViewState = { isCurrent: false, progress: 1, correctness: 'correct' }
const INCORRECT: GraphemeViewState = { isCurrent: false, progress: 1, correctness: 'incorrect' }

/**
 * True when the caret unit index sits inside this grapheme's [startUnit, endUnit)
 * range.  This is the canonical predicate behind the active highlight: exactly
 * one grapheme is active at any time, regardless of word membership.
 */
export function isCurrentGrapheme(unitIndex: number, startUnit: number, endUnit: number): boolean {
    return unitIndex >= startUnit && unitIndex < endUnit
}

/**
 * Real-time fraction of the cluster the caret has consumed.
 * 0 at the leading boundary → rising by one unit per keystroke → 1 once passed.
 * Independent of correctness — a grapheme can be "100% typed" but still pending
 * if a later grapheme triggered the tick.
 */
export function cursorProgressInCluster(unitIndex: number, startUnit: number, endUnit: number): number {
    if (unitIndex < startUnit) return 0
    if (unitIndex >= endUnit) return 1
    const span = endUnit - startUnit
    return span === 0 ? 1 : Math.min(1, (unitIndex - startUnit) / span)
}

/**
 * The correctness verdict for a single grapheme.
 *
 * WAIT state — returns 'pending' whenever the caret is inside or before the
 * grapheme (unitIndex < endUnit), regardless of how many units were typed.
 * This prevents mid-composition green flash: a grapheme turns green or red
 * ONLY after the caret has moved past its final unit.
 */
export function graphemeCorrectness(unitIndex: number, endUnit: number, incorrect: boolean): GraphemeCorrectness {
    if (unitIndex >= endUnit) {
        return incorrect ? 'incorrect' : 'correct'
    }
    return 'pending'
}

/**
 * Single canonical derivation of a grapheme's visual state.
 *
 * Returns stable constant references for pending/correct/incorrect chars
 * (so memoized Char components bail out without re-rendering) and a fresh
 * object only for the active grapheme whose cursor progress is changing.
 *
 * The three concerns are composed but NEVER cross-gate:
 *   isCurrent + progress update on every keystroke (States 1+2).
 *   correctness is decided only when the full grapheme is consumed (State 3).
 */
export function graphemeViewState(unitIndex: number, startUnit: number, endUnit: number, incorrect: boolean): GraphemeViewState {
    const c = graphemeCorrectness(unitIndex, endUnit, incorrect)
    if (c !== 'pending') {
        return c === 'correct' ? CORRECT : INCORRECT
    }
    if (isCurrentGrapheme(unitIndex, startUnit, endUnit)) {
        return {
            isCurrent: true,
            progress: cursorProgressInCluster(unitIndex, startUnit, endUnit),
            correctness: c,
        }
    }
    return PENDING
}

/** True when a transient error-flash index falls inside this cluster's range. */
export function flashIndexMatches(flashIndex: number | undefined, startUnit: number, endUnit: number): boolean {
    return typeof flashIndex === 'number' && flashIndex >= startUnit && flashIndex < endUnit
}

/** True when any typing unit in the cluster range was answered incorrectly. */
export function rangeHasIncorrect(outcomes: UnitOutcomeQuery, startUnit: number, endUnit: number): boolean {
    for (let i = startUnit; i < endUnit; i += 1) {
        if (outcomes.unitOutcomeAt(i) === 'incorrect') return true
    }
    return false
}

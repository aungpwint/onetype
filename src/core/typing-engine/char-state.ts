import type { GraphemeSlot } from './sequence'

export type GraphemeCorrectness = 'pending' | 'correct' | 'incorrect'

export interface UnitPresentation {
    /** Logical display segment of this slot (one code point). */
    text: string
    /** Local slot index inside the grapheme (0..slots.length-1). */
    slot: number
    /** Global typing-unit index that produces this slot (startUnit + unitLocal). */
    unit: number
    /** The caret has passed this unit (it was consumed by a correct press). */
    completed: boolean
    /** Per-unit visual state: pending (upcoming/current), correct, or incorrect. */
    outcome: GraphemeCorrectness
    /** True for the unit the caret currently points at — the active target. */
    isCurrent: boolean
}

export interface GraphemePresentation {
    /** True iff the caret sits inside this grapheme → active highlight + caret. */
    isCurrent: boolean
    /** Real-time 0..1 caret slide position (only meaningful when isCurrent). */
    progress: number
    /** Commit-ready verdict for the whole grapheme; 'pending' while composing. */
    correctness: GraphemeCorrectness
    /**
     * Per-unit slots in logical display order. Set only for the CURRENT grapheme
     * (a fresh object each keystroke); null for passive graphemes so memoized
     * Chars keep rendering the single shaped span and bail out on re-render.
     */
    slots: UnitPresentation[] | null
}

export interface UnitOutcomeQuery {
    unitOutcomeAt(index: number): 'correct' | 'incorrect' | null
}

const PENDING: GraphemePresentation = { isCurrent: false, progress: 0, correctness: 'pending', slots: null }
const CORRECT: GraphemePresentation = { isCurrent: false, progress: 1, correctness: 'correct', slots: null }
const INCORRECT: GraphemePresentation = { isCurrent: false, progress: 1, correctness: 'incorrect', slots: null }

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
 */
export function cursorProgressInCluster(unitIndex: number, startUnit: number, endUnit: number): number {
    if (unitIndex < startUnit) return 0
    if (unitIndex >= endUnit) return 1
    const span = endUnit - startUnit
    return span === 0 ? 1 : Math.min(1, (unitIndex - startUnit) / span)
}

/**
 * Single canonical derivation of a grapheme's visual state, at per-unit
 * granularity.
 *
 * The logical grapheme remains the primary model — `slots` are a presentation
 * layer that only front-ends the already-computed `GraphemeRun` unit mapping.
 * They never re-split the stored text or duplicate engine state: each slot maps
 * back to a global typing unit, whose outcome is the single source of truth.
 *
 * - Passive graphemes return stable constant references (memo bailout) and
 *   render as ONE shaped span carrying the committed verdict.
 * - The current grapheme's result is ALSO reference-stable: it is memoized by a
 *   full content signature and the SAME object is returned whenever the input
 *   (caret unit, slot texts, per-unit outcomes) is unchanged. This is what lets
 *   React's `useSyncExternalStore` (through zustand `useShallow`) bail out when
 *   the engine notification is unrelated to this grapheme; without it, the
 *   ever-fresh `slots` array breaks shallow-equality by reference and the Char
 *   re-renders in an infinite loop.
 * - So consumed units go green/red immediately while the rest stay pending, a
 *   partial grapheme never looks fully typed, and the whole grapheme turns
 *   green/red only once every unit is consumed.
 */
export function graphemePresentation(
    unitIndex: number,
    startUnit: number,
    slots: GraphemeSlot[],
    query: UnitOutcomeQuery,
): GraphemePresentation {
    const endUnit = startUnit + slots.length
    if (!isCurrentGrapheme(unitIndex, startUnit, endUnit)) {
        if (unitIndex >= endUnit) {
            return rangeHasIncorrect(query, startUnit, endUnit) ? INCORRECT : CORRECT
        }
        return PENDING
    }
    const key = activeBranchKey(unitIndex, startUnit, slots, query)
    if (activeBranchCache !== null && activeBranchCache.key === key) {
        return activeBranchCache.value
    }
    const unitSlots = slots.map((slot, i) => {
        const unit = startUnit + slot.unitLocal
        const completed = unit < unitIndex
        const outcome = unitOutcomeFor(unit, unitIndex, query)
        return { text: slot.text, slot: i, unit, completed, outcome, isCurrent: unit === unitIndex }
    })
    const value: GraphemePresentation = {
        isCurrent: true,
        progress: cursorProgressInCluster(unitIndex, startUnit, endUnit),
        correctness: 'pending',
        slots: unitSlots,
    }
    activeBranchCache = { key, value }
    return value
}

/** Per-unit render state, resolved independently of order of preference. */
function unitOutcomeFor(unit: number, unitIndex: number, query: UnitOutcomeQuery): GraphemeCorrectness {
    return query.unitOutcomeAt(unit) === 'incorrect' ? 'incorrect' : unit < unitIndex ? 'correct' : 'pending'
}

/**
 * Full content signature of the active branch: caret unit, grapheme start,
 * and every slot's text/unit-local pair plus its resolved outcome. Two calls
 * with equal signatures produce byte-identical `GraphemePresentation` data, so
 * the cached object is a legitimate aliasing of the fresh computation.
 */
function activeBranchKey(unitIndex: number, startUnit: number, slots: GraphemeSlot[], query: UnitOutcomeQuery): string {
    let key = `${unitIndex}|${startUnit}`
    for (const slot of slots) {
        key += `|${slot.text}|${slot.unitLocal}|${unitOutcomeFor(startUnit + slot.unitLocal, unitIndex, query)}`
    }
    return key
}

let activeBranchCache: { key: string; value: GraphemePresentation } | null = null

/** True when any typing unit in the cluster range was answered incorrectly. */
export function rangeHasIncorrect(outcomes: UnitOutcomeQuery, startUnit: number, endUnit: number): boolean {
    for (let i = startUnit; i < endUnit; i += 1) {
        if (outcomes.unitOutcomeAt(i) === 'incorrect') return true
    }
    return false
}
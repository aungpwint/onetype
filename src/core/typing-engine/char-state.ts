import type { GraphemeSlot } from './sequence'

export type GraphemeCorrectness = 'pending' | 'correct' | 'incorrect'

export interface UnitPresentation {
    text: string
    slot: number
    unit: number
    completed: boolean
    outcome: GraphemeCorrectness
    isCurrent: boolean
}

export interface GraphemePresentation {
    isCurrent: boolean
    progress: number
    correctness: GraphemeCorrectness
    slots: UnitPresentation[] | null
}

export interface UnitOutcomeQuery {
    unitOutcomeAt(index: number): 'correct' | 'incorrect' | null
}

const PENDING: GraphemePresentation = { isCurrent: false, progress: 0, correctness: 'pending', slots: null }
const CORRECT: GraphemePresentation = { isCurrent: false, progress: 1, correctness: 'correct', slots: null }
const INCORRECT: GraphemePresentation = { isCurrent: false, progress: 1, correctness: 'incorrect', slots: null }

export function isCurrentGrapheme(unitIndex: number, startUnit: number, endUnit: number): boolean {
    return unitIndex >= startUnit && unitIndex < endUnit
}

export function cursorProgressInCluster(unitIndex: number, startUnit: number, endUnit: number): number {
    if (unitIndex < startUnit) return 0
    if (unitIndex >= endUnit) return 1
    const span = endUnit - startUnit
    return span === 0 ? 1 : Math.min(1, (unitIndex - startUnit) / span)
}

// Passive graphemes return stable constant references for memo bailout and
// render as one shaped span carrying the committed verdict. The current
// grapheme's result is memoized on a full content signature, so re-renders
// only recompute when the caret unit, slot texts, or per-unit outcomes change.
export function graphemePresentation(unitIndex: number, startUnit: number, slots: GraphemeSlot[], query: UnitOutcomeQuery): GraphemePresentation {
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

function unitOutcomeFor(unit: number, unitIndex: number, query: UnitOutcomeQuery): GraphemeCorrectness {
    return query.unitOutcomeAt(unit) === 'incorrect' ? 'incorrect' : unit < unitIndex ? 'correct' : 'pending'
}

function activeBranchKey(unitIndex: number, startUnit: number, slots: GraphemeSlot[], query: UnitOutcomeQuery): string {
    let key = `${unitIndex}|${startUnit}`
    for (const slot of slots) {
        key += `|${slot.text}|${slot.unitLocal}|${unitOutcomeFor(startUnit + slot.unitLocal, unitIndex, query)}`
    }
    return key
}

let activeBranchCache: { key: string; value: GraphemePresentation } | null = null

export function rangeHasIncorrect(outcomes: UnitOutcomeQuery, startUnit: number, endUnit: number): boolean {
    for (let i = startUnit; i < endUnit; i += 1) {
        if (outcomes.unitOutcomeAt(i) === 'incorrect') return true
    }
    return false
}

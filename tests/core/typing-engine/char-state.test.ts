import { describe, expect, it } from 'vitest'

import { logicalSlotsForCluster, type GraphemeSlot } from '@/core/typing-engine/sequence'
import {
    cursorProgressInCluster,
    graphemePresentation,
    isCurrentGrapheme,
    rangeHasIncorrect,
    type GraphemeCorrectness,
    type UnitOutcomeQuery,
} from '@/core/typing-engine/char-state'

/** `ကျောင်း`'s logical code points map to press units [ေ,က,ျ,ာ,င,်,း]. */
function slotsOf(logical: string, press: string): GraphemeSlot[] {
    return logicalSlotsForCluster(logical, Array.from(press))
}

function queryOf(outcomes: Array<[number, boolean]>): UnitOutcomeQuery {
    const map = new Map(outcomes)
    return { unitOutcomeAt: (i: number) => (map.has(i) ? (map.get(i) ? 'correct' : 'incorrect') : null) }
}

const EMPTY = queryOf([])

function slotStates(view: ReturnType<typeof graphemePresentation>): Array<{
    text: string
    outcome: GraphemeCorrectness
    completed: boolean
    isCurrent: boolean
}> {
    return (view.slots ?? []).map((s) => ({ text: s.text, outcome: s.outcome, completed: s.completed, isCurrent: s.isCurrent }))
}

/** `ရေ` — logical [ရ,ေ], press [ေ,ရ] → slot 0 (ရ)=unit 1, slot 1 (ေ)=unit 0. */
const RYE = slotsOf('ရေ', 'ေရ')

describe('logicalSlotsForCluster', () => {
    it('maps each logical code point to the press unit that produces it', () => {
        expect(RYE.map((s) => s.text)).toEqual(['ရ', 'ေ'])
        expect(RYE.map((s) => s.unitLocal)).toEqual([1, 0]) // pre-base vowel typed first
    })

    it('is identity for press-order-equal clusters including repeated code points', () => {
        const manya = slotsOf('မြန်မာ', 'မြန်မာ')
        expect(manya.map((s) => s.text)).toEqual(['မ', 'ြ', 'န', '်', 'မ', 'ာ'])
        // The second မ belongs to unit 4 (press order), not the first.
        expect(manya.map((s) => s.unitLocal)).toEqual([0, 1, 2, 3, 4, 5])
    })

    it('attributes stacked clusters in logical order', () => {
        const logical = Array.from('မင်္ဂ')
        const slots = slotsOf('မင်္ဂ', 'မင်္ဂ')
        expect(slots.map((s) => s.text)).toEqual(logical)
        // The kinzi stack's press order matches its logical order 1:1.
        expect(slots.map((s) => s.unitLocal)).toEqual(logical.map((_, i) => i))
    })

    it('single-unit graphemes (English/space) map to a single slot', () => {
        expect(slotsOf('h', 'h')).toEqual([{ text: 'h', unitLocal: 0 }])
        expect(slotsOf(' ', ' ')).toEqual([{ text: ' ', unitLocal: 0 }])
    })
})

describe('graphemePresentation (canonical per-unit render state)', () => {
    it('untouched graphemes → pending, not current, no unit slots', () => {
        expect(graphemePresentation(0, 4, RYE, EMPTY)).toEqual({ isCurrent: false, progress: 0, correctness: 'pending', slots: null })
        expect(graphemePresentation(3, 4, RYE, EMPTY)).toEqual({ isCurrent: false, progress: 0, correctness: 'pending', slots: null })
    })

    it('the grapheme under the caret is current with per-unit slots in logical order', () => {
        // Caret at unit 4 == start of ရေ: nothing consumed yet. The current
        // (active) slot is the unit about to be typed — ေ, whose keystroke
        // press comes first even though it renders after ရ.
        const fresh = graphemePresentation(4, 4, RYE, EMPTY)
        expect(fresh.isCurrent).toBe(true)
        expect(fresh.progress).toBe(0)
        expect(fresh.correctness).toBe('pending')
        expect(slotStates(fresh)).toEqual([
            { text: 'ရ', outcome: 'pending', completed: false, isCurrent: false },
            { text: 'ေ', outcome: 'pending', completed: false, isCurrent: true },
        ])
    })

    it('typing the FIRST unit makes only its own slot green — never the whole grapheme', () => {
        // The learner pressed unit 4 = ေ (logical slot 1). Logical slot 0 (ရ)
        // is still the upcoming/current target.
        const view = graphemePresentation(5, 4, RYE, queryOf([[4, true]]))
        expect(view.isCurrent).toBe(true)
        expect(view.progress).toBe(0.5)
        expect(view.correctness).toBe('pending')
        expect(slotStates(view)).toEqual([
            { text: 'ရ', outcome: 'pending', completed: false, isCurrent: true },
            { text: 'ေ', outcome: 'correct', completed: true, isCurrent: false },
        ])
    })

    it('a wrong press at the first unit marks exactly that unit incorrect with the caret stuck', () => {
        const view = graphemePresentation(4, 4, RYE, queryOf([[4, false]]))
        expect(view.isCurrent).toBe(true)
        expect(view.correctness).toBe('pending')
        expect(slotStates(view)).toEqual([
            { text: 'ရ', outcome: 'pending', completed: false, isCurrent: false },
            { text: 'ေ', outcome: 'incorrect', completed: false, isCurrent: true },
        ])
    })

    it('fully consumed graphemes flip to a committed verdict and drop the slot view', () => {
        const ok = graphemePresentation(6, 4, RYE, queryOf([[4, true], [5, true]]))
        expect(ok).toEqual({ isCurrent: false, progress: 1, correctness: 'correct', slots: null })
        const bad = graphemePresentation(6, 4, RYE, queryOf([[4, true], [5, false]]))
        expect(bad.correctness).toBe('incorrect')
        expect(bad.slots).toBeNull()
    })

    it('composing with an earlier error keeps later slots pending and the verdict pending', () => {
        // Unit 4 (ေ) correct, unit 5 (ရ) attempted wrong → unit 5 stays current.
        const view = graphemePresentation(5, 4, RYE, queryOf([[4, true], [5, false]]))
        expect(view.correctness).toBe('pending')
        expect(slotStates(view)).toEqual([
            { text: 'ရ', outcome: 'incorrect', completed: false, isCurrent: true },
            { text: 'ေ', outcome: 'correct', completed: true, isCurrent: false },
        ])
    })

    it('returns stable constant references for non-current chars (memo bailout)', () => {
        expect(graphemePresentation(0, 4, RYE, EMPTY)).toBe(graphemePresentation(1, 4, RYE, EMPTY))
        expect(graphemePresentation(6, 4, RYE, EMPTY)).toBe(graphemePresentation(7, 4, RYE, EMPTY))
        expect(graphemePresentation(6, 4, RYE, queryOf([[4, false]]))).toBe(graphemePresentation(7, 4, RYE, queryOf([[4, false]])))
    })

    it('returns the SAME object for the active grapheme while content is unchanged', () => {
        // React's useSyncExternalStore bails out only when the selector's
        // snapshot keeps its reference across unrelated store notifications —
        // the fresh `slots` array would otherwise defeat zustand's shallow
        // compare and trigger "Maximum update depth exceeded".
        const state = queryOf([[4, true], [5, false]])
        const a = graphemePresentation(5, 4, RYE, state)
        const b = graphemePresentation(5, 4, RYE, state)
        expect(a).toBe(b)
        expect(a.slots).toBe(b.slots)
        expect(a.slots![0]).toBe(b.slots![0])
        // A different positional outcome – even the same caret – rebuilds.
        const other = queryOf([[4, true], [5, true]])
        expect(graphemePresentation(5, 4, RYE, other)).not.toBe(a)
        // A different caret (same outcomes) is a different snapshot.
        expect(graphemePresentation(6, 4, RYE, state)).not.toBe(a)
    })

    it('handles zero-span clusters without dividing by zero', () => {
        expect(graphemePresentation(5, 5, [], EMPTY).correctness).toBe('correct')
        expect(graphemePresentation(6, 5, [], EMPTY).correctness).toBe('correct')
    })
})

describe('cursorProgressInCluster (STATE 1 — input/cursor progress)', () => {
    it('is 0 for every grapheme the caret has not reached yet', () => {
        expect(cursorProgressInCluster(0, 4, 8)).toBe(0)
        expect(cursorProgressInCluster(3, 4, 8)).toBe(0)
    })

    it('rises by unit-span in real time while the caret is inside the cluster', () => {
        expect(cursorProgressInCluster(4, 4, 8)).toBe(0)
        expect(cursorProgressInCluster(5, 4, 8)).toBe(0.25)
        expect(cursorProgressInCluster(6, 4, 8)).toBe(0.5)
        expect(cursorProgressInCluster(7, 4, 8)).toBe(0.75)
    })

    it('returns 1 for every fully consumed cluster', () => {
        expect(cursorProgressInCluster(8, 4, 8)).toBe(1)
        expect(cursorProgressInCluster(9, 4, 8)).toBe(1)
    })

    it('handles zero-span clusters without dividing by zero', () => {
        expect(cursorProgressInCluster(4, 4, 4)).toBe(1)
        expect(cursorProgressInCluster(5, 4, 4)).toBe(1)
    })
})

describe('rangeHasIncorrect', () => {
    const outcomes = queryOf([
        [4, false],
        [5, true],
    ])

    it('detects any incorrect unit across the range', () => {
        expect(rangeHasIncorrect(outcomes, 4, 8)).toBe(true)
        expect(rangeHasIncorrect(outcomes, 0, 4)).toBe(false)
        expect(rangeHasIncorrect(outcomes, 4, 5)).toBe(true)
    })

    it('ignores unanswered units', () => {
        expect(rangeHasIncorrect(outcomes, 7, 9)).toBe(false)
    })
})

describe('isCurrentGrapheme (active grapheme ≠ whole word)', () => {
    it('is true only while the caret unit is inside the grapheme range', () => {
        expect(isCurrentGrapheme(4, 4, 6)).toBe(true)
        expect(isCurrentGrapheme(5, 4, 6)).toBe(true)
        expect(isCurrentGrapheme(3, 4, 6)).toBe(false)
        expect(isCurrentGrapheme(6, 4, 6)).toBe(false)
    })

    it('still flags a single-unit (English) character as current, never its neighbours', () => {
        expect(isCurrentGrapheme(0, 0, 1)).toBe(true)
        expect(isCurrentGrapheme(1, 1, 2)).toBe(true)
        expect(isCurrentGrapheme(2, 2, 3)).toBe(true)
        expect(isCurrentGrapheme(0, 1, 2)).toBe(false)
        expect(isCurrentGrapheme(1, 0, 1)).toBe(false)
    })

    it('handles the end-of-text sentinel (past the last grapheme → false)', () => {
        expect(isCurrentGrapheme(3, 2, 3)).toBe(false)
    })
})

describe('English single-unit characters keep one-slot behavior (unchanged feel)', () => {
    const H = slotsOf('h', 'h')

    it('current while composing, green one keypress later', () => {
        const fresh = graphemePresentation(0, 0, H, EMPTY)
        expect(fresh.isCurrent).toBe(true)
        expect(fresh.correctness).toBe('pending')
        expect(slotStates(fresh)).toEqual([{ text: 'h', outcome: 'pending', completed: false, isCurrent: true }])

        const done = graphemePresentation(1, 0, H, queryOf([[0, true]]))
        expect(done.correctness).toBe('correct')
        expect(done.isCurrent).toBe(false)
        // One wrong press keeps the unit red until corrected.
        const wrong = graphemePresentation(0, 0, H, queryOf([[0, false]]))
        expect(slotStates(wrong)).toEqual([{ text: 'h', outcome: 'incorrect', completed: false, isCurrent: true }])
    })
})

describe('repeated graphemes keep per-grapheme isolation (က က က က)', () => {
    const graphemes = [
        { start: 0, end: 1, label: 'first က' },
        { start: 2, end: 3, label: 'second က' },
        { start: 4, end: 5, label: 'third က' },
        { start: 6, end: 7, label: 'fourth က' },
    ]

    it('highlights exactly one grapheme at any caret position', () => {
        for (const caret of [0, 2, 4, 6]) {
            const active = graphemes.filter((g) => isCurrentGrapheme(caret, g.start, g.end))
            expect(active, `caret ${caret}`).toHaveLength(1)
            expect(active[0]!.start, `caret ${caret}`).toBe(caret)
        }
    })

    it('does not highlight any grapheme when the caret sits on the space', () => {
        for (const caret of [1, 3, 5]) {
            const active = graphemes.filter((g) => isCurrentGrapheme(caret, g.start, g.end))
            expect(active, `caret on space ${caret}`).toHaveLength(0)
        }
    })
})
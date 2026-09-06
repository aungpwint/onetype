import { describe, expect, it } from 'vitest'

import {
    cursorProgressInCluster,
    flashIndexMatches,
    graphemeCorrectness,
    graphemeViewState,
    isCurrentGrapheme,
    rangeHasIncorrect,
} from '@/core/typing-engine/char-state'

describe('graphemeViewState (single canonical render state)', () => {
    it('untouched graphemes → pending, not current, progress 0', () => {
        // Caret before the grapheme's unit range [4,8).
        expect(graphemeViewState(0, 4, 8, false)).toEqual({ isCurrent: false, progress: 0, correctness: 'pending' })
        expect(graphemeViewState(3, 4, 8, false)).toEqual({ isCurrent: false, progress: 0, correctness: 'pending' })
    })

    it('the grapheme under the caret is current with a real-time progress fraction', () => {
        // 4-unit grapheme risen from unit 4 to unit 6 → 50% consumed.
        expect(graphemeViewState(5, 4, 8, false)).toEqual({ isCurrent: true, progress: 0.25, correctness: 'pending' })
        expect(graphemeViewState(6, 4, 8, false)).toEqual({ isCurrent: true, progress: 0.5, correctness: 'pending' })
        // Even with an error already inside, mid-composition stays pending.
        expect(graphemeViewState(6, 4, 8, true)).toEqual({ isCurrent: true, progress: 0.5, correctness: 'pending' })
    })

    it('fully consumed graphemes flip to a committed verdict', () => {
        expect(graphemeViewState(8, 4, 8, false)).toEqual({ isCurrent: false, progress: 1, correctness: 'correct' })
        expect(graphemeViewState(9, 4, 8, true)).toEqual({ isCurrent: false, progress: 1, correctness: 'incorrect' })
    })

    it('returns stable constant references for non-current chars (memo bailout)', () => {
        expect(graphemeViewState(0, 4, 8, false)).toBe(graphemeViewState(1, 4, 8, false))
        expect(graphemeViewState(8, 4, 8, false)).toBe(graphemeViewState(9, 4, 8, false))
        expect(graphemeViewState(8, 4, 8, true)).toBe(graphemeViewState(9, 4, 8, true))
        // The active grapheme is always a fresh object (progress is changing).
        expect(graphemeViewState(5, 4, 8, false)).not.toBe(graphemeViewState(6, 4, 8, false))
    })

    it('handles zero-span clusters without dividing by zero', () => {
        expect(graphemeViewState(5, 5, 5, false)).toEqual({ isCurrent: false, progress: 1, correctness: 'correct' })
        expect(graphemeViewState(6, 5, 5, false)).toEqual({ isCurrent: false, progress: 1, correctness: 'correct' })
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

describe('flashIndexMatches', () => {
    it('matches only the cluster containing the wrong unit', () => {
        expect(flashIndexMatches(5, 4, 8)).toBe(true)
        expect(flashIndexMatches(4, 4, 8)).toBe(true)
        expect(flashIndexMatches(8, 4, 8)).toBe(false)
        expect(flashIndexMatches(undefined, 4, 8)).toBe(false)
    })
})

describe('rangeHasIncorrect', () => {
    const outcomes = new Map<number, boolean>([
        [4, false],
        [5, true],
        [6, true],
    ])
    const query = { unitOutcomeAt: (i: number) => (outcomes.has(i) ? (outcomes.get(i) ? 'correct' : 'incorrect') : null) }

    it('detects any incorrect unit across the range', () => {
        expect(rangeHasIncorrect(query, 4, 8)).toBe(true)
        expect(rangeHasIncorrect(query, 0, 4)).toBe(false)
        expect(rangeHasIncorrect(query, 4, 5)).toBe(true)
    })

    it('ignores unanswered units', () => {
        expect(rangeHasIncorrect(query, 7, 9)).toBe(false)
    })
})

describe('graphemeCorrectness (core rule: keyboard input progress ≠ grapheme correctness)', () => {
    it('stays pending while the caret is inside the grapheme (not yet fully consumed)', () => {
        // A 2-unit Myanmar grapheme like ရေ [0,2). After typing only the first
        // unit (pre-base vowel ေ, reordered by the keyboard), the grapheme is
        // mid-composition and must remain pending — never green.
        expect(graphemeCorrectness(0, 2, false)).toBe('pending')
        expect(graphemeCorrectness(1, 2, false)).toBe('pending')
    })

    it('becomes correct ONLY after the fully consumed grapheme was typed correctly', () => {
        expect(graphemeCorrectness(2, 2, false)).toBe('correct')
        expect(graphemeCorrectness(6, 6, false)).toBe('correct')
    })

    it('becomes incorrect only once fully consumed and an error was typed inside', () => {
        expect(graphemeCorrectness(2, 2, true)).toBe('incorrect')
        // Mid-composition errors are not yet a final verdict: stay pending.
        expect(graphemeCorrectness(1, 2, true)).toBe('pending')
    })

    it('English single-unit characters turn correct one keypress later (unchanged feel)', () => {
        // 'h' [0,1): before typing it is pending; after typing (unit 1) it is
        // correct — same as the existing character-by-character behavior.
        expect(graphemeCorrectness(0, 1, false)).toBe('pending')
        expect(graphemeCorrectness(1, 1, false)).toBe('correct')
        expect(graphemeCorrectness(1, 1, true)).toBe('incorrect')
    })
})

describe('isCurrentGrapheme (active grapheme ≠ whole word)', () => {
    it('is true only while the caret unit is inside the grapheme range', () => {
        // A 2-unit grapheme (e.g. a 2-keystroke Myanmar syllable).
        expect(isCurrentGrapheme(4, 4, 6)).toBe(true)
        expect(isCurrentGrapheme(5, 4, 6)).toBe(true)
        // Before it starts and after it ends → NOT current.
        expect(isCurrentGrapheme(3, 4, 6)).toBe(false)
        expect(isCurrentGrapheme(6, 4, 6)).toBe(false)
    })

    it('still flags a single-unit (English) character as current, never its neighbours', () => {
        // 3 repeated English characters, each a 1-unit grapheme:
        // units 0..3 → "a a a" each [i, i+1).
        expect(isCurrentGrapheme(0, 0, 1)).toBe(true) // first 'a' being typed
        expect(isCurrentGrapheme(1, 1, 2)).toBe(true) // second 'a' being typed
        expect(isCurrentGrapheme(2, 2, 3)).toBe(true) // third 'a' being typed
        // Only the one under the caret is current; neighbours are not.
        expect(isCurrentGrapheme(0, 1, 2)).toBe(false)
        expect(isCurrentGrapheme(1, 0, 1)).toBe(false)
    })

    it('handles the end-of-text sentinel (past the last grapheme → false)', () => {
        expect(isCurrentGrapheme(3, 2, 3)).toBe(false)
    })
})

describe('repeated graphemes keep per-grapheme isolation (က က က က)', () => {
    // "က က က က" — four identical 1-unit Myanmar graphemes separated by spaces.
    // Each grapheme has a distinct [startUnit, endUnit), so the active highlight
    // must never bleed across identical neighbours.
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
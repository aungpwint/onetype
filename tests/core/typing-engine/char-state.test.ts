import { describe, expect, it } from 'vitest'

import { CHAR_PENDING, charRenderState, clusterPhaseCode, flashIndexMatches, rangeHasIncorrect } from '@/core/typing-engine/char-state'

describe('clusterPhaseCode', () => {
    it('marks untouched clusters pending', () => {
        expect(clusterPhaseCode(0, 4, 8)).toBe(CHAR_PENDING)
        expect(clusterPhaseCode(3, 4, 8)).toBe(CHAR_PENDING)
    })

    it('encodes the current cluster as a progress fraction in [1, 2)', () => {
        expect(clusterPhaseCode(4, 4, 8)).toBe(1)
        expect(clusterPhaseCode(6, 4, 8)).toBe(1.5)
        expect(clusterPhaseCode(8, 4, 8)).toBe(2)
    })

    it('caps progress for the last unit of a cluster', () => {
        expect(clusterPhaseCode(7, 4, 8)).toBe(1.75)
        expect(clusterPhaseCode(0, 0, 1)).toBe(1)
        expect(clusterPhaseCode(1, 0, 1)).toBe(2)
    })

    it('handles zero-span clusters without dividing by zero', () => {
        expect(clusterPhaseCode(5, 5, 5)).toBe(2)
        expect(clusterPhaseCode(6, 5, 5)).toBe(2)
    })
})

describe('charRenderState', () => {
    it('distinguishes pending, current, correct and incorrect', () => {
        expect(charRenderState(0, 4, 8, false)).toEqual({ visual: 'pending', progress: 0 })
        expect(charRenderState(5, 4, 8, false)).toEqual({ visual: 'current', progress: 0.25 })
        expect(charRenderState(8, 4, 8, false)).toEqual({ visual: 'correct', progress: 1 })
        expect(charRenderState(8, 4, 8, true)).toEqual({ visual: 'incorrect', progress: 1 })
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
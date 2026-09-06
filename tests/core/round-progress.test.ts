import { describe, expect, it } from 'vitest'

import { roundProgressFraction } from '@/core/progress/round-progress'

describe('roundProgressFraction', () => {
    it('measures timed papers by elapsed time', () => {
        expect(roundProgressFraction({ elapsedSeconds: 30, durationSeconds: 60, unitIndex: 0, totalUnits: 100 })).toBe(0.5)
    })

    it('measures untimed rounds by typed units', () => {
        expect(roundProgressFraction({ elapsedSeconds: 999, durationSeconds: null, unitIndex: 25, totalUnits: 100 })).toBe(0.25)
    })

    it('clamps past the end of a paper', () => {
        expect(roundProgressFraction({ elapsedSeconds: 75, durationSeconds: 60, unitIndex: 0, totalUnits: 100 })).toBe(1)
    })

    it('clamps past the last unit', () => {
        expect(roundProgressFraction({ elapsedSeconds: 0, durationSeconds: null, unitIndex: 120, totalUnits: 100 })).toBe(1)
    })

    it('never goes below zero', () => {
        expect(roundProgressFraction({ elapsedSeconds: -5, durationSeconds: 60, unitIndex: -2, totalUnits: 100 })).toBe(0)
    })

    it('falls back to zero when nothing meaningful is known', () => {
        expect(roundProgressFraction({ elapsedSeconds: 0, durationSeconds: null, unitIndex: 0, totalUnits: 0 })).toBe(0)
    })
})
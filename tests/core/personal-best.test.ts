import { describe, expect, it } from 'vitest'

import { computePersonalBest } from '@/core/scoring/personal-best'

describe('computePersonalBest', () => {
    it('treats the first ever round as a new personal best', () => {
        const info = computePersonalBest([], 42)
        expect(info.previousBest).toBeNull()
        expect(info.isNewBest).toBe(true)
        expect(info.improvedBy).toBe(0)
        expect(info.total).toBe(0)
    })

    it('crowns a round that beats the previous best and reports the gain', () => {
        const info = computePersonalBest([30, 42, 37], 45)
        expect(info.previousBest).toBe(42)
        expect(info.isNewBest).toBe(true)
        expect(info.improvedBy).toBe(3)
        expect(info.total).toBe(3)
    })

    it('does not crown a round that matches or trails the best', () => {
        const equal = computePersonalBest([42], 42)
        expect(equal.isNewBest).toBe(false)
        expect(equal.improvedBy).toBe(0)
        const slower = computePersonalBest([30, 42, 37], 38)
        expect(slower.isNewBest).toBe(false)
        expect(slower.improvedBy).toBe(0)
        expect(slower.previousBest).toBe(42)
    })

    it('ignores non-positive and non-finite prior speeds', () => {
        const info = computePersonalBest([0, -5, Number.NaN, 20, Infinity], 25)
        expect(info.previousBest).toBe(20)
        expect(info.total).toBe(1)
        expect(info.isNewBest).toBe(true)
    })

    it('never crowns a zero-speed round', () => {
        const info = computePersonalBest([42], 0)
        expect(info.isNewBest).toBe(false)
        expect(info.improvedBy).toBe(0)
    })

    it('returns a zero-gain tolerated best for empty-but-zero input', () => {
        const info = computePersonalBest([], 0)
        expect(info.previousBest).toBeNull()
        expect(info.isNewBest).toBe(false)
        expect(info.total).toBe(0)
    })
})

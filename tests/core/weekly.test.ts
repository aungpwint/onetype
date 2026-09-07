import { describe, expect, it } from 'vitest'

import { buildWeekBars } from '@/core/progress/weekly'

// 2026-09-06 is a Sunday.
const SUNDAY_START = new Date(2026, 8, 6).getTime()

describe('buildWeekBars', () => {
    it('labels each bar by its weekday and flags today', () => {
        const bars = buildWeekBars(new Array(7).fill(0) as number[], SUNDAY_START)
        expect(bars.map((b) => b.label)).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
        expect(bars.map((b) => b.isToday)).toEqual([false, false, false, false, false, false, true])
        expect(bars.map((b) => b.offset)).toEqual([-6, -5, -4, -3, -2, -1, 0])
    })

    it('scales fractions against the busiest day', () => {
        const bars = buildWeekBars([0, 0, 0, 0, 0, 5, 20], SUNDAY_START)
        expect(bars[5].fraction).toBeCloseTo(0.25)
        expect(bars[6].fraction).toBeCloseTo(1)
    })

    it('treats missing and negative minutes as zero', () => {
        const bars = buildWeekBars([-3, 2] as number[], SUNDAY_START)
        expect(bars[0].minutes).toBe(0)
        expect(bars[1].minutes).toBe(2)
    })

    it('never divides by zero on a fully idle week', () => {
        const bars = buildWeekBars(new Array(7).fill(0) as number[], SUNDAY_START)
        expect(bars.every((b) => b.fraction === 0)).toBe(true)
    })
})

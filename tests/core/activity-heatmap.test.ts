import { describe, expect, it } from 'vitest'
import { aggregateActivity, toUtcMidnight, cellLevel } from '@/lib/activity-data'

const DAY = 24 * 60 * 60 * 1000

/** UTC-midnight of a fixed past date to avoid cross-midnight flakiness. */
const FIXED = toUtcMidnight(Date.now() - DAY * 3)

describe('activity-heatmap aggregation', () => {
    it('groups multiple sessions on the same day by UTC midnight', () => {
        const map = aggregateActivity([
            { date: FIXED + 10_000, minutes: 5, sessions: 1 },
            { date: FIXED + 3_600_000, minutes: 3, sessions: 1 },
        ])
        expect(map.size).toBe(1)
        const day = map.get(FIXED)
        expect(day?.minutes).toBeCloseTo(8, 5)
        expect(day?.sessions).toBe(2)
    })

    it('returns the day key at UTC midnight regardless of local offset', () => {
        const map = aggregateActivity([{ date: FIXED + 100_000, minutes: 1, sessions: 1 }])
        for (const key of map.keys()) {
            expect(toUtcMidnight(key)).toBe(key)
            expect(new Date(key).getUTCHours()).toBe(0)
        }
    })

    it('splits sessions across distinct days', () => {
        const map = aggregateActivity([
            { date: FIXED, minutes: 5, sessions: 1 },
            { date: FIXED - DAY, minutes: 2, sessions: 1 },
        ])
        expect(map.size).toBe(2)
    })
})

describe('activity-heatmap cell level', () => {
    it('clamps to the max bucket at full relative intensity', () => {
        expect(cellLevel(0, 50)).toBe(0)
        expect(cellLevel(50, 50)).toBe(4)
        expect(cellLevel(40, 50)).toBe(4)
    })

    it('buckets steadily by ratio', () => {
        expect(cellLevel(10, 50)).toBe(1)  // ratio 0.2
        expect(cellLevel(15, 50)).toBe(2)  // ratio 0.3
        expect(cellLevel(20, 50)).toBe(2)  // ratio 0.4
        expect(cellLevel(25, 50)).toBe(2)  // ratio 0.5
        expect(cellLevel(30, 50)).toBe(3)  // ratio 0.6
        expect(cellLevel(40, 50)).toBe(4)  // ratio 0.8
    })
})
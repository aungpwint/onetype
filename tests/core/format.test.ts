import { describe, expect, it } from 'vitest'
import { formatDuration, timerProportion } from '@/lib/format'

describe('timerProportion', () => {
    it('is 1 at full time remaining and 0 when expired', () => {
        expect(timerProportion(60, 60)).toBe(1)
        expect(timerProportion(0, 60)).toBe(0)
    })

    it('clamps to the [0, 1] range', () => {
        expect(timerProportion(120, 60)).toBe(1)
        expect(timerProportion(-5, 60)).toBe(0)
    })

    it('guards against a zero/negative total', () => {
        expect(timerProportion(10, 0)).toBe(0)
        expect(timerProportion(10, -5)).toBe(0)
    })
})

describe('formatDuration', () => {
    it('renders m:ss with zero padding', () => {
        expect(formatDuration(90_000)).toBe('1:30')
        expect(formatDuration(5_000)).toBe('0:05')
        expect(formatDuration(120_000)).toBe('2:00')
    })
})

import { describe, expect, it } from 'vitest'

import { characterBreakdown, breakdownUnit } from '@/core/session/character-breakdown'

describe('character breakdown', () => {
    it('treats English attempts as characters', () => {
        const bd = characterBreakdown(50, 5, 50, 'wpm')
        expect(bd).toEqual({ correct: 50, wrong: 5, progress: 50, total: 55 })
        expect(breakdownUnit('wpm')).toBe('characters')
    })

    it('reports Myanmar clusters as the correct measure, keeping wrong presses separate', () => {
        const bd = characterBreakdown(40, 7, 12, 'units/min')
        expect(bd).toEqual({ correct: 12, wrong: 7, progress: 12, total: 47 })
        expect(breakdownUnit('units/min')).toBe('clusters')
    })

    it('handles a clean round with zero wrong presses', () => {
        expect(characterBreakdown(80, 0, 80, 'wpm').wrong).toBe(0)
        expect(characterBreakdown(24, 0, 24, 'units/min').wrong).toBe(0)
    })
})

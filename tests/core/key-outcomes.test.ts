import { describe, expect, it } from 'vitest'

import {
    summarizeKeyTaps,
    keyTapTone,
    worstKeys,
    type KeyTap,
} from '@/core/session/key-outcomes'

function outcomeMap(entries: Record<string, { correct: number; incorrect: number }>): Map<string, { correct: number; incorrect: number }> {
    return new Map(Object.entries(entries))
}

describe('key tap summaries', () => {
    it('returns an empty, 100%-accurate summary for no keystrokes', () => {
        const summary = summarizeKeyTaps(new Map())
        expect(summary.totalKeystrokes).toBe(0)
        expect(summary.distinctKeys).toBe(0)
        expect(summary.keys).toEqual([])
        expect(summary.errorKeys).toEqual([])
        expect(summary.keystrokeAccuracy).toBe(100)
        expect(worstKeys(summary)).toEqual([])
    })

    it('counts correct and incorrect keystrokes per physical key', () => {
        const summary = summarizeKeyTaps(outcomeMap({ 'KeyA:none': { correct: 5, incorrect: 1 }, 'KeyS:none': { correct: 3, incorrect: 0 } }))
        expect(summary.totalKeystrokes).toBe(9)
        expect(summary.distinctKeys).toBe(2)
        expect(summary.keystrokeAccuracy).toBeCloseTo((8 / 9) * 100, 5)

        const a = summary.keys.find((k) => k.id === 'KeyA:none')
        expect(a).toMatchObject({ code: 'KeyA', modifier: 'none', correct: 5, incorrect: 1 })
    })

    it('parses shift-modifier ids', () => {
        const summary = summarizeKeyTaps(outcomeMap({ 'KeyS:shift': { correct: 4, incorrect: 2 } }))
        const tap = summary.keys[0]
        expect(tap.id).toBe('KeyS:shift')
        expect(tap.modifier).toBe('shift')
        expect(tap.code).toBe('KeyS')
    })

    it('keeps functional-key ids without a modifier suffix intact', () => {
        const summary = summarizeKeyTaps(outcomeMap({ Backspace: { correct: 0, incorrect: 2 } }))
        expect(summary.keys[0]).toMatchObject({ id: 'Backspace', code: 'Backspace', modifier: 'none' })
    })

    it('lists error keys worst-first', () => {
        const summary = summarizeKeyTaps(
            outcomeMap({
                'KeyA:none': { correct: 9, incorrect: 1 },
                'KeyB:none': { correct: 1, incorrect: 4 },
                'KeyC:none': { correct: 2, incorrect: 4 },
                'KeyD:none': { correct: 8, incorrect: 0 },
            }),
        )
        expect(summary.errorKeys.map((k) => k.id)).toEqual(['KeyB:none', 'KeyC:none', 'KeyA:none'])
    })

    it('breaks incorrect-count ties by fewest correct presses', () => {
        const summary = summarizeKeyTaps(outcomeMap({ 'KeyB:none': { correct: 5, incorrect: 3 }, 'KeyA:none': { correct: 2, incorrect: 3 } }))
        expect(summary.errorKeys.map((k) => k.id)).toEqual(['KeyA:none', 'KeyB:none'])
    })

    it('worstKeys honours the limit and only surfaces keys with errors', () => {
        const summary = summarizeKeyTaps(
            outcomeMap({
                'KeyA:none': { correct: 1, incorrect: 2 },
                'KeyB:none': { correct: 1, incorrect: 2 },
                'KeyC:none': { correct: 1, incorrect: 2 },
                'KeyD:none': { correct: 5, incorrect: 0 },
            }),
        )
        expect(worstKeys(summary, 2)).toHaveLength(2)
        expect(worstKeys(summary, 2).every((k) => k.incorrect > 0)).toBe(true)
    })

    it('classifies tones: clean, slip, heavy', () => {
        const clean: KeyTap = { id: 'KeyA:none', code: 'KeyA', modifier: 'none', correct: 7, incorrect: 0 }
        const slip: KeyTap = { id: 'KeyB:none', code: 'KeyB', modifier: 'none', correct: 7, incorrect: 2 }
        const heavy: KeyTap = { id: 'KeyC:none', code: 'KeyC', modifier: 'none', correct: 2, incorrect: 5 }
        expect(keyTapTone(clean)).toBe('clean')
        expect(keyTapTone(slip)).toBe('slip')
        expect(keyTapTone(heavy)).toBe('heavy')
    })
})
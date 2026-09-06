import { describe, expect, it } from 'vitest'

import { resolvedPracticePreferences } from '@/core/practice/preferences'

describe('resolvedPracticePreferences', () => {
    it('falls back to defaults on empty input', () => {
        expect(resolvedPracticePreferences({})).toEqual({ unit: 'time', time: 30, words: 25, lang: 'english' })
    })

    it('accepts valid time presets', () => {
        expect(resolvedPracticePreferences({ time: 90 }).time).toBe(90)
    })

    it('rejects invalid time presets back to 30', () => {
        expect(resolvedPracticePreferences({ time: 33 }).time).toBe(30)
        expect(resolvedPracticePreferences({ time: 0 }).time).toBe(30)
    })

    it('accepts valid word presets', () => {
        expect(resolvedPracticePreferences({ unit: 'words', words: 50 })).toEqual({ unit: 'words', time: 30, words: 50, lang: 'english' })
    })

    it('rejects invalid words back to 25', () => {
        expect(resolvedPracticePreferences({ words: 42 }).words).toBe(25)
    })

    it('normalises any unknown unit back to time', () => {
        expect(resolvedPracticePreferences({ unit: 'characters' })).toEqual({ unit: 'time', time: 30, words: 25, lang: 'english' })
    })
})
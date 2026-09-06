import { describe, expect, it } from 'vitest'
import { computeScore } from '@/core/scoring/score'
import { englishProfile, myanmarProfile, profileFor } from '@/core/languages'
import { splitMyanmarSyllables } from '@/core/unicode/myanmar'

describe('language-aware metrics', () => {
    it('scores English in WPM using the 5-unit word convention', () => {
        const m = computeScore({ correctAttempts: 150, incorrectAttempts: 0, backspaceCount: 0, elapsedSeconds: 60, language: 'english' })
        expect(m.speedUnit).toBe('wpm')
        expect(m.speed).toBeCloseTo(30, 5)
        expect(m.grossWpm).toBeCloseTo(30, 5)
        expect(m.language).toBe('english')
    })

    it('reports raw English speed counting every keystroke', () => {
        const m = computeScore({ correctAttempts: 150, incorrectAttempts: 10, backspaceCount: 0, elapsedSeconds: 60, language: 'english' })
        expect(m.rawSpeed).toBeCloseTo(32, 5)
    })

    it('scores Myanmar honestly as typing units per minute', () => {
        // 240 keystrokes in 60s = 240 units/min — the 5-unit "word" fiction must
        // not be applied to Myanmar clusters.
        const m = computeScore({ correctAttempts: 240, incorrectAttempts: 0, backspaceCount: 0, elapsedSeconds: 60, language: 'myanmar' })
        expect(m.speedUnit).toBe('units/min')
        expect(m.speed).toBeCloseTo(240, 5)
        expect(m.consistency).toBe(100)
    })

    it('includes completed grapheme clusters in the metrics', () => {
        const m = computeScore({
            correctAttempts: 40,
            incorrectAttempts: 0,
            backspaceCount: 0,
            elapsedSeconds: 30,
            language: 'myanmar',
            clusters: 12,
        })
        expect(m.graphemeClusters).toBe(12)
    })

    it('computed consistency discounts erratic pacing', () => {
        const steady = computeScore({
            correctAttempts: 10,
            incorrectAttempts: 0,
            backspaceCount: 0,
            elapsedSeconds: 2,
            correctTimes: [0, 200, 400, 600, 800, 1000, 1200, 1400, 1600, 1800],
        })
        expect(steady.consistency).toBeGreaterThanOrEqual(95)
        const erratic = computeScore({
            correctAttempts: 10,
            incorrectAttempts: 0,
            backspaceCount: 0,
            elapsedSeconds: 2,
            correctTimes: [0, 100, 200, 300, 1900, 1910, 1920, 1930, 1940, 1950],
        })
        expect(erratic.consistency).toBeLessThan(steady.consistency)
    })

    it('resolves per-language profiles', () => {
        expect(profileFor('english')).toBe(englishProfile)
        expect(profileFor('myanmar')).toBe(myanmarProfile)
        expect(englishProfile.speedUnit).toBe('wpm')
        expect(myanmarProfile.speedUnit).toBe('units/min')
    })

    it('segments Myanmar text into syllable clusters via the profile', () => {
        const text = 'မြန်မာဘာသာ'
        const units = myanmarProfile.splitUnits(text)
        expect(units.join('')).toBe(text)
        expect(units.length).toBeGreaterThan(0)
        expect(units).toEqual(splitMyanmarSyllables(text))
    })
})
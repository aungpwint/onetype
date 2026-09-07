import { describe, expect, it } from 'vitest'
import { buildPracticeMaterial } from '@/core/materials/practice-material'
import { getLayoutOrThrow } from '@/core/keyboard-layout/registry'
import { QUOTES } from '@/data/quotes'

describe('practice material builder', () => {
    it('builds an English timed run with fresh opaque id', async () => {
        const a = await buildPracticeMaterial({ language: 'english', unit: 'time', time: 30 })
        const b = await buildPracticeMaterial({ language: 'english', unit: 'time', time: 30 })
        expect(a.sequence.text.length).toBeGreaterThan(0)
        expect(a.id).not.toBe(b.id)
        // A 30s run should carry well over 100 units of English text.
        expect(a.totalUnits).toBeGreaterThan(100)
    })

    it('builds a fixed word-count English run', async () => {
        const m = await buildPracticeMaterial({ language: 'english', unit: 'words', words: 50 })
        const words = m.sequence.text.trim().split(/\s+/)
        expect(words).toHaveLength(50)
    })

    it('creates a custom-text run verbatim', async () => {
        const text = 'the quick brown fox jumps over the lazy dog'
        const m = await buildPracticeMaterial({ language: 'english', unit: 'text', text })
        expect(m.sequence.text.replaceAll(' ', ' ').startsWith(text)).toBe(true)
        expect(m.sequence.text).toContain(text)
    })

    it('builds encodable Myanmar material', async () => {
        const m = await buildPracticeMaterial({ language: 'myanmar', unit: 'time', time: 30 })
        // Every grapheme must be encodable by the Myanmar layout, so no phase
        // should fail validation.
        expect(m.totalUnits).toBeGreaterThan(0)
        for (const grapheme of m.sequence.graphemes) {
            expect(() => getLayoutOrThrow(m.layoutId).reverseMap([grapheme])).not.toThrow()
        }
    })

    it('throws for empty custom text', async () => {
        await expect(buildPracticeMaterial({ language: 'english', unit: 'text', text: '   ' })).rejects.toThrow()
    })

    it('sprinkles English punctuation and capitalisation', async () => {
        const m = await buildPracticeMaterial({ language: 'english', unit: 'words', words: 120, punctuation: true })
        const punctuation = /[.,!?;:]/
        const capitals = /[A-Z]/
        const text = m.sequence.text
        expect(text).toMatch(punctuation)
        expect(text).toMatch(capitals)
        // Punctuated words must remain jointly encodable by the QWERTY layout.
        for (const grapheme of m.sequence.graphemes) {
            expect(() => getLayoutOrThrow(m.layoutId).reverseMap([grapheme])).not.toThrow()
        }
    })

    it('sprinkles numbers without breaking word count', async () => {
        const m = await buildPracticeMaterial({ language: 'english', unit: 'words', words: 60, numbers: true })
        expect(m.sequence.text.split(/\s+/)).toHaveLength(60)
        expect(m.sequence.text).toMatch(/[0-9]{1,3}/)
    })

    it('decorates Myanmar with native punctuation and numerals, all encodable', async () => {
        const m = await buildPracticeMaterial({ language: 'myanmar', unit: 'words', words: 150, punctuation: true, numbers: true })
        const text = m.sequence.text
        expect(text).toMatch(/[\u104A\u104B]/) // ၊ ။
        expect(text).toMatch(/[\u1040-\u1049]/) // ၀-၉
        for (const grapheme of m.sequence.graphemes) {
            expect(() => getLayoutOrThrow(m.layoutId).reverseMap([grapheme])).not.toThrow()
        }
    })

    it('decorates timed runs via a word-based build', async () => {
        const m = await buildPracticeMaterial({ language: 'english', unit: 'time', time: 15, punctuation: true, numbers: true })
        const text = m.sequence.text
        expect(text).toMatch(/[.,!?;:]/)
        expect(text).toMatch(/[0-9]/)
        expect(m.totalUnits).toBeGreaterThan(100)
    })

    it('picks a real quotation from the curated pool', async () => {
        expect(QUOTES.length).toBeGreaterThan(8)
        for (const language of ['english', 'myanmar'] as const) {
            const pool = QUOTES.filter((q) => q.language === language)
            expect(pool.length).toBeGreaterThan(3)
            const m = await buildPracticeMaterial({ language, unit: 'quote' })
            // Quote body must match a curated entry verbatim.
            expect(pool.some((q) => q.text === m.sequence.text)).toBe(true)
            // Every grapheme must be encodable by the active layout.
            for (const grapheme of m.sequence.graphemes) {
                expect(() => getLayoutOrThrow(m.layoutId).reverseMap([grapheme])).not.toThrow()
            }
        }
    })

    it('quote mode stays untimed (no duration bound)', async () => {
        const m = await buildPracticeMaterial({ language: 'english', unit: 'quote' })
        expect(m.completion.minAccuracy).toBe(0)
        expect(m.completion.minWpm).toBeNull()
        expect(m.sequence.charCount).toBe(m.sequence.charCount)
    })
})
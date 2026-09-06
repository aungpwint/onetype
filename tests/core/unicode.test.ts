import { describe, expect, it } from 'vitest'
import { splitGraphemes, graphemeCount } from '@/core/unicode/graphemes'
import {
    containsMyanmar,
    detectLanguage,
    isMyanmarText,
    findSuspiciousInvisibleCharacters,
    containsUnexpectedInvisibleCharacters,
    validateMyanmarText,
    normalizeMyanmarText,
    segmentMyanmarText,
} from '@/core/unicode/myanmar'

describe('grapheme segmentation', () => {
    it('splits ASCII into single graphemes', () => {
        expect(splitGraphemes('abc')).toEqual(['a', 'b', 'c'])
    })

    it('collects combining marks with their base', () => {
        const clusters = splitGraphemes('\u1000\u102D\u102F\u1037')
        expect(clusters.length).toBe(1)
        expect(clusters[0]).toBe('\u1000\u102D\u102F\u1037')
    })

    it('counts graphemes correctly for English', () => {
        expect(graphemeCount('hello world')).toBe(11)
    })
})

describe('myanmar helpers', () => {
    it('detects Myanmar text', () => {
        expect(containsMyanmar('မြန်မာ english')).toBe(true)
        expect(containsMyanmar('hello')).toBe(false)
    })

    it('detects language of a sample', () => {
        expect(detectLanguage('မင်္ဂလာပါ')).toBe('myanmar')
        expect(detectLanguage('Hello')).toBe('english')
    })

    it('isMyanmarText distinguishes script-bearing strings from ASCII', () => {
        expect(isMyanmarText('ရေ ဆန်')).toBe(true)
        expect(isMyanmarText('Lesson 23')).toBe(false)
    })
})

describe('Myanmar invisible/format character policy', () => {
    it('flags the accidental ZWNJ before the preposed vowel U+1031', () => {
        // Regression: KeyA used to emit U+200C + U+1031.
        const corrupted = 'ရ\u200Cေ'
        expect(containsUnexpectedInvisibleCharacters(corrupted)).toBe(true)
        const found = findSuspiciousInvisibleCharacters(corrupted)
        expect(found).toHaveLength(1)
        expect(found[0].codePoint).toBe(0x200c)
        expect(found[0].description).toContain('zero width non-joiner')
        expect(validateMyanmarText(corrupted)[0].codePoint).toBe(0x200c)
    })

    it('flags ZWJ, ZWSP, BOM and CGJ as unexpected', () => {
        for (const [label, char] of [
            ['ZWJ', '\u200D'],
            ['ZWSP', '\u200B'],
            ['BOM', '\uFEFF'],
            ['CGJ', '\u034F'],
        ] as const) {
            expect(containsUnexpectedInvisibleCharacters(`\u1000${char}\u102C`), label).toBe(true)
        }
    })

    it('is quiet for clean canonical Myanmar text', () => {
        expect(validateMyanmarText('ရေ ဆန် ငါး ကြက်')).toEqual([])
        expect(containsUnexpectedInvisibleCharacters('မြန်မာစာ')).toBe(false)
    })

    it('rejects non-NFC normalization while NFC stays clean', () => {
        expect(validateMyanmarText('\u1021\u1039\u1001')).toEqual([])
        expect(validateMyanmarText('e\u0301')[0].message).toContain('NFC')
    })

    it('normalizeMyanmarText strips zero-width chars and composes to NFC', () => {
        expect(normalizeMyanmarText('\u200C\u1031\u1000')).toBe('\u1031\u1000')
        expect(normalizeMyanmarText('e\u0301')).toBe('\u00E9')
        expect(normalizeMyanmarText('ရေ')).toBe('ရေ')
    })

    it('segmentMyanmarText delegates to the syllable clusterer', () => {
        expect(segmentMyanmarText('ရေ')).toEqual(['ရေ'])
        expect(segmentMyanmarText('အ \u1000\u102C').join('')).toBe('အ \u1000\u102C')
    })
})

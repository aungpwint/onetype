import { describe, expect, it } from 'vitest'
import { splitMyanmarSyllables, containsMyanmar } from '@/core/unicode/myanmar'
import { buildSequence, clusterStartForUnit } from '@/core/typing-engine/sequence'
import { myanmar } from '@/core/keyboard-layout/myanmar'
import { englishQwerty } from '@/core/keyboard-layout/english-qwerty'

describe('Myanmar syllable cluster segmentation', () => {
    it('groups a base consonant with its medials, vowels and tone marks into one cluster', () => {
        // "ကျောင့်း" = ေ + က + ျ + င + ၚ-asat + း
        const word = '\u1031\u1000\u103B\u1004\u103A\u1038'
        expect(splitMyanmarSyllables(word)).toEqual([word])
    })

    it('keeps preposed vowel U+1031 attached to its following consonant cluster', () => {
        // "ေ" + "က" must not be split.
        const preposed = '\u1031\u1000\u103B\u102C'
        const clusters = splitMyanmarSyllables(preposed)
        expect(clusters).toHaveLength(1)
        expect(clusters[0]).toBe(preposed)
    })

    it('rejects the accidental ZWNJ-preposed-vowel sequence instead of folding it', () => {
        // Regression: KeyA used to emit U+200C + U+1031 and lesson text stored
        // that exact byte form. The invisible U+200C is not canonical Unicode
        // for this app, so sequence building must refuse it loudly.
        const corrupted = '\u200C\u1031\u1000'
        expect(() => buildSequence(corrupted, myanmar)).toThrow(/invisible character/)
        // And it must never fold back into a valid-looking cluster.
        expect(splitMyanmarSyllables(corrupted)).toEqual(['\u200C', '\u1031\u1000'])
    })

    it('keeps a final consonant (followed by asat) inside its syllable', () => {
        // "ငြိမ်" = င + ြ + ိ + မ + ၚ-asat -> one cluster
        const finalConsonant = '\u1004\u103C\u102D\u1019\u103A'
        expect(splitMyanmarSyllables(finalConsonant)).toEqual([finalConsonant])
    })

    it('groups stacked and kinzi clusters as a single unit', () => {
        // "က္ခ" (stacked) = က + ္ + ခ
        expect(splitMyanmarSyllables('\u1000\u1039\u1001')).toEqual(['\u1000\u1039\u1001'])
        // "င်္ခ" (kinzi) = င + ၚ-asat + ္ + ခ
        expect(splitMyanmarSyllables('\u1004\u103A\u1039\u1001')).toEqual(['\u1004\u103A\u1039\u1001'])
    })

    it('splits two independent syllables', () => {
        // "ကမ္ဘာ" = က + မ + ္ + ဘ + ာ -> [က, မ္ဘာ]
        expect(splitMyanmarSyllables('\u1000\u1019\u1039\u1018\u102C')).toEqual(['\u1000', '\u1019\u1039\u1018\u102C'])
    })

    it('concatenation property: rejoining clusters yields the original text', () => {
        const text = '\u1000\u102D \u101E\u102F\u1036 \u1031\u1000\u103B\u102C'
        expect(splitMyanmarSyllables(text).join('')).toBe(text)
    })

    it('returns non-Myanmar characters as their own clusters', () => {
        expect(splitMyanmarSyllables('a1 \u1000\u102C')).toEqual(['a', '1', ' ', '\u1000\u102C'])
    })
})

describe('Myanmar word-final preposed vowel (rendering regression)', () => {
    it('keeps a word-final preposed vowel U+1031 with its base when followed by a space', () => {
        // Reported broken case: "ရေ" followed by a space must stay one cluster.
        // Before the fix it split as ['ရ', 'ေ '], so the browser shaped ရ and ေ
        // in separate DOM runs and the orphaned ေ rendered with a dotted circle.
        expect(splitMyanmarSyllables('ရေ ဆန် ငါး ကြက်')).toEqual(['ရေ', ' ', 'ဆန်', ' ', 'ငါး', ' ', 'ကြက်'])
        expect(splitMyanmarSyllables('အဖေ အမေ ညီ ညီမ')).toEqual(['အ', 'ဖေ', ' ', 'အ', 'မေ', ' ', 'ညီ', ' ', 'ညီ', 'မ'])
        expect(splitMyanmarSyllables('မျက်စိ နား လက် ခြေ')).toEqual(['မျက်စိ', ' ', 'နား', ' ', 'လက်', ' ', 'ခြေ'])
    })

    it('keeps a word-final preposed vowel with its base before punctuation', () => {
        expect(splitMyanmarSyllables('ရေ။')).toEqual(['ရေ', '။'])
        expect(splitMyanmarSyllables('ရေ၊')).toEqual(['ရေ', '၊'])
        expect(splitMyanmarSyllables('ရေ ၂။')).toEqual(['ရေ', ' ', '၂', '။'])
    })

    it('never produces a cluster that mixes Myanmar glyphs with whitespace', () => {
        const lines = [
            'အခြေခံ စကားလုံး (၂)',
            'အိမ် မြို့ ရွာ',
            'အဖေ အမေ ညီ ညီမ',
            'မျက်စိ နား လက် ခြေ',
            'ရေ ဆန် ငါး ကြက်',
        ]
        for (const line of lines) {
            const clusters = splitMyanmarSyllables(line)
            expect(clusters.join('')).toBe(line)
            for (const cluster of clusters) {
                // A cluster may be a pure space run, but never a Myanmar run
                // carrying a stray space (the symptom of an orphaned ေ).
                const isCouldSpace = cluster === ' '
                expect(
                    !isCouldSpace && (containsMyanmar(cluster) && (cluster.includes(' ') || cluster.includes('\u00A0'))),
                    JSON.stringify(cluster),
                ).toBe(false)
            }
        }
    })

    it('merges a preposed vowel forward only into a following base consonant', () => {
        // Internal preposed vowel still belongs to the syllable headed by the
        // next base consonant ("ေခံ" inside အခြေခံ), while a word-final one
        // stays with the preceding base.
        expect(splitMyanmarSyllables('အခြေခံ')).toEqual(['အ', 'ခြ', 'ေခံ'])
        expect(splitMyanmarSyllables('အခြေခံ စကားလုံး')).toEqual(['အ', 'ခြ', 'ေခံ', ' ', 'စ', 'ကား', 'လုံး'])
    })
})

describe('Myanmar sequence cluster boundaries', () => {
    it('maps each Myanmar syllable cluster to one grapheme range', () => {
        // "ကာ" (1 unit) + " " (1 unit) + "သုံ" (3 units) -> 6 units across 3 graphemes
        const seq = buildSequence('\u1000\u102C \u101E\u102F\u1036', myanmar)
        expect(seq.graphemes).toHaveLength(3)
        expect(seq.graphemeUnitRanges).toEqual([
            [0, 2],
            [2, 3],
            [3, 6],
        ])
    })

    it('clusterStartForUnit returns the start of the owning cluster', () => {
        const seq = buildSequence('\u1000\u102C \u101E\u102F\u1036', myanmar)
        // Mid-way through "သုံ" (start unit 3), the preceding cluster starts at 3.
        expect(clusterStartForUnit(seq, 5)).toBe(3)
        // Before the second cluster's final unit.
        expect(clusterStartForUnit(seq, 4)).toBe(3)
        // For the first cluster.
        expect(clusterStartForUnit(seq, 2)).toBe(0)
        expect(clusterStartForUnit(seq, 1)).toBe(0)
        expect(clusterStartForUnit(seq, 0)).toBe(0)
    })

    it('clusterStartForUnit is a no-op stepping one unit for English', () => {
        const seq = buildSequence('fj', englishQwerty)
        for (let i = 1; i <= 2; i++) {
            expect(clusterStartForUnit(seq, i)).toBe(i - 1)
        }
    })
})

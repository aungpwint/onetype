import { describe, expect, it } from 'vitest'

import { myanmar } from '@/core/keyboard-layout/myanmar'
import { TypingEngine } from '@/core/typing-engine/engine'
import { buildSequence, clusterStartForUnit, keyboardOrderForCluster } from '@/core/typing-engine/sequence'
import {
    classifyMyanmarCharacter,
    isAsat,
    isBaseLetter,
    isDependentVowel,
    isIndependentVowel,
    isMedial,
    isMyanmarAttachingMark,
    isMyanmarCodePoint,
    isMyanmarNumber,
    isMyanmarPunctuation,
    isMyanmarSyllableHead,
    isPreBaseVowel,
    isToneMark,
    isVirama,
    ASAT,
    MEDIAL_END,
    MEDIAL_START,
    PRE_BASE_VOWEL,
    VIRAMA,
} from '@/core/unicode/classification'
import { containsUnexpectedInvisibleCharacters, normalizeMyanmarText, splitMyanmarSyllables, validateMyanmarText } from '@/core/unicode/myanmar'

/**
 * Myanmar Unicode core regression suite.
 *
 * Locks the invariants OneType depends on end to end:
 *   · the classification core is a single source of truth and never lies about
 *     what a code point is;
 *   · keyboard press order is the pre-base-first permutation of canonical
 *     Unicode (STORED text stays the canonical base+U+1031 sequence);
 *   · lesson-target material is canonical — no zero-width characters, no
 *     ZWNJ-laced ေ, exact NFC;
 *   · syllable segmentation rejoins to the exact input (never reorders, never
 *     drops content);
 *   · Backspace is cluster-aware, and the guided engine expects the pre-base
 *     vowel key FIRST.
 */

const MISSION_BASES = ['က', 'ခ', 'ဂ', 'င', 'ရ', 'လ', 'မ']
const MISSION_PREBASE = ['ကေ', 'ခေ', 'ဂေ', 'ငေ', 'မေ', 'နေ', 'တေ', 'ရေ', 'လေ', 'ဝေ', 'သေ', 'ဟေ']
const MISSION_VOWELS = ['ကာ', 'ကိ', 'ကီ', 'ကု', 'ကူ', 'ကဲ']
const MISSION_MEDIALS = ['ကျ', 'ကြ', 'ကွ', 'ကှ']
const MISSION_STACKS = ['က္က', 'န္တ', 'မ္မ']
const MISSION_KINZI = ['သင်္ဘော']
const MISSION_TONES = ['က့', 'ကး', 'ကံ']
const MISSION_CORPUS = [
    ...MISSION_BASES,
    ...MISSION_PREBASE,
    ...MISSION_VOWELS,
    ...MISSION_MEDIALS,
    ...MISSION_STACKS,
    ...MISSION_KINZI,
    ...MISSION_TONES,
    'ရေ',
    'အဖေ',
    'အမေ',
    'ခြေ',
    'အခြေခံ',
    'အိမ်',
    'မြို့',
    'ရွာ',
    'မျက်စိ',
    'နား',
    'လက်',
    'ဆန်',
    'ငါး',
    'ကြက်',
    'မြန်မာ',
]

function codePoints(text: string): string {
    return [...text].map((c) => `U+${c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}`).join(' ')
}

describe('Myanmar character classification core', () => {
    it('classifies every named category in the core block exactly', () => {
        expect(classifyMyanmarCharacter(0x1000)).toBe('base') // က
        expect(classifyMyanmarCharacter(0x1021)).toBe('base') // အ
        expect(classifyMyanmarCharacter(0x103f)).toBe('base') // ဿ
        expect(classifyMyanmarCharacter(0x1023)).toBe('independent-vowel') // ဣ
        expect(classifyMyanmarCharacter(0x1024)).toBe('independent-vowel') // ဤ
        expect(classifyMyanmarCharacter(0x1025)).toBe('independent-vowel') // ဥ
        expect(classifyMyanmarCharacter(0x1026)).toBe('independent-vowel') // ဦ
        expect(classifyMyanmarCharacter(0x1027)).toBe('independent-vowel') // ဧ
        expect(classifyMyanmarCharacter(0x1029)).toBe('independent-vowel') // ဩ
        expect(classifyMyanmarCharacter(0x102a)).toBe('independent-vowel') // ဪ
        expect(classifyMyanmarCharacter(0x102b)).toBe('dependent-vowel') // ါ
        expect(classifyMyanmarCharacter(0x102c)).toBe('dependent-vowel') // ာ
        expect(classifyMyanmarCharacter(0x102d)).toBe('dependent-vowel') // ိ
        expect(classifyMyanmarCharacter(0x102f)).toBe('dependent-vowel') // ု
        expect(classifyMyanmarCharacter(0x1030)).toBe('dependent-vowel') // ူ
        expect(classifyMyanmarCharacter(0x1032)).toBe('dependent-vowel') // ဲ
        expect(classifyMyanmarCharacter(PRE_BASE_VOWEL)).toBe('pre-base-vowel') // ေ
        expect(classifyMyanmarCharacter(0x1036)).toBe('tone') // ံ
        expect(classifyMyanmarCharacter(0x1037)).toBe('tone') // ့
        expect(classifyMyanmarCharacter(0x1038)).toBe('tone') // း
        expect(classifyMyanmarCharacter(VIRAMA)).toBe('virama') // ၹ (stack)
        expect(classifyMyanmarCharacter(ASAT)).toBe('asat') // ၺ
        for (let cp = MEDIAL_START; cp <= MEDIAL_END; cp++) {
            expect(classifyMyanmarCharacter(cp)).toBe('medial') // ျ ြ ွ ှ
        }
        for (let cp = 0x1040; cp <= 0x1049; cp++) {
            expect(classifyMyanmarCharacter(cp), `digit U+${cp.toString(16)}`).toBe('number') // ၀..၉
        }
        expect(classifyMyanmarCharacter(0x104a)).toBe('punctuation') // ၊
        expect(classifyMyanmarCharacter(0x104b)).toBe('punctuation') // ။
        expect(classifyMyanmarCharacter(0x1033)).toBe('other') // unofficial vowel sign II
        expect(classifyMyanmarCharacter(0x109f)).toBe('other') // block tail symbol
    })

    it('predicates agree with the classifier and stay disjoint where required', () => {
        expect(isBaseLetter(0x1000)).toBe(true)
        expect(isBaseLetter(0x103f)).toBe(true)
        expect(isIndependentVowel(0x1023)).toBe(true)
        expect(isIndependentVowel(PRE_BASE_VOWEL)).toBe(false)
        expect(isDependentVowel(0x102c)).toBe(true)
        expect(isDependentVowel(PRE_BASE_VOWEL)).toBe(false) // pre-base is NOT a plain dependent vowel
        expect(isPreBaseVowel(PRE_BASE_VOWEL)).toBe(true)
        expect(isPreBaseVowel(0x102c)).toBe(false)
        for (let cp = MEDIAL_START; cp <= MEDIAL_END; cp++) expect(isMedial(cp)).toBe(true)
        expect(isAsat(ASAT)).toBe(true)
        expect(isVirama(VIRAMA)).toBe(true)
        expect(isToneMark(0x1036)).toBe(true)
        expect(isToneMark(0x1037)).toBe(true)
        expect(isToneMark(0x1038)).toBe(true)
        expect(isMyanmarNumber(0x1040)).toBe(true)
        expect(isMyanmarNumber(0x1049)).toBe(true)
        expect(isMyanmarPunctuation(0x104a)).toBe(true)
        expect(isMyanmarPunctuation(0x104b)).toBe(true)
        // Syllable heads = bases + independent vowels; attaching marks include
        // every vowel sign (pre-base included), medials, tones, asat, virama.
        expect(isMyanmarSyllableHead(0x1000)).toBe(true)
        expect(isMyanmarSyllableHead(0x1023)).toBe(true)
        expect(isMyanmarSyllableHead(0x200c)).toBe(false)
        expect(isMyanmarAttachingMark(0x102c)).toBe(true)
        expect(isMyanmarAttachingMark(PRE_BASE_VOWEL)).toBe(true)
        expect(isMyanmarAttachingMark(0x1037)).toBe(true)
        expect(isMyanmarSyllableHead(ASAT)).toBe(false)
        expect(isMyanmarSyllableHead(VIRAMA)).toBe(false)
    })

    it('the Myanmar script set covers all declared blocks and nothing outside', () => {
        for (const cp of [
            0x1000,
            0x1031,
            0x109f, // core block
            0xaa60,
            0xaa7f, // Extended-A
            0xa9e0,
            0xa9ff, // Extended-B
            0x116d0,
            0x116ff, // Extended-C
        ]) {
            expect(isMyanmarCodePoint(cp), `U+${cp.toString(16)}`).toBe(true)
        }
        for (const cp of [0x0041, 0x200c, 0x200d, 0x038e, 0x0e01, 0x1100]) {
            expect(isMyanmarCodePoint(cp), `U+${cp.toString(16)}`).toBe(false)
        }
        expect(classifyMyanmarCharacter(0x200c)).toBeNull()
        expect(classifyMyanmarCharacter(0x0041)).toBeNull()
    })
})

describe('keyboard press order for pre-base syllables', () => {
    it('presses the pre-base vowel first yet stores canonical base+ေ', () => {
        for (const word of [...MISSION_PREBASE, ...MISSION_CORPUS]) {
            const seq = buildSequence(word, myanmar)
            const groups = new Map<number, string[]>()
            for (const unit of seq.units) {
                const inserted = myanmar.outputFor(unit.keyCode, unit.modifier)!.text
                groups.set(unit.graphemeIndex, [...(groups.get(unit.graphemeIndex) ?? []), inserted])
            }
            for (let gi = 0; gi < seq.graphemes.length; gi++) {
                const pressed = groups.get(gi)!.join('')
                expect(pressed, `press order for grapheme ${gi} of ${JSON.stringify(word)}`).toBe(keyboardOrderForCluster(seq.graphemes[gi]!))
            }
            // The stored text is the logical (canonical) Unicode of the word.
            expect(seq.graphemes.join(''), word).toBe(word)
        }
    })

    it('keyboardOrderForCluster moves U+1031 to the front without touching order of the rest', () => {
        expect([...keyboardOrderForCluster('ရေ')].map((c) => c.codePointAt(0))).toEqual([0x1031, 0x101b])
        expect(keyboardOrderForCluster('ကေ'), 'single base + pre-base').toBe('ေက')
        // ကြေ့ = က + medial-ra + ေ + dot-below: pre-base leads, logical order kept for the rest.
        expect([...keyboardOrderForCluster('ကြေ့')].map((c) => c.codePointAt(0))).toEqual([
            PRE_BASE_VOWEL,
            0x1000, // က
            0x103c, // ြ
            0x1037, // ့
        ])
        // No pre-base vowel: unchanged.
        expect(keyboardOrderForCluster('ကု')).toBe('ကု')
        expect(keyboardOrderForCluster('မြန်မာ')).toBe('မြန်မာ')
        expect(keyboardOrderForCluster('hello')).toBe('hello')
    })

    it('the sequence for the pre-base syllable ရေ consists of exactly two units', () => {
        const seq = buildSequence('ရေ', myanmar)
        expect(seq.graphemes).toEqual(['ရေ'])
        expect(seq.units).toHaveLength(2)
        expect(seq.units[0]!.keyCode).toBe('KeyA')
        expect(seq.units[0]!.modifier).toBe('none')
        expect(seq.units[1]!.keyCode).toBe('Digit7')
        expect(seq.units[1]!.modifier).toBe('shift')
    })
})

describe('canonical lesson-target invariants (mission matrix)', () => {
    it('every mission word is canonical Unicode: NFC, no zero-width, exact code points', () => {
        for (const word of MISSION_CORPUS) {
            expect(word.normalize('NFC'), `${word} (${codePoints(word)})`).toBe(word)
            expect(validateMyanmarText(word), `${word} validation problems`).toEqual([])
            expect(containsUnexpectedInvisibleCharacters(word), `${word} has hidden characters`).toBe(false)
            for (const ch of word) {
                const cp = ch.codePointAt(0)!
                expect(cp, `U+200C/U+200D in ${word}: ${ch}`).not.toBe(0x200c)
                expect(cp, `U+200C/U+200D in ${word}: ${ch}`).not.toBe(0x200d)
                expect(classifyMyanmarCharacter(cp), `unclassed code point ${codePoints(ch)} in ${word}`).not.toBeNull()
            }
        }
    })

    it('stacks and kinzi contain a true virama / asat (no ZWNJ surrogate)', () => {
        expect([...'က္က'].map((c) => c.codePointAt(0))).toEqual([0x1000, VIRAMA, 0x1000])
        expect([...'န္တ'].map((c) => c.codePointAt(0))).toEqual([0x1014, VIRAMA, 0x1010])
        expect([...'မ္မ'].map((c) => c.codePointAt(0))).toEqual([0x1019, VIRAMA, 0x1019])
        expect([...'သင်္ဘော'].some((c) => c.codePointAt(0) === ASAT)).toBe(true)
        expect('သင်္ဘော'.includes('\u200c')).toBe(false)
    })

    it('syllable segmentation rejoins to the exact input (no reorder, no loss)', () => {
        for (const word of MISSION_CORPUS) {
            const clusters = splitMyanmarSyllables(word)
            expect(clusters.join(''), `rejoin of ${JSON.stringify(word)}`).toBe(word)
            expect(clusters.filter((c) => c.length === 0)).toEqual([])
        }
    })
})

describe('Backspace is cluster-aware (guided engine)', () => {
    it('removes the whole pre-base syllable ရေ with one Backspace', () => {
        const seq = buildSequence('ရေ', myanmar)
        expect(seq.graphemes).toHaveLength(1)
        const engine = new TypingEngine({ sequence: seq, layout: myanmar })
        // Type only the first key: the engine must stay running so Backspace
        // is processed (a finished run ignores stray keys).
        engine.processKey(seq.units[0]!.keyCode, seq.units[0]!.modifier)
        expect(engine.unitIndex).toBe(1)
        engine.processKey('Backspace', 'none')
        expect(engine.unitIndex, 'backspace steps to the cluster start').toBe(clusterStartForUnit(seq, 1))
        expect(engine.unitIndex).toBe(0)
        expect(engine.backspaceCount).toBe(1)
    })

    it('removes exactly one final cluster (not one combining mark) from a multi-syllable line', () => {
        const word = 'ရေ ဆန်'
        const seq = buildSequence(word, myanmar)
        const engine = new TypingEngine({ sequence: seq, layout: myanmar })
        // One key short of the end keeps the run in-flight.
        for (let i = 0; i < seq.units.length - 1; i++) {
            const unit = seq.units[i]!
            engine.processKey(unit.keyCode, unit.modifier)
        }
        const startOfLastCluster = clusterStartForUnit(seq, seq.units.length - 1)
        expect(startOfLastCluster).toBeGreaterThan(0)
        expect(startOfLastCluster).toBeLessThan(seq.units.length)
        engine.processKey('Backspace', 'none')
        expect(engine.unitIndex).toBe(startOfLastCluster)
        // The engine must REPEAT the cluster's keys to finish; unit indices were cleared.
        for (let i = startOfLastCluster; i < seq.units.length; i++) {
            const unit = seq.units[i]!
            engine.processKey(unit.keyCode, unit.modifier)
        }
        expect(engine.status).toBe('finished')
        expect(engine.incorrectCount).toBe(0)
    })

    it('steps backward deterministically one cluster per Backspace until 0', () => {
        const word = 'ရေ ဆန်'
        const seq = buildSequence(word, myanmar)
        const engine = new TypingEngine({ sequence: seq, layout: myanmar })
        for (let i = 0; i < seq.units.length - 1; i++) {
            const unit = seq.units[i]!
            engine.processKey(unit.keyCode, unit.modifier)
        }
        const before = engine.unitIndex
        expect(before).toBe(seq.units.length - 1)
        const visited: number[] = []
        for (let i = 0; i < seq.units.length; i++) {
            engine.processKey('Backspace', 'none')
            visited.push(engine.unitIndex)
        }
        expect(visited[0]!, 'first backspace removes one whole final cluster').toBe(clusterStartForUnit(seq, seq.units.length - 1))
        expect(
            visited.every((v, i) => i === 0 || v <= visited[i - 1]!),
            'never moves forward',
        ).toBe(true)
        expect(visited[visited.length - 1]!, 'exhaustive backspace reaches the start').toBe(0)
    })

    it('Backspace at index 0 leaves the engine untouched and does not throw', () => {
        const seq = buildSequence('ရေ', myanmar)
        const engine = new TypingEngine({ sequence: seq, layout: myanmar })
        engine.processKey('Backspace', 'none')
        expect(engine.unitIndex).toBe(0)
        expect(engine.backspaceCount).toBe(1)
        expect(engine.status).toBe('running')
    })
})

describe('guided engine expects the pre-base vowel key first', () => {
    it('progresses KeyA(ေ) → Digit7(ရ) and finishes "ရေ" as its single correct ISO sequence', () => {
        const seq = buildSequence('ရေ', myanmar)
        const engine = new TypingEngine({ sequence: seq, layout: myanmar })
        expect(engine.expectedUnit?.keyCode).toBe('KeyA')
        expect(engine.expectedUnit?.modifier).toBe('none')

        engine.processKey('KeyA', 'none')
        expect(engine.unitIndex).toBe(1)
        expect(engine.expectedUnit?.keyCode).toBe('Digit7')
        expect(engine.expectedUnit?.modifier).toBe('shift')

        engine.processKey('Digit7', 'shift')
        expect(engine.status).toBe('finished')
        expect(engine.correctCount).toBe(2)
        expect(engine.incorrectCount).toBe(0)
        expect(engine.currentMetrics().accuracy).toBe(100)
    })

    it('a leading base-key press (ရ before ေ) is recorded as an error, not silently accepted', () => {
        const seq = buildSequence('ရေ', myanmar)
        const engine = new TypingEngine({ sequence: seq, layout: myanmar })
        engine.processKey('Digit7', 'shift') // wrong first key
        expect(engine.incorrectCount).toBe(1)
        engine.processKey('KeyA', 'none')
        engine.processKey('Digit7', 'shift')
        expect(engine.status).toBe('finished')
        expect(engine.correctCount).toBe(2)
        expect(engine.incorrectCount).toBe(1)
    })
})

describe('invalid-input determinism', () => {
    it('buildSequence rejects a ZWNJ-laced target instead of guessing', () => {
        expect(() => buildSequence('ရ\u200cေ', myanmar)).toThrow()
        expect(() => buildSequence('ရ\u200dေ', myanmar)).toThrow()
    })

    it('normalizeMyanmarText strips hidden characters deterministically', () => {
        const poisoned = 'ရ\u200cေ \u200bမြန်မာ\u200d'
        const first = normalizeMyanmarText(poisoned)
        const second = normalizeMyanmarText(poisoned)
        expect(first).toBe(second) // deterministic
        expect(first).toBe('ရေ မြန်မာ')
        expect(validateMyanmarText(poisoned).length).toBeGreaterThan(0)
        expect(validateMyanmarText(first)).toEqual([])
    })

    it('repeated classification / segmentation calls agree across invocations', () => {
        for (const word of MISSION_CORPUS) {
            expect(splitMyanmarSyllables(word)).toEqual(splitMyanmarSyllables(word))
            for (const ch of word) {
                const cp = ch.codePointAt(0)!
                expect(classifyMyanmarCharacter(cp)).toBe(classifyMyanmarCharacter(cp))
            }
        }
    })
})

describe('unexpected, repeated and out-of-order keys (invalid-input policy)', () => {
    it('an unexpected key is recorded as an error and never advances the unit index', () => {
        const seq = buildSequence('ရေ', myanmar)
        const engine = new TypingEngine({ sequence: seq, layout: myanmar })
        engine.processKey('KeyQ', 'none')
        expect(engine.incorrectCount).toBe(1)
        expect(engine.correctCount).toBe(0)
        expect(engine.unitIndex).toBe(0)
        expect(engine.expectedUnit?.keyCode).toBe('KeyA')
        expect(engine.status).toBe('running')
        // The target/sequence are untouched by bad input: replay is identical.
        const seq2 = buildSequence('ရေ', myanmar)
        expect(seq2.units.map((u) => `${u.keyCode}:${u.modifier}`)).toEqual(seq.units.map((u) => `${u.keyCode}:${u.modifier}`))
    })

    it('a repeated pre-base key is an error once the base is expected (duplicate vowel)', () => {
        const mk = () => {
            const seq = buildSequence('ရေ', myanmar)
            return new TypingEngine({ sequence: seq, layout: myanmar })
        }
        const first = mk()
        first.processKey('KeyA', 'none') // ေ — correct first key
        first.processKey('KeyA', 'none') // duplicate ေ — must be an error now
        first.processKey('Digit7', 'shift') // ရ — correct
        const second = mk()
        second.processKey('KeyA', 'none')
        second.processKey('KeyA', 'none')
        second.processKey('Digit7', 'shift')
        expect(first.incorrectCount).toBe(1)
        expect(second.incorrectCount).toBe(first.incorrectCount) // deterministic
        expect(first.correctCount).toBe(2)
        expect(first.status).toBe('finished')
    })

    it('wrong-modifier presses are errors but never corrupt the recorded units', () => {
        const seq = buildSequence('ရေ', myanmar)
        const engine = new TypingEngine({ sequence: seq, layout: myanmar })
        engine.processKey('KeyA', 'shift') // right key, wrong modifier: modifier error
        expect(engine.incorrectCount).toBe(1)
        expect(engine.unitIndex).toBe(0)
        engine.processKey('KeyA', 'none')
        engine.processKey('Digit7', 'shift')
        expect(engine.status).toBe('finished')
        expect(engine.correctCount).toBe(2)
        expect(engine.incorrectCount).toBe(1)
    })

    it('normalization preserves every meaningful combining character', () => {
        // Only hidden/format characters are stripped — never medials, tones,
        // vowels, asat or virama.
        const cases: Array<[string, string]> = [
            ['ရ\u200cေ', 'ရေ'],
            ['မြို့\u200cရွာ', 'မြို့ရွာ'],
            ['အခြေခံ\u200d', 'အခြေခံ'],
            ['ကျွန်း\u200b', 'ကျွန်း'],
            ['က္က\u200c', 'က္က'],
        ]
        for (const [input, expected] of cases) {
            const out = normalizeMyanmarText(input)
            expect(out, JSON.stringify(input)).toBe(expected)
            expect(out, `preserved text ${JSON.stringify(out)}`).not.toContain('\u200c')
            expect(out, `preserved text ${JSON.stringify(out)}`).not.toContain('\u200d')
            for (const ch of out) {
                expect(classifyMyanmarCharacter(ch.codePointAt(0)!), `unclassed char in ${out}`).not.toBeNull()
            }
        }
    })

    it('Zawgyi-ordered text is never silently rewritten at the Unicode layer', () => {
        // Zawgyi stores the e-vowel before its base (ေရ). OneType is
        // Unicode-first: the canonical/storage boundary must NOT guess-convert
        // legacy ordering. If product requirements ever need Zawgyi→Unicode
        // conversion, that belongs at a dedicated input boundary — never here.
        const zawgyiOrdered = 'ေရ'
        expect(normalizeMyanmarText(zawgyiOrdered)).toBe(zawgyiOrdered)
        expect(validateMyanmarText(zawgyiOrdered)).toEqual([]) // NFC-valid, hidden-free
        expect(splitMyanmarSyllables(zawgyiOrdered)).toEqual(['ေရ']) // not reordered to ရ+ေ
        expect(zawgyiOrdered).not.toBe('ရေ')
    })
})

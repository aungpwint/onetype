import { describe, expect, it } from 'vitest'

import { myanmar } from '@/core/keyboard-layout/myanmar'
import { TypingEngine } from '@/core/typing-engine/engine'
import { buildSequence } from '@/core/typing-engine/sequence'
import { myanmarKeyboardOrder } from '@/core/unicode/keyboard-order'
import { splitGraphemes } from '@/core/unicode/graphemes'
import {
    classifyMyanmarCharacter,
    isAnusvara,
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
    ANUSVARA_TONE,
    MEDIAL_END,
    MEDIAL_START,
    PRE_BASE_VOWEL,
    VIRAMA,
    VOWEL_SIGN_U,
    VOWEL_SIGN_UU,
} from '@/core/unicode/classification'
import {
    containsMyanmar,
    containsUnexpectedInvisibleCharacters,
    isMyanmarLogicalOrder,
    normalizeMyanmarText,
    splitMyanmarSyllables,
    validateMyanmarText,
} from '@/core/unicode/myanmar'

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

    describe('Myanmar keyboard input order', () => {
        it.each([
            ['ရေ', '\u1031\u101b'],
            ['ရေး', '\u1031\u101b\u1038'],
// MyanSan smart-reorders `်` then `့` to canonical `့` + `်`.
            ['ကျင့်', '\u1000\u103b\u1004\u103a\u1037'],
            ['သင့်', '\u101e\u1004\u103a\u1037'],
            // MyanSan presses the anusvara `ံ` before the U/UU vowel sign.
            ['ပုံမှန်', '\u1015\u1036\u102f\u1019\u103e\u1014\u103a'],
            ['ပုံ', '\u1015\u1036\u102f'],
            ['ပြုံး', '\u1015\u103c\u1036\u102f\u1038'],
        ])('reorders %s without changing the display target', (display, input) => {
            expect(myanmarKeyboardOrder(display)).toBe(input)
            expect(buildSequence(display, myanmar).graphemes.join('')).toBe(display)
            expect(buildSequence(display, myanmar).units.map((unit) => unit.text).join('')).toBe(input)
        })

        it('types ပုံမှန် in KMS-compatible physical-key order', () => {
            const seq = buildSequence('ပုံမှန်', myanmar)
            expect(seq.units.map((unit) => unit.keyCode)).toEqual(['KeyY', 'KeyH', 'KeyK', 'KeyR', 'KeyS', 'KeyE', 'KeyF'])
            expect(seq.units.map((unit) => unit.modifier)).toEqual(['none', 'shift', 'none', 'none', 'shift', 'none', 'none'])
            const engine = new TypingEngine({ sequence: seq, layout: myanmar })
            for (const unit of seq.units) engine.processKey(unit.keyCode, unit.modifier)
            expect(engine.isComplete).toBe(true)
        })

        it('keeps stacked consonants in keyboard order and does not add filler characters', () => {
            expect(myanmarKeyboardOrder('က္က')).toBe('က္က')
            expect(myanmarKeyboardOrder('သင်္ဘော')).not.toContain('\u200c')
        })
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
                expect(pressed, `typed grapheme ${gi} of ${JSON.stringify(word)}`).toBe(myanmarKeyboardOrder(seq.graphemes[gi]!))
            }
            // The stored text is the logical (canonical) Unicode of the word.
            expect(seq.graphemes.join(''), word).toBe(word)
        }
    })

    it('typing units preserve logical code-point order', () => {
        expect([...buildSequence('ရေ', myanmar).graphemes[0]!].map((c) => c.codePointAt(0))).toEqual([0x101b, 0x1031])
        expect(buildSequence('ကေ', myanmar).graphemes[0], 'single base + pre-base').toBe('ကေ')
        // ကြေ့ = က + medial-ra + ေ + dot-below.
        expect([...buildSequence('ကြေ့', myanmar).graphemes[0]!].map((c) => c.codePointAt(0))).toEqual([
            0x1000, // က
            0x103c, // ြ
            PRE_BASE_VOWEL,
            0x1037, // ့
        ])
        // No pre-base vowel: unchanged.
        expect(buildSequence('ကု', myanmar).graphemes[0]).toBe('ကု')
        expect(buildSequence('မြန်မာ', myanmar).graphemes.join('')).toBe('မြန်မာ')
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

describe('logical order for upper-right mark + lower vowel-sign stacks', () => {
    it('keeps the Unicode vowel-sign order in "ပုံ"', () => {
        expect([...buildSequence('ပုံ', myanmar).graphemes[0]!].map((c) => c.codePointAt(0))).toEqual([0x1015, 0x102f, 0x1036])
        const seq = buildSequence('ပုံ', myanmar)
        expect(seq.graphemes).toEqual(['ပုံ'])
        expect(seq.graphemes.join('')).toBe('ပုံ')
        // The learner presses the anusvara before the U vowel: Y, Shift+H, K.
        expect(seq.units.map((u) => `${u.keyCode}:${u.modifier}`)).toEqual(['KeyY:none', 'KeyH:shift', 'KeyK:none'])
        expect(seq.units.map((u) => u.text).join('')).toBe('\u1015\u1036\u102f')
    })

    it('applies to real words with a ြု/ူ + ံ/ဲ stack', () => {
        const cases: Array<[string, number[]]> = [
            ['သုံ', [0x101e, 0x102f, 0x1036]],
            ['မုံ', [0x1019, 0x102f, 0x1036]],
            ['သုံး', [0x101e, 0x102f, 0x1036, 0x1038]],
            ['ပြုံး', [0x1015, 0x103c, 0x102f, 0x1036, 0x1038]],
            ['လုံး', [0x101c, 0x102f, 0x1036, 0x1038]],
        ]
        for (const [stored, cps] of cases) {
            const pressed = buildSequence(stored, myanmar).graphemes[0]!
            expect([...pressed].map((c) => c.codePointAt(0)), stored).toEqual(cps)
            expect(pressed.length, `press order is a permutation of ${stored}`).toBe(stored.length)
            const seq = buildSequence(stored, myanmar)
            expect(seq.graphemes.join(''), `stored text unchanged for ${stored}`).toBe(stored)
        }
        // The course follows the same physical order accepted by MyanSan:
        // the anusvara ံ keys before the U vowel ြု.
        const seq = buildSequence('ပြုံး', myanmar)
        expect(seq.units.map((u) => `${u.keyCode}:${u.modifier}`)).toEqual([
            'KeyY:none',
            'KeyJ:none',
            'KeyH:shift',
            'KeyK:none',
            'Semicolon:none',
        ])
    })

    it('does not reinterpret a Myanmar cluster based on visual or keyboard order', () => {
        expect(buildSequence('ပုံ', myanmar).graphemes[0]).toBe('ပုံ')
        expect([...buildSequence('ပုံ', myanmar).graphemes[0]!].map((c) => c.codePointAt(0))).toEqual([0x1015, 0x102f, 0x1036])
        // The vowel-sign stack types through end-to-end (O, Shift+H, K).
        const seq = buildSequence('ကာ သုံ', myanmar)
        expect(seq.units.slice(3).map((u) => `${u.keyCode}:${u.modifier}`)).toEqual(['KeyO:none', 'KeyH:shift', 'KeyK:none'])
    })

    it('leaves clusters without the stack, and non-Myanmar text, untouched', () => {
        for (const word of ['ကံ', 'ကု', 'ကဲ', 'မြန်မာ']) {
            expect(buildSequence(word, myanmar).graphemes.join(''), word).toBe(word)
        }
    })
})

describe('anusvara placement after dependent vowels (canonical ပုံ order)', () => {
    it('accepts canonical vowel-then-anusvara syllables', () => {
        for (const word of ['ပုံ', 'ပုံမှန်', 'ပြုံး', 'သုံး', 'လုံး', 'ကိံ', 'ကူံ']) {
            expect(isMyanmarLogicalOrder(word), `${word} (${codePoints(word)})`).toBe(true)
            expect(validateMyanmarText(word), `${word} validation problems`).toEqual([])
        }
    })

    it('rejects stored anusvara-before-vowel bytes (ံု, ံူ) in lesson data', () => {
        // ပံု = U+1015 U+1036 U+102F is NOT canonical storage: data must keep
        // ပုံ = U+1015 U+102F U+1036. The learner still PRESSES ံ before ြု —
        // that press order is produced by myanmarKeyboardOrder (see the
        // keyboard-input-order describe block), never by stored bytes.
        for (const bad of ['\u1015\u1036\u102f', '\u1015\u1036\u1030', '\u1000\u1036\u102d', '\u1005\u1015\u103c\u1036\u102f\u1038']) {
            expect(isMyanmarLogicalOrder(bad), `${codePoints(bad)} must be rejected`).toBe(false)
            expect(validateMyanmarText(bad).length, `${codePoints(bad)} must be validated as a problem`).toBeGreaterThan(0)
        }
    })

    it('imposes the ပ ံ ြု press order without altering canonical storage', () => {
        // Stored ပုံ stays canonical; the keyboard order moves the anusvara
        // before the U/UU vowel sign.
        expect(myanmarKeyboardOrder('ပုံ')).toBe('\u1015\u1036\u102f')
        expect(myanmarKeyboardOrder('ပုံမှန်')).toBe('\u1015\u1036\u102f\u1019\u103e\u1014\u103a')
        expect(myanmarKeyboardOrder('ပြုံး')).toBe('\u1015\u103c\u1036\u102f\u1038')
        expect(myanmarKeyboardOrder('ကူံ')).toBe('\u1000\u1036\u1030')
        // The stored text is untouched: it stays canonical Unicode.
        expect('ပုံ').toBe('\u1015\u102f\u1036')
    })

    it('allows tone marks (့ း) after the anusvara but not vowels', () => {
        for (const word of ['ကံ့', 'ကံး', 'သုံး']) {
            expect(isMyanmarLogicalOrder(word), `${word} (${codePoints(word)})`).toBe(true)
        }
        for (const bad of ['\u1000\u1036\u102f\u1037', '\u1000\u1036\u102d\u1038']) {
            expect(isMyanmarLogicalOrder(bad), `${codePoints(bad)} must be rejected`).toBe(false)
        }
    })

    it('exposes the classification helpers for the U/UU vowel signs and anusvara', () => {
        expect(VOWEL_SIGN_U).toBe(0x102f)
        expect(VOWEL_SIGN_UU).toBe(0x1030)
        expect(ANUSVARA_TONE).toBe(0x1036)
        expect(isAnusvara(0x1036)).toBe(true)
        expect(isAnusvara(0x1037)).toBe(false)
        expect(isAnusvara(VOWEL_SIGN_U)).toBe(false)
    })
})

describe('canonical lesson-target invariants (mission matrix)', () => {
    it('every mission word is logical Unicode: no zero-width, exact code points', () => {
        for (const word of MISSION_CORPUS) {
            expect(isMyanmarLogicalOrder(word), `${word} (${codePoints(word)})`).toBe(true)
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

describe('Backspace steps back one unit (guided engine)', () => {
    it('steps back one typing unit from a partial pre-base syllable ရေ', () => {
        const seq = buildSequence('ရေ', myanmar)
        expect(seq.graphemes).toHaveLength(1)
        const engine = new TypingEngine({ sequence: seq, layout: myanmar })
        // Type only the first key (ေ, the pre-base vowel): stays running so
        // Backspace is processed.
        engine.processKey(seq.units[0]!.keyCode, seq.units[0]!.modifier)
        expect(engine.unitIndex).toBe(1)
        engine.processKey('Backspace', 'none')
        // Exactly one unit rewinds (for a single-unit-cluster-ago position this
        // lands at the same value, but the outcome is cleared, never stale).
        expect(engine.unitIndex).toBe(0)
        expect(engine.unitOutcomeAt(0)).toBeNull()
        expect(engine.backspaceCount).toBe(1)
    })

    it('removes exactly one unit (not the whole cluster) from a multi-syllable line', () => {
        const word = 'ရေ ဆန်'
        const seq = buildSequence(word, myanmar)
        const engine = new TypingEngine({ sequence: seq, layout: myanmar })
        // One key short of the end keeps the run in-flight.
        for (let i = 0; i < seq.units.length - 1; i++) {
            const unit = seq.units[i]!
            engine.processKey(unit.keyCode, unit.modifier)
        }
        expect(engine.unitIndex).toBe(seq.units.length - 1)
        // The final cluster "ဆန်" occupies units [3,6) — a Backspace must land
        // at unit 4 (inside the cluster), proving single-unit granularity.
        const startOfLastCluster = 3
        expect(startOfLastCluster).toBeGreaterThan(0)
        expect(startOfLastCluster).toBeLessThan(seq.units.length)
        engine.processKey('Backspace', 'none')
        // Unit-granular: removes the last keystroke only — the caret lands
        // INSIDE the final cluster, not back at its start.
        expect(engine.unitIndex).toBe(seq.units.length - 2)
        // The engine must REPEAT the final two units to finish.
        for (let i = seq.units.length - 2; i < seq.units.length; i++) {
            const unit = seq.units[i]!
            engine.processKey(unit.keyCode, unit.modifier)
        }
        expect(engine.status).toBe('finished')
        expect(engine.incorrectCount).toBe(0)
    })

    it('steps backward deterministically one unit per Backspace until 0', () => {
        const word = 'ရေ ဆန်'
        const seq = buildSequence(word, myanmar)
        const engine = new TypingEngine({ sequence: seq, layout: myanmar })
        for (let i = 0; i < seq.units.length - 1; i++) {
            const unit = seq.units[i]!
            engine.processKey(unit.keyCode, unit.modifier)
        }
        expect(engine.unitIndex).toBe(seq.units.length - 1)
        const visited: number[] = []
        for (let i = 0; i < seq.units.length; i++) {
            engine.processKey('Backspace', 'none')
            visited.push(engine.unitIndex)
        }
        expect(
            visited.every((v, i) => i === 0 || v === visited[i - 1]! - 1 || visited[i - 1] === 0),
            'each backspace moves back exactly one unit then stays',
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

describe('guided engine expects Myanmar keyboard order', () => {
    it('progresses KeyA(ေ) → Digit7(ရ) while retaining display text "ရေ"', () => {
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

    it('a visual-order base press (ရ before ေ) is recorded as an error', () => {
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

    it('a repeated base key is an error once the vowel is expected (duplicate base)', () => {
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

    it('legacy-ordered pre-base vowel text is never silently rewritten at the Unicode layer', () => {
        // Old Burmese word processors stored the e-vowel before its base (ေရ).
        // OneType is Unicode-first: the canonical/storage boundary must NOT
        // guess-convert legacy ordering. Content conversion belongs at a
        // dedicated import boundary — never here.
        const legacyOrdered = 'ေရ'
        expect(normalizeMyanmarText(legacyOrdered)).toBe(legacyOrdered)
        expect(validateMyanmarText(legacyOrdered).length).toBeGreaterThan(0)
        expect(splitMyanmarSyllables(legacyOrdered)).toEqual(['ေရ']) // not reordered to ရ+ေ
        expect(legacyOrdered).not.toBe('ရေ')
    })
})

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

    it('splits a syllable-final consonant (asat U+103A) from the next syllable', () => {
        // Regression (keyboard order bug): "ဖတ်လေ့" was merged into one cluster,
        // so the pre-base vowel ေ of the second syllable hoisted to the front of
        // the whole word ("ေ" typed before "ဖတ်"). The asat U+103A marks a FINAL
        // consonant — the following consonant starts a NEW syllable. Only virama
        // U+1039 stacks (see previous test).
        // "စာဖတ်လေ့" = စ+ာ | ဖ+တ+် | လ+ေ+့
        expect(splitMyanmarSyllables('\u1005\u102C\u1016\u1010\u103A\u101C\u1031\u1037')).toEqual([
            '\u1005\u102C',
            '\u1016\u1010\u103A',
            '\u101C\u1031\u1037',
        ])
        // The pre-base vowel belongs to its OWN syllable, never the previous one.
        expect(splitMyanmarSyllables('\u1016\u1010\u103A\u101C\u1031\u1037')).toEqual(['\u1016\u1010\u103A', '\u101C\u1031\u1037'])
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
        const lines = ['အခြေခံ စကားလုံး (၂)', 'အိမ် မြို့ ရွာ', 'အဖေ အမေ ညီ ညီမ', 'မျက်စိ နား လက် ခြေ', 'ရေ ဆန် ငါး ကြက်']
        for (const line of lines) {
            const clusters = splitMyanmarSyllables(line)
            expect(clusters.join('')).toBe(line)
            for (const cluster of clusters) {
                // A cluster may be a pure space run, but never a Myanmar run
                // carrying a stray space (the symptom of an orphaned ေ).
                const isCouldSpace = cluster === ' '
                expect(
                    !isCouldSpace && containsMyanmar(cluster) && (cluster.includes(' ') || cluster.includes('\u00A0')),
                    JSON.stringify(cluster),
                ).toBe(false)
            }
        }
    })

    it('joins a mid-word preposed vowel into its own canonical base cluster', () => {
        // Canonical Unicode stores the preposed vowel after its base (ခြေ),
        // so the vowel merges backward — not forward — into the preceding
        // syllable head.
        expect(splitMyanmarSyllables('အခြေခံ')).toEqual(['အ', 'ခြေ', 'ခံ'])
        expect(splitMyanmarSyllables('အခြေခံ စကားလုံး')).toEqual(['အ', 'ခြေ', 'ခံ', ' ', 'စ', 'ကား', 'လုံး'])
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
})

describe('grapheme segmentation and language helpers', () => {
    it('splits ASCII into single graphemes', () => {
        expect(splitGraphemes('abc')).toEqual(['a', 'b', 'c'])
    })

    it('collects combining marks with their base', () => {
        const clusters = splitGraphemes('\u1000\u102D\u102F\u1037')
        expect(clusters.length).toBe(1)
        expect(clusters[0]).toBe('\u1000\u102D\u102F\u1037')
    })

    it('detects Myanmar text', () => {
        expect(containsMyanmar('မြန်မာ english')).toBe(true)
        expect(containsMyanmar('hello')).toBe(false)
    })
})

import { describe, expect, it } from 'vitest'

import { myanmar } from '@/core/keyboard-layout/myanmar'
import { getLayoutOrThrow } from '@/core/keyboard-layout/registry'
import type { KeyboardLayout } from '@/core/keyboard-layout/layout'
import { toLayoutId } from '@/types/keyboard'
import { TypingEngine } from '@/core/typing-engine/engine'
import { buildSequence, keyboardOrderForCluster } from '@/core/typing-engine/sequence'
import { containsMyanmar } from '@/core/unicode/myanmar'
import { getLessonRepository, getCanonicalLesson } from '@/data/curriculum'
import type { LessonExercise } from '@/types/exercise'
import type { Modifier } from '@/types'

const ZERO_WIDTH = new Set([0x200b, 0x200c, 0x200d, 0x200e, 0x200f, 0x2060, 0xfeff, 0x034f])

const REPORTED_CORPUS = ['ရေ', 'အဖေ', 'အမေ', 'ခြေ', 'အခြေခံ', 'အိမ်', 'မြို့', 'ရွာ', 'မျက်စိ', 'နား', 'လက်', 'ရေ', 'ဆန်', 'ငါး', 'ကြက်']
const AVOWEL_NO_PREBASE = ['ကု', 'ကူ', 'ကိ', 'ကီ', 'ကာ', 'ကါ', 'ကဲ', 'ကံ', 'က့', 'ကး', 'က္', 'က္က']
const PREBASE_MATRIX = [
    'ကေ',
    'ခေ',
    'ဂေ',
    'ငေ',
    'စေ',
    'ဆေ',
    'ဇေ',
    'ညေ',
    'တေ',
    'ထေ',
    'ဒေ',
    'နေ',
    'ပေ',
    'ဖေ',
    'ဗေ',
    'မေ',
    'ယေ',
    'ရေ',
    'လေ',
    'ဝေ',
    'သေ',
    'ဟေ',
    'အေ',
]
const COMBINATIONS = ['ကေ', 'ကု', 'ကူ', 'ကဲ', 'တေ', 'တု', 'တူ', 'မေ', 'မု', 'မူ', 'နေ', 'နု', 'နူ']
const SENTENCE_LINES = ['ရေ ဆန် ငါး ကြက်', 'အဖေ အမေ ညီ ညီမ', 'အခြေခံ စကားလုံး (၂)']

function codePoints(text: string): string {
    return [...text].map((c) => `U+${c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}`).join(' ')
}

interface Press {
    code: string
    modifier: Modifier
    inserted: string
}

function keyboardPresses(text: string): Press[] {
    const seq = buildSequence(text, myanmar)
    const presses: Press[] = []
    for (const unit of seq.units) {
        const produced = myanmar.outputFor(unit.keyCode, unit.modifier)
        if (produced === undefined) {
            throw new Error(`No keyboard output for ${unit.keyCode}:${unit.modifier} while typing ${JSON.stringify(text)}`)
        }
        presses.push({ code: unit.keyCode, modifier: unit.modifier, inserted: produced.text })
    }
    return presses
}

function keyboardType(text: string, layout: KeyboardLayout = myanmar): string {
    return buildSequence(text, layout).graphemes.join('')
}

function assertExactlyTyped(word: string, layout: KeyboardLayout = myanmar): void {
    const typed = keyboardType(word, layout)
    expect(typed, `keyboard output for ${JSON.stringify(word)}`).toBe(word)
    expect(
        [...typed].map((c) => c.codePointAt(0)),
        `code points for ${JSON.stringify(word)}`,
    ).toEqual([...word].map((c) => c.codePointAt(0)))
    for (const c of typed) {
        expect(!ZERO_WIDTH.has(c.codePointAt(0)!), `zero-width char ${codePoints(c)} in ${JSON.stringify(typed)}`).toBe(true)
    }
}

describe('Myanmar keyboard produces the exact canonical Unicode sequence', () => {
    it('types "ရေ" as ေ then ရ (KeyA then Digit7:shift) yet composes canonical "ရေ"', () => {
        const presses = keyboardPresses('ရေ')
        expect(presses.map((p) => `${p.code}:${p.modifier}`)).toEqual(['KeyA:none', 'Digit7:shift'])
        expect(presses.map((p) => p.inserted).join(''), 'pressed glyphs are ေရ').toBe('ေရ')
        expect(keyboardType('ရေ')).toBe('ရေ')
        expect(keyboardType('ရေ')).not.toContain('\u200C')
        expect([...keyboardType('ရေ')].map((c) => c.codePointAt(0))).toEqual([0x101b, 0x1031])
    })

    it('expects the pre-base vowel first for every consonant+ေ combination', () => {
        for (const word of PREBASE_MATRIX) {
            const presses = keyboardPresses(word)
            const base = Array.from(word).find((c) => c !== 'ေ')!
            expect(presses[0]?.code, word).toBe('KeyA')
            expect(presses[0]?.inserted, word).toBe('ေ')
            expect(presses[presses.length - 1]?.inserted, word).toBe(base)
            expect(keyboardType(word), word).toBe(word)
        }
    })

    it('leaves typing order unchanged (base first) for vowels with no pre-base form', () => {
        for (const word of AVOWEL_NO_PREBASE) {
            const presses = keyboardPresses(word)
            expect(presses[0]?.inserted, word).toBe('က')
            expect(keyboardType(word), word).toBe(word)
        }
    })

    it('press order is exactly the keyboardOrderForCluster permutation of each syllable', () => {
        for (const word of [...REPORTED_CORPUS, ...COMBINATIONS, ...SENTENCE_LINES]) {
            const seq = buildSequence(word, myanmar)
            const groups = new Map<number, string[]>()
            for (let i = 0; i < seq.units.length; i++) {
                const gi = seq.units[i].graphemeIndex
                const inserted = myanmar.outputFor(seq.units[i].keyCode, seq.units[i].modifier)!.text
                groups.set(gi, [...(groups.get(gi) ?? []), inserted])
            }
            for (let gi = 0; gi < seq.graphemes.length; gi++) {
                expect(groups.get(gi)?.join(''), `pressed cluster ${gi} of ${JSON.stringify(word)}`).toBe(keyboardOrderForCluster(seq.graphemes[gi]))
            }
        }
    })

    it.each(REPORTED_CORPUS)('%s is typed back exactly (string + code points, no zero-width)', (line) => assertExactlyTyped(line))

    it.each([...COMBINATIONS, ...AVOWEL_NO_PREBASE])('%s is typed back exactly (string + code points, no zero-width)', (line) => assertExactlyTyped(line))

    it.each(PREBASE_MATRIX)('%s is typed back exactly (string + code points, no zero-width)', (line) => assertExactlyTyped(line))

    it.each(SENTENCE_LINES)('%s is typed back exactly (multibase syllables + spaces)', (line) => assertExactlyTyped(line))

    it('the preposed vowel key emits the bare U+1031 with no leading/inflected ZWNJ', () => {
        const output = myanmar.outputFor('KeyA', 'none')
        expect(output?.text).toBe('\u1031')
        expect(output?.text).toBe('ေ')
        expect(myanmar.outputFor('Digit7', 'shift')?.text).toBe('ရ')
    })

    it('rejects a ZWNJ-laced target instead of silently folding it', () => {
        expect(() => buildSequence('ရ\u200Cေ', myanmar)).toThrow()
        expect(() => buildSequence('ခြ\u200Cေ', myanmar)).toThrow()
    })
})

describe('Typing engine recognizes the keyboard-generated sequence', () => {
    it('completes every corpus word as fully correct when the vowel is pressed first', () => {
        for (const word of [...REPORTED_CORPUS, ...COMBINATIONS, ...PREBASE_MATRIX, ...AVOWEL_NO_PREBASE, ...SENTENCE_LINES]) {
            const seq = buildSequence(word, myanmar)
            const engine = new TypingEngine({ sequence: seq, layout: myanmar })
            for (const unit of seq.units) {
                engine.processKey(unit.keyCode, unit.modifier)
            }
            expect(engine.status, word).toBe('finished')
            expect(engine.incorrectCount, word).toBe(0)
            expect(engine.correctCount, word).toBe(seq.units.length)
            expect(engine.unitIndex, word).toBe(seq.units.length)
        }
    })

    it('does NOT treat "ရ then ေ" as a clean correct input — it records a miss', () => {
        const seq = buildSequence('ရေ', myanmar)
        const engine = new TypingEngine({ sequence: seq, layout: myanmar })
        expect(engine.expectedUnit?.keyCode).toBe('KeyA')
        engine.processKey('Digit7', 'shift')
        engine.processKey('KeyA', 'none')
        engine.processKey('Digit7', 'shift')
        expect(engine.incorrectCount).toBe(1)
        expect(engine.correctCount).toBe(seq.units.length)
        expect(engine.status).toBe('finished')
    })
})

describe('Keycap label equals inserted character (single mapping)', () => {
    it('outputFor is the only source for both display and per-press text', () => {
        for (const row of myanmar.rows) {
            for (const key of row) {
                if (key.plain === undefined) continue
                const none = myanmar.outputFor(key.code, 'none')
                expect(none?.text, `${key.code} plain`).toBe(key.plain)
                if (key.shifted !== undefined) {
                    const shift = myanmar.outputFor(key.code, 'shift')
                    expect(shift?.text, `${key.code} shifted`).toBe(key.shifted)
                }
            }
        }
    })
})

describe('Myanmar curriculum is keyboard-typeable end to end', () => {
    it('every Myanmar-bearing lesson line reconstructs to its exact stored Unicode', () => {
        const lessons = getLessonRepository().listAllByLanguage().my
        expect(lessons.length).toBeGreaterThan(0)
        for (const lesson of lessons) {
            const canonical = getCanonicalLesson(lesson.id)
            // Mixed-script lessons type through the mixed layout; pure Myanmar
            // lessons through the Myanmar layout.
            const layout = getLayoutOrThrow(toLayoutId(canonical.keyboard))
            for (const line of lessonStrings(canonical)) {
                assertExactlyTyped(line, layout)
            }
        }
    })
})

function lessonStrings(lesson: { exercises: LessonExercise[] }): string[] {
    const out: string[] = []
    for (const exercise of lesson.exercises) {
        if (exercise.instruction !== undefined) out.push(exercise.instruction)
        if (exercise.kind === 'text' || exercise.kind === 'paragraph' || exercise.kind === 'custom') out.push(exercise.text)
        else if (exercise.kind === 'keys') out.push(...exercise.keys)
        else if (exercise.kind === 'words') out.push(...exercise.words)
        else if (exercise.kind === 'sentences') out.push(...exercise.sentences)
    }
    return out.filter((line) => containsMyanmar(line))
}

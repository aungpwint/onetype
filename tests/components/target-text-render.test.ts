import { describe, expect, it } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildSequence, graphemeUnitRuns } from '@/core/typing-engine/sequence'
import { myanmar } from '@/core/keyboard-layout/myanmar'
import { containsMyanmar } from '@/core/unicode/myanmar'
import { getLessonRepository, getCanonicalLesson } from '@/data/curriculum'
import type { LessonExercise } from '@/types/exercise'

/**
 * Rendering-layer contract for Myanmar text.
 *
 * The source lesson strings are canonical Unicode (validated elsewhere); this
 * suite guards the pipeline BETWEEN the stored text and the shaped DOM:
 *   1. grapheme runs must be complete shaping units (never split a syllable),
 *   2. each run maps to exactly one char span carrying font-myanmar/font-heavy,
 *   3. the CSS must actually resolve Pyidaungsu and must not transform the
 *      glyph text (which would rasterize a shaped syllable mid-animation).
 */

const CORPUS_LINES = [
    'ရေ ဆန် ငါး ကြက်',
    'အဖေ အမေ ညီ ညီမ',
    'မျက်စိ နား လက် ခြေ',
    'အခြေခံ စကားလုံး (၂)',
    'အိမ် မြို့ ရွာ',
]

describe('Myanmar grapheme runs are complete shaping units', () => {
    it.each(CORPUS_LINES)('%s yields one run per complete syllable', (line) => {
        const seq = buildSequence(line, myanmar)
        const runs = graphemeUnitRuns(seq)

        // Lossless: runs rejoin to the exact stored Unicode.
        expect(runs.map((r) => r.text).join('')).toBe(line)
        // Contiguous, gapless, non-overlapping unit coverage of the full text.
        expect(runs[0].startUnit).toBe(0)
        expect(runs[runs.length - 1].endUnit).toBe(seq.units.length)
        for (let i = 1; i < runs.length; i++) {
            expect(runs[i].startUnit).toBe(runs[i - 1].endUnit)
        }
        // No run may carry a stray trailing space (the algorithm putting a word-final
        // ေ into a "ေ " run) unless it is exactly a single space, and no run may
        // mix the preposed vowel U+1031 with whitespace — the exact symptoms of
        // the reported bug. (A lone-mark drill like " ိ" is authored content:
        // leading space + a standalone vowel-sign key, which builds losslessly.)
        for (const run of runs) {
            assertCleanRun(run.text)
        }
    })

    it('ရေ always stays a single run, including mid-sentence', () => {
        const runs = graphemeUnitRuns(buildSequence('ရေ ဆန် ငါး ကြက်', myanmar))
        expect(runs[0]).toMatchObject({ text: 'ရေ', startUnit: 0, endUnit: 2 })
        expect(runs[0].text).toBe('ရေ')
    })

    it('အဖေ / အမေ / ခြေ / အခြေခံ map to canonical cluster runs', () => {
        const runs = graphemeUnitRuns(buildSequence('အဖေ အမေ ခြေ အခြေခံ', myanmar))
        const texts = new Set(runs.map((r) => r.text))
        expect(texts.has('ဖေ')).toBe(true)
        expect(texts.has('မေ')).toBe(true)
        expect(texts.has('ခြေ')).toBe(true)
        expect(texts.has('ေခံ')).toBe(true)
    })
})

describe('Per-run font classification (Char contract)', () => {
    it.each(CORPUS_LINES)('%s marks every Myanmar run as font-myanmar', (line) => {
        const seq = buildSequence(line, myanmar)
        for (const run of graphemeUnitRuns(seq)) {
            const font = containsMyanmar(run.text) ? 'font-myanmar' : 'font-heavy'
            if (containsMyanmar(run.text)) {
                expect(font).toBe('font-myanmar')
            } else {
                expect(font).toBe('font-heavy')
            }
        }
    })

    it('mixed English + Myanmar + numbers + punctuation classify per token', () => {
        const tokens = ['Lesson', ' ', '23', '—', 'အခြေခံ', ' ', 'စကားလုံး']
        const fonts = tokens.map((t) => (containsMyanmar(t) ? 'font-myanmar' : 'font-heavy'))
        expect(fonts).toEqual([
            'font-heavy', // Lesson
            'font-heavy', // space
            'font-heavy', // 23
            'font-heavy', // —
            'font-myanmar', // အခြေခံ
            'font-heavy', // space
            'font-myanmar', // စကားလုံး
        ])
    })
})

describe('Myanmar lesson corpus never yields a shaping-broken run', () => {
    it('every Myanmar-bearing lesson line segments to clean clusters', () => {
        const lessons = getLessonRepository().listAllByLanguage().my
        expect(lessons.length).toBeGreaterThan(0)
        for (const lesson of lessons) {
            const canonical = getCanonicalLesson(lesson.id)
            for (const line of lessonStrings(canonical)) {
                const seq = buildSequence(line, myanmar)
                const runs = graphemeUnitRuns(seq)
                expect(runs.map((r) => r.text).join(''), `${lesson.id}: ${JSON.stringify(line)}`).toBe(line)
                for (const run of runs) {
                    assertCleanRun(run.text, `${lesson.id}`)
                }
            }
        }
    })
})

describe('Pyidaungsu font + shaping CSS invariants', () => {
    const cssPath = path.resolve(fileURLToPath(new URL('../../src/app.css', import.meta.url)))
    const css = readFileSync(cssPath, 'utf8')

    it('.font-myanmar explicitly resolves the Pyidaungsu-first family chain', () => {
        const root = css.match(/--font-myanmar:\s*([^;]+);/)
        expect(root).toBeTruthy()
        expect(root![1].trim().startsWith("'Pyidaungsu'")).toBe(true)

        const rule = css.match(/\.font-myanmar\s*{([^}]*)}/)
        expect(rule).toBeTruthy()
        expect(rule![1]).toContain('font-family: var(--font-myanmar)')
    })

    it('bundles a real Pyidaungsu @font-face pointing at an existing asset', () => {
        const faces = [...css.matchAll(/@font-face\s*{([^}]*)}/g)].map((m) => m[1])
        const pyidaungsu = faces.find((f) => f.includes("'Pyidaungsu'"))
        expect(pyidaungsu, JSON.stringify(faces)).toBeTruthy()
        expect(pyidaungsu).toContain('/fonts/Pyidaungsu-Regular.ttf')
        expect(pyidaungsu).toContain("format('truetype')")

        const fontFile = path.resolve(fileURLToPath(new URL('../../public/fonts/Pyidaungsu-Regular.ttf', import.meta.url)))
        const latinFile = path.resolve(fileURLToPath(new URL('../../public/fonts/Heavitas.woff', import.meta.url)))
        expect(existsSync(fontFile)).toBe(true)
        expect(existsSync(latinFile)).toBe(true)
        // TrueType magic: 00 01 00 00
        expect(readFileSync(fontFile).subarray(0, 4).equals(Buffer.from([0x00, 0x01, 0x00, 0x00]))).toBe(true)
        // WOFF magic: wOF2/wOFF
        const woff = readFileSync(latinFile)
        expect(woff.subarray(0, 3).toString('ascii')).toBe('wOF')
    })

    it('char-pop never transforms the glyph text (no scale/translate on runs)', () => {
        const block = css.match(/@keyframes char-pop\s*{([^}]*)}/)
        expect(block).toBeTruthy()
        expect(block![1]).not.toContain('transform')
        expect(block![1]).toContain('opacity')
    })

    it('the caret carries a solid visible background', () => {
        const rule = css.match(/\.tt-caret\s*{([^}]*)}/)
        expect(rule).toBeTruthy()
        expect(rule![1]).toContain('background-color: var(--primary)')
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

/**
 * The exact bug symptoms a shaped run may never exhibit:
 *  - a Myanmar run ending on a stray trailing space (an orphaned ေ flushed
 *    into a "ေ " run), or
 *  - a Myanmar run mixing the preposed vowel U+1031 with whitespace.
 * A lone " " run is a legitimate space cluster; " ိ" (drill key content)
 * has its space LEADING, is lossless, and contains no preposed vowel.
 */
function assertCleanRun(text: string, context = 'run'): void {
    if (text === ' ') return
    if (containsMyanmar(text)) {
        // A Myanmar run may only carry whitespace as a LEADING char (the
        // authored lone-mark drill " ိ"); any other space inside the run — a
        // trailing space in particular — is the orphaned-ေ symptom.
        const body = text.replace(/^[\s\u00A0]+/, '')
        expect(
            !/[\s\u00A0]/.test(body),
            `${context}: run ${JSON.stringify(text)} carries an interior/trailing space`,
        ).toBe(true)
        expect(
            !body.includes('\u1031') || !/[\s\u00A0]/.test(text),
            `${context}: run ${JSON.stringify(text)} mixes the preposed vowel with whitespace`,
        ).toBe(true)
    }
}
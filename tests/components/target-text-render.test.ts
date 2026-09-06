import { describe, expect, it } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildSequence, graphemeUnitRuns } from '@/core/typing-engine/sequence'
import { isCurrentGrapheme } from '@/core/typing-engine/char-state'
import { englishQwerty } from '@/core/keyboard-layout/english-qwerty'
import { myanmar } from '@/core/keyboard-layout/myanmar'
import { containsMyanmar } from '@/core/unicode/myanmar'
import { getLessonRepository, getCanonicalLesson, resolveLessonById } from '@/data/curriculum'
import { exerciseText, type LessonExercise } from '@/types/exercise'

const CORPUS_LINES = ['ရေ ဆန် ငါး ကြက်', 'အဖေ အမေ ညီ ညီမ', 'မျက်စိ နား လက် ခြေ', 'အခြေခံ စကားလုံး (၂)', 'အိမ် မြို့ ရွာ']

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

describe('Target text displays the exact lesson data', () => {
    it('every phase of every lesson resolves to its original exercise text', () => {
        const repo = getLessonRepository()
        const lessons = [...repo.listAllByLanguage().my, ...repo.listAllByLanguage().en]
        for (const lesson of lessons) {
            const canonical = getCanonicalLesson(lesson.id)
            const resolved = resolveLessonById(lesson.id)
            expect(resolved.phases.length, `${lesson.id}: phase/exercise count mismatch`).toBe(canonical.exercises.length)
            for (let i = 0; i < canonical.exercises.length; i++) {
                const expected = exerciseText(canonical.exercises[i]!)
                expect(resolved.phases[i]!.text, `${lesson.id} phase ${i} deviates from original data`).toBe(expected)
            }
        }
    })

    it('English uppercase (Shift) lessons keep their exact letters (case preserved) on screen', () => {
        const resolved = resolveLessonById('lesson-en-beginner-31')
        const first = 'aA aA aA aA aA aA aA aA aA aA'
        expect(resolved.phases[0]!.text).toBe(first)
        expect(resolved.phases[0]!.text).toMatch(/[a-z]/)
        expect(resolved.phases[0]!.text).toMatch(/[A-Z]/)
    })

    it('the resolved sequence text is precisely the phases as shown, joined with a space', () => {
        const repo = getLessonRepository()
        const lessons = [...repo.listAllByLanguage().my, ...repo.listAllByLanguage().en]
        for (const lesson of lessons) {
            const resolved = resolveLessonById(lesson.id)
            expect(resolved.sequence.text, lesson.id).toBe(resolved.phases.map((p) => p.text).join(' '))
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
        expect(
            readFileSync(fontFile)
                .subarray(0, 4)
                .equals(Buffer.from([0x00, 0x01, 0x00, 0x00])),
        ).toBe(true)
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

describe('Regression: current word ≠ current grapheme (repeat-char isolation)', () => {
    it('Myanmar "က က က က": exactly one grapheme is "current" at any caret', () => {
        const seq = buildSequence('က က က က', myanmar)
        const runs = graphemeUnitRuns(seq)

        // Four က plus three spaces. Each က maps to its own unit range.
        expect(runs).toHaveLength(7)
        const kaRuns = runs.filter((r) => !r.text.includes(' '))
        expect(kaRuns).toHaveLength(4)

        // At each ka-grapheme's start unit, exactly that grapheme is current.
        for (const ka of kaRuns) {
            const active = runs.filter((g) => isCurrentGrapheme(ka.startUnit, g.startUnit, g.endUnit))
            expect(active).toHaveLength(1)
            expect(active[0]).toEqual(ka)
        }

        // Important: having typed the first က (and the space), the NEXT identical
        // က must NOT be highlighted, and only the second ka is current at its own
        // start unit.
        const first = kaRuns[0]!
        const second = kaRuns[1]!
        expect(isCurrentGrapheme(first.endUnit, first.startUnit, first.endUnit)).toBe(false)
        expect(isCurrentGrapheme(second.startUnit, second.startUnit, second.endUnit)).toBe(true)
    })

    it('English repeated characters "aaaa": only the typed letter is current', () => {
        const seq = buildSequence('aaaa', englishQwerty)
        const runs = graphemeUnitRuns(seq)
        expect(runs).toHaveLength(4)

        for (let i = 0; i < runs.length; i++) {
            const r = runs[i]!
            const active = runs.filter((g) => isCurrentGrapheme(r.startUnit, g.startUnit, g.endUnit))
            expect(active, `caret at index ${i}`).toHaveLength(1)
            expect(active[0]).toEqual(r)
        }

        // Typing the second 'a' (unit 1) highlights ONLY the second a, never the
        // first or the third.
        expect(isCurrentGrapheme(1, runs[0]!.startUnit, runs[0]!.endUnit)).toBe(false)
        expect(isCurrentGrapheme(1, runs[1]!.startUnit, runs[1]!.endUnit)).toBe(true)
        expect(isCurrentGrapheme(1, runs[2]!.startUnit, runs[2]!.endUnit)).toBe(false)
    })

    it('the highlight never bleeds across a single Myanmar word — 3-grapheme "အခြေခံ"', () => {
        // အခြေခံ is ONE word made of THREE graphemes: 'အ' [0,1), 'ခြ' [1,3),
        // 'ေခံ' [3,6). While typing any one of them, ONLY that grapheme is
        // current — the other two graphemes of the same word are NOT.
        const seq = buildSequence('အခြေခံ', myanmar)
        const runs = graphemeUnitRuns(seq)
        expect(runs.map((r) => r.text).join('')).toBe('အခြေခံ')
        expect(runs).toHaveLength(3)

        // Caret on the first grapheme (unit 0).
        expect(isCurrentGrapheme(0, runs[0]!.startUnit, runs[0]!.endUnit)).toBe(true)
        expect(isCurrentGrapheme(0, runs[1]!.startUnit, runs[1]!.endUnit)).toBe(false)
        expect(isCurrentGrapheme(0, runs[2]!.startUnit, runs[2]!.endUnit)).toBe(false)

        // Caret on the middle grapheme (unit 1, inside 'ခြ').
        expect(isCurrentGrapheme(1, runs[0]!.startUnit, runs[0]!.endUnit)).toBe(false)
        expect(isCurrentGrapheme(1, runs[1]!.startUnit, runs[1]!.endUnit)).toBe(true)
        expect(isCurrentGrapheme(1, runs[2]!.startUnit, runs[2]!.endUnit)).toBe(false)

        // Caret on the last grapheme (unit 3, inside 'ေခံ').
        expect(isCurrentGrapheme(3, runs[0]!.startUnit, runs[0]!.endUnit)).toBe(false)
        expect(isCurrentGrapheme(3, runs[1]!.startUnit, runs[1]!.endUnit)).toBe(false)
        expect(isCurrentGrapheme(3, runs[2]!.startUnit, runs[2]!.endUnit)).toBe(true)
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

function assertCleanRun(text: string, context = 'run'): void {
    if (text === ' ') return
    if (containsMyanmar(text)) {
        const body = text.replace(/^[\s\u00A0]+/, '')
        expect(!/[\s\u00A0]/.test(body), `${context}: run ${JSON.stringify(text)} carries an interior/trailing space`).toBe(true)
        expect(
            !body.includes('\u1031') || !/[\s\u00A0]/.test(text),
            `${context}: run ${JSON.stringify(text)} mixes the preposed vowel with whitespace`,
        ).toBe(true)
    }
}

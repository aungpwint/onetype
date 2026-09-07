import { describe, expect, it } from 'vitest'
import { getCanonicalLesson, getLessonRepository, resolveLessonById } from '@/data/curriculum'
import type { GeneratedExercise } from '@/types/exercise'
import { isGeneratedExercise } from '@/types/exercise'
import { languageDefinitionFor } from '@/core/pedagogy'

const PLANNED = 126

function allGenerated(lessonId: string): GeneratedExercise[] {
    return getCanonicalLesson(lessonId).exercises.filter(isGeneratedExercise) as GeneratedExercise[]
}

describe('migrated generated content', () => {
    const lessons = getLessonRepository().getLessons()

    it('exactly the planned lesson set is generated; the rest stay authored prose', () => {
        let generated = 0
        for (const lesson of lessons) {
            if (getCanonicalLesson(lesson.id).exercises.some(isGeneratedExercise)) generated += 1
        }
        expect(generated).toBe(PLANNED)
        // bilingual advanced lesson keeps its authored prose
        const bilingual = getCanonicalLesson('lesson-my-advanced-11')
        expect(bilingual.exercises.every((e) => !isGeneratedExercise(e))).toBe(true)
    })

    it('every generated exercise carries a schema-shaped generator', () => {
        for (const lesson of lessons) {
            for (const ex of allGenerated(lesson.id)) {
                const gen = ex.generator
                expect(['chunks', 'words', 'sentences'], `${lesson.id}: ${gen.type}`).toContain(gen.type)
                expect(gen.count, lesson.id).toBeGreaterThan(0)
                if (gen.type === 'chunks') {
                    expect(gen.keys?.length, lesson.id).toBeGreaterThan(0)
                    expect(gen.chunkMin, lesson.id).toBeGreaterThan(0)
                    expect(gen.chunkMax, lesson.id).toBeGreaterThanOrEqual(gen.chunkMin!)
                }
            }
        }
    })

    it('resolves identically across repeated calls (deterministic seeding)', () => {
        for (const lesson of lessons) {
            if (allGenerated(lesson.id).length === 0) continue
            const a = resolveLessonById(lesson.id)
            const b = resolveLessonById(lesson.id)
            expect(a.sequence.text, lesson.id).toBe(b.sequence.text)
            expect(a.sequence.units.length, lesson.id).toBe(b.sequence.units.length)
        }
    })

    it('declared focusKeys are each exercised by the generated text', () => {
        for (const lesson of lessons) {
            if (allGenerated(lesson.id).length === 0) continue
            const canonical = getCanonicalLesson(lesson.id)
            const declared = canonical.focusKeys ?? []
            const resolved = resolveLessonById(lesson.id)
            const unitCodes = new Set(resolved.sequence.units.map((u) => u.keyCode))
            const hasShiftRight = resolved.sequence.units.some((u) => u.modifier === 'shift' && u.shiftHand === 'right')
            const hasShiftLeft = resolved.sequence.units.some((u) => u.modifier === 'shift' && u.shiftHand === 'left')
            for (const code of declared) {
                if (code === 'ShiftRight') expect(hasShiftRight, `${lesson.id} should exercise ShiftRight`).toBe(true)
                else if (code === 'ShiftLeft') expect(hasShiftLeft, `${lesson.id} should exercise ShiftLeft`).toBe(true)
                else expect(unitCodes.has(code), `${lesson.id} should exercise ${code}`).toBe(true)
            }
        }
    })

    it('keeps spacing healthy (no double spaces, no empty tokens)', () => {
        for (const lesson of lessons) {
            if (allGenerated(lesson.id).length === 0) continue
            const resolved = resolveLessonById(lesson.id)
            expect(resolved.sequence.text.includes('  '), lesson.id).toBe(false)
            for (const phase of resolved.phases) {
                expect(phase.text.trimStart(), lesson.id).toBe(phase.text)
            }
        }
    })

    it('every generated source string is fully typeable through its layout', () => {
        for (const lesson of lessons) {
            for (const ex of allGenerated(lesson.id)) {
                const gen = ex.generator
                const lang = lesson.language === 'myanmar' ? 'myanmar' : 'english'
                const layout = languageDefinitionFor(lang)
                const sources = gen.type === 'chunks' ? gen.keys : gen.type === 'words' ? gen.words ?? [] : gen.sentences ?? []
                for (const source of sources) {
                    expect(() => layout.splitUnits(source), `${lesson.id}: ${JSON.stringify(source)}`).not.toThrow()
                }
            }
        }
    })
})

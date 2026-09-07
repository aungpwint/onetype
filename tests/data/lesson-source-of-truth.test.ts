import { describe, expect, it } from 'vitest'
import catalog from '@/data/lesson-catalog.json'
import { getLessonRepository, getCanonicalLesson } from '@/data/curriculum'

type CatalogJson = {
    schemaVersion: number
    lessons: Array<{ id: string; language: string; level: string; number: number; file: string }>
}

const CATALOG = catalog as CatalogJson
const repository = await getLessonRepository()

const LANGUAGE_TOTAL: Record<string, number> = { en: 92, my: 58 }
const LEVEL_TOTAL: Record<string, number> = { beginner: 81, intermediate: 33, advanced: 36 }

describe('lesson JSON source of truth', () => {
    const lessons = repository.getLessons()

    it('serves exactly the cataloged lesson set with no duplicates', () => {
        const repositoryIds = repository.ids()
        const catalogIds = CATALOG.lessons.map((entry) => entry.id)
        expect(repositoryIds).toHaveLength(150)
        expect([...repositoryIds].sort()).toEqual([...catalogIds].sort())
        expect(new Set(repositoryIds).size).toBe(150)
    })

    it('has the expected per-language and per-level totals', () => {
        const perLanguage = repository.listAllByLanguage()
        for (const [language, expected] of Object.entries(LANGUAGE_TOTAL)) {
            expect(perLanguage[language as 'en' | 'my'], `language "${language}"`).toHaveLength(expected)
        }
        for (const [level, expected] of Object.entries(LEVEL_TOTAL)) {
            expect(repository.totalInLevel(level as 'beginner' | 'intermediate' | 'advanced'), `level "${level}"`).toBe(expected)
        }
        expect(repository.lessonCount()).toBe(150)
    })

    it('every catalog entry is unique and consistent with its lesson file', async () => {
        const catalogKeys = new Set(CATALOG.lessons.map((entry) => entry.id))
        expect(catalogKeys.size).toBe(CATALOG.lessons.length)

        for (const entry of CATALOG.lessons) {
            const lesson = await getCanonicalLesson(entry.id)
            expect(lesson.language).toBe(entry.language)
            expect(lesson.level).toBe(entry.level)
            expect(lesson.number).toBe(entry.number)
            expect(entry.file.startsWith(`${entry.language}/${entry.level}/`)).toBe(true)
            expect(lesson.schemaVersion).toBe(CATALOG.schemaVersion)
        }
    })

    it('every lesson normalizes with non-empty phases and coherent ids', () => {
        for (const lesson of lessons) {
            expect(lesson.id.startsWith('lesson-')).toBe(true)
            expect(lesson.phases.length).toBe(lesson.exercises.length)
            for (const phase of lesson.phases) {
                expect(phase.text.length).toBeGreaterThan(0)
                expect(phase.instruction.length).toBeGreaterThan(0)
            }
        }
    })

    it('no lesson carries an empty exercise set', async () => {
        for (const lesson of lessons) {
            expect((await getCanonicalLesson(lesson.id)).exercises.length).toBeGreaterThan(0)
        }
    })
})

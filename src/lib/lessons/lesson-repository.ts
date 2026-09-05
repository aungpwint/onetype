import { LEVEL_ORDER, type Level } from '@/types'
import type { LessonLanguage } from '@/types/language'
import type { NormalizedExercise } from '@/types/exercise'
import type { NormalizedLesson } from '@/types/lesson'
import type { Lesson } from '@/types/lesson'

import { normalizeLesson } from './lesson-normalizer'
import { LessonNotFoundError } from './lesson-errors'
import { loadLessonRecords, type LessonRecord } from './lesson-loader'

import { LessonRegistry } from './lesson-registry'

const EMPTY_BY_LANGUAGE = (): Record<LessonLanguage, NormalizedLesson[]> => ({ en: [], my: [] })
const EMPTY_BY_LANGUAGE_LEVEL = (): Record<LessonLanguage, Record<Level, NormalizedLesson[]>> => ({
    en: { beginner: [], intermediate: [], advanced: [] },
    my: { beginner: [], intermediate: [], advanced: [] },
})

const LANGUAGE_ORDER: Record<LessonLanguage, number> = { en: 0, my: 1 }

function compareLessons(a: Lesson, b: Lesson): number {
    const lang = LANGUAGE_ORDER[a.language] - LANGUAGE_ORDER[b.language]
    if (lang !== 0) return lang
    const level = LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level)
    if (level !== 0) return level
    return a.number - b.number
}

/**
 * Read model over normalized lessons. Every entry is structurally a
 * `LessonData`, so the curriculum resolver and existing stores consume it
 * unchanged.
 */
export interface LessonRepository {
    getLessons(): NormalizedLesson[]
    getLesson(id: string): NormalizedLesson
    getCanonicalLesson(id: string): Lesson
    hasLesson(id: string): boolean
    listByLevel(level: Level): NormalizedLesson[]
    listByLanguage(language: LessonLanguage): NormalizedLesson[]
    listByLanguageAndLevel(language: LessonLanguage, level: Level): NormalizedLesson[]
    listAllByLevel(): Record<Level, NormalizedLesson[]>
    listAllByLanguage(): Record<LessonLanguage, NormalizedLesson[]>
    listAllByLanguageAndLevel(): Record<LessonLanguage, Record<Level, NormalizedLesson[]>>
    lessonCount(): number
    totalInLevel(level: Level): number
    exercisesOf(id: string): NormalizedExercise[]
    ids(): string[]
}

class InMemoryLessonRepository implements LessonRepository {
    private readonly registry: LessonRegistry
    private readonly normalized: Map<string, NormalizedLesson>

    constructor(registry: LessonRegistry) {
        this.registry = registry
        this.normalized = new Map()
    }

    private getNormalized(lesson: Lesson): NormalizedLesson {
        const existing = this.normalized.get(lesson.id)
        if (existing !== undefined) return existing
        const normalized = normalizeLesson(lesson)
        this.normalized.set(lesson.id, normalized)
        return normalized
    }

    getLessons(): NormalizedLesson[] {
        return this.registry
            .getAll()
            .slice()
            .sort(compareLessons)
            .map((lesson) => this.getNormalized(lesson))
    }

    getLesson(id: string): NormalizedLesson {
        const lesson = this.registry.getById(id)
        if (lesson === undefined) throw new LessonNotFoundError(id)
        return this.getNormalized(lesson)
    }

    getCanonicalLesson(id: string): Lesson {
        const lesson = this.registry.getById(id)
        if (lesson === undefined) throw new LessonNotFoundError(id)
        return lesson
    }

    hasLesson(id: string): boolean {
        return this.registry.getById(id) !== undefined
    }

    listByLevel(level: Level): NormalizedLesson[] {
        return this.registry
            .getByLevel(level)
            .sort((a, b) => a.number - b.number)
            .map((lesson) => this.getNormalized(lesson))
    }

    listByLanguage(language: LessonLanguage): NormalizedLesson[] {
        return this.registry
            .getByLanguage(language)
            .sort((a, b) => a.number - b.number)
            .map((lesson) => this.getNormalized(lesson))
    }

    listByLanguageAndLevel(language: LessonLanguage, level: Level): NormalizedLesson[] {
        return this.registry
            .getByLanguageAndLevel(language, level)
            .sort((a, b) => a.number - b.number)
            .map((lesson) => this.getNormalized(lesson))
    }

    listAllByLevel(): Record<Level, NormalizedLesson[]> {
        const out: Record<Level, NormalizedLesson[]> = { beginner: [], intermediate: [], advanced: [] }
        for (const level of LEVEL_ORDER) {
            out[level] = this.listByLevel(level)
        }
        return out
    }

    listAllByLanguage(): Record<LessonLanguage, NormalizedLesson[]> {
        const out = EMPTY_BY_LANGUAGE()
        for (const language of ['en', 'my'] as const) {
            out[language] = this.listByLanguage(language)
        }
        return out
    }

    listAllByLanguageAndLevel(): Record<LessonLanguage, Record<Level, NormalizedLesson[]>> {
        const out = EMPTY_BY_LANGUAGE_LEVEL()
        for (const language of ['en', 'my'] as const) {
            for (const level of LEVEL_ORDER) {
                out[language][level] = this.listByLanguageAndLevel(language, level)
            }
        }
        return out
    }

    lessonCount(): number {
        return this.registry.count()
    }

    totalInLevel(level: Level): number {
        return this.registry.totalInLevel(level)
    }

    exercisesOf(id: string): NormalizedExercise[] {
        const lesson = this.registry.getById(id)
        if (lesson === undefined) throw new LessonNotFoundError(id)
        return this.getNormalized(lesson).exercises
    }

    ids(): string[] {
        return this.registry
            .getAll()
            .slice()
            .sort(compareLessons)
            .map((lesson) => lesson.id)
    }
}

export function createLessonRepository(records: LessonRecord[] = loadLessonRecords()): LessonRepository {
    return new InMemoryLessonRepository(new LessonRegistry(records))
}

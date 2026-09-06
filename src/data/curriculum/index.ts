import type { Level } from '@/types'
import type { LessonData } from './types'
import { resolveLesson, type ResolvedLesson } from './generator'
import { createLessonRepository, type LessonRepository } from '@/lib/lessons'
import type { Lesson } from '@/types/lesson'

interface CurriculumMeta {
    totalLessons: number
    countsByLevel: Record<Level, number>
}

const LESSON_IDS: string[] = []

const RESOLVED_LESSON_CACHE = new Map<string, ResolvedLesson>()

const repository: LessonRepository = createLessonRepository()

function rebindIds(): void {
    LESSON_IDS.length = 0
    LESSON_IDS.push(...repository.ids())
}
rebindIds()

export function listAllLessons(): LessonData[] {
    return repository.getLessons()
}

export function getLessonData(id: string): LessonData {
    return repository.getLesson(id)
}

export function hasLesson(id: string): boolean {
    return repository.hasLesson(id)
}

export function listLessonsByLevel(): Record<Level, LessonData[]> {
    return repository.listAllByLevel()
}

export function resolveLessonById(id: string): ResolvedLesson {
    const cached = RESOLVED_LESSON_CACHE.get(id)
    if (cached) return cached
    const resolved = resolveLesson(getLessonData(id))
    RESOLVED_LESSON_CACHE.set(id, resolved)
    return resolved
}

export function getCurriculumMeta(): CurriculumMeta {
    return {
        totalLessons: repository.lessonCount(),
        countsByLevel: {
            beginner: repository.totalInLevel('beginner'),
            intermediate: repository.totalInLevel('intermediate'),
            advanced: repository.totalInLevel('advanced'),
        },
    }
}

export function allResolvedLessonIds(): string[] {
    return LESSON_IDS
}

export function getLessonRepository(): LessonRepository {
    return repository
}

export function getCanonicalLesson(id: string): Lesson {
    return repository.getCanonicalLesson(id)
}

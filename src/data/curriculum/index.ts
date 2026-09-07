import type { Level } from '@/types'
import type { LessonData } from './types'
import { resolveLesson, type ResolvedLesson } from './generator'
import type { LessonRepository } from '@/lib/lessons'
import type { Lesson } from '@/types/lesson'
import type { LessonCount } from '@/services/types'

interface CurriculumMeta {
    totalLessons: number
    countsByLevel: Record<Level, number>
}

const RESOLVED_LESSON_CACHE = new Map<string, ResolvedLesson>()

// The whole lesson catalog (JSON files, zod validation, repository build) is
// lazy: it only needs to exist once a session or the Learn screen starts, so
// nothing pays for it at boot. All callers go through the async API below.
let repositoryPromise: Promise<LessonRepository> | null = null

export function getLessonRepository(): Promise<LessonRepository> {
    repositoryPromise ??= import('@/lib/lessons').then((m) => m.createLessonRepository())
    return repositoryPromise
}

export async function listAllLessons(): Promise<LessonData[]> {
    return (await getLessonRepository()).getLessons()
}

export async function getLessonData(id: string): Promise<LessonData> {
    return (await getLessonRepository()).getLesson(id)
}

export async function hasLesson(id: string): Promise<boolean> {
    return (await getLessonRepository()).hasLesson(id)
}

export async function listLessonsByLevel(): Promise<Record<Level, LessonData[]>> {
    return (await getLessonRepository()).listAllByLevel()
}

export async function resolveLessonById(id: string): Promise<ResolvedLesson> {
    const cached = RESOLVED_LESSON_CACHE.get(id)
    if (cached) return cached
    const resolved = resolveLesson(await getLessonData(id))
    RESOLVED_LESSON_CACHE.set(id, resolved)
    return resolved
}

export async function getCurriculumMeta(): Promise<CurriculumMeta> {
    const repository = await getLessonRepository()
    return {
        totalLessons: repository.lessonCount(),
        countsByLevel: {
            beginner: repository.totalInLevel('beginner'),
            intermediate: repository.totalInLevel('intermediate'),
            advanced: repository.totalInLevel('advanced'),
        },
    }
}

export async function allResolvedLessonIds(): Promise<string[]> {
    return (await getLessonRepository()).ids()
}

export async function getCanonicalLesson(id: string): Promise<Lesson> {
    return (await getLessonRepository()).getCanonicalLesson(id)
}

// Lesson-count rows served by the persistence layer carry their own totals;
// those must never be trusted for display because neither runtime knows the
// actual curriculum size. Overlay the real per-level totals here so teacher
// and progress screens agree across browser and Tauri backends.
export async function lessonCountsWithCurriculumTotals(counts: LessonCount[]): Promise<LessonCount[]> {
    const totals = (await getCurriculumMeta()).countsByLevel
    return counts.map((lc) => ({
        ...lc,
        total: totals[lc.level as Level] ?? lc.total,
    }))
}
import { create } from 'zustand'
import * as backend from '@/services/backend'
import type { LessonProgress } from '@/services/types'
import { listLessonsByLevel } from '@/data/curriculum'
import type { LessonData } from '@/data/curriculum/types'

type CurriculumLevel = 'beginner' | 'intermediate' | 'advanced'

const EMPTY_LEVELS: Record<CurriculumLevel, LessonData[]> = {
    beginner: [],
    intermediate: [],
    advanced: [],
}

interface LessonState {
    lessonsByLevel: Record<CurriculumLevel, LessonData[]>
    catalogLoaded: boolean
    catalogError: string | null
    progress: Record<string, LessonProgress> | null
    progressStudentId: string | null
    loading: boolean
    error: string | null
    loadCatalog: () => Promise<void>
    loadProgress: (studentId: string) => Promise<void>
    clearProgress: () => void
    saveProgress: (req: Parameters<typeof backend.saveLessonProgress>[0]) => Promise<LessonProgress>
    uncompletedLessonsForLevel: (level: CurriculumLevel) => LessonData[]
}

// The catalog is a singleton: concurrent callers share one in-flight load and
// a failed load resets so a later navigation can retry.
let catalogPromise: Promise<void> | null = null

// Monotonic token so a slower previous load can never overwrite a newer one
// when the active student switches quickly (A → B with A's IPC resolving last).
let loadProgressToken = 0

export const useLessonStore = create<LessonState>((set, get) => ({
    lessonsByLevel: EMPTY_LEVELS,
    catalogLoaded: false,
    catalogError: null,
    progress: null,
    progressStudentId: null,
    loading: false,
    error: null,
    loadCatalog: () => {
        if (get().catalogLoaded) return Promise.resolve()
        catalogPromise ??= listLessonsByLevel()
            .then((lessonsByLevel) => {
                set({ lessonsByLevel, catalogLoaded: true, catalogError: null })
            })
            .catch((error) => {
                catalogPromise = null
                set({ catalogError: error instanceof Error ? error.message : String(error) })
            })
        return catalogPromise
    },
    loadProgress: async (studentId) => {
        const token = ++loadProgressToken
        set({ loading: true, error: null })
        try {
            const rows = await backend.listLessonProgress(studentId)
            if (token !== loadProgressToken) return
            const map: Record<string, LessonProgress> = {}
            for (const row of rows) map[row.lessonId] = row
            set({ progress: map, progressStudentId: studentId, loading: false })
        } catch (error) {
            if (token !== loadProgressToken) return
            set({ loading: false, error: error instanceof Error ? error.message : String(error) })
        }
    },
    clearProgress: () => set({ progress: null, progressStudentId: null }),
    saveProgress: async (req) => {        const saved = await backend.saveLessonProgress(req)
        set((state) => {
            if (state.progressStudentId !== req.studentId) return { progress: state.progress }
            const map = { ...(state.progress ?? {}) }
            map[req.lessonId] = saved
            return { progress: map }
        })
        return saved
    },
    uncompletedLessonsForLevel: (level) => {
        const progress = get().progress ?? {}
        return get()
            .lessonsByLevel[level].slice()
            .sort((a, b) => a.number - b.number)
            .filter((lesson) => !progress[lesson.id]?.completed)
    },
}))
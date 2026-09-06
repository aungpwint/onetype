import type { Lesson } from '@/types/lesson'
import { validateLesson } from './lesson-validator'
import { LessonCatalogError } from './lesson-errors'

export interface LessonRecord {
    source: string
    lesson: Lesson
}

export function loadLessonRecords(): LessonRecord[] {
    const modules = import.meta.glob('../../data/lessons/**/*.json', {
        eager: true,
        query: '?raw',
        import: 'default',
    })

    const records: LessonRecord[] = []
    const issues: string[] = []

    for (const [source, rawValue] of Object.entries(modules)) {
        if (typeof rawValue !== 'string') {
            issues.push(`Lesson file "${source}" did not resolve to a JSON string`)
            continue
        }
        try {
            const lesson = validateLesson(JSON.parse(rawValue), source)
            records.push({ source, lesson })
        } catch (error) {
            issues.push(`${source}: ${(error as Error).message}`)
        }
    }

    if (issues.length > 0) {
        throw new LessonCatalogError(issues)
    }

    return records
}

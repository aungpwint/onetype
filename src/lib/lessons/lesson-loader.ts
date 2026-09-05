import type { Lesson } from '@/types/lesson'
import { validateLesson } from './lesson-validator'
import { LessonCatalogError } from './lesson-errors'

export interface LessonRecord {
    /** Bundle-relative import path of the JSON file (e.g. "../../data/lessons/en/beginner/001-foo.json"). */
    source: string
    lesson: Lesson
}

/**
 * Load every lesson JSON file bundled under `src/data/lessons/...json`.
 *
 * Discovery uses Vite's `import.meta.glob` so custom lessons are picked up
 * automatically on the next build/dev restart — no registry edit required.
 * Because lessons are validated at load time, malformed or unknown-schema
 * content fails fast on boot rather than surfacing mid-session.
 */
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

import type { ZodIssue } from 'zod'
import { LESSON_SCHEMA_VERSION, type Lesson } from '@/types/lesson'

import { isLessonExerciseKind } from '@/types/exercise'
import { lessonSchema } from '@/schemas/lesson'
import { LessonValidationError, LessonParseError, UnsupportedExerciseTypeError, UnsupportedLessonSchemaError } from './lesson-errors'

export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function formatPath(path: ReadonlyArray<PropertyKey>): string {
    return path.length === 0 ? '' : path.join('.') + ': '
}

function lessonValidationIssues(issues: ReadonlyArray<ZodIssue>): string[] {
    return issues.map((issue) => `${formatPath(issue.path)}${issue.message}`)
}

/**
 * Reject exercises whose `kind` the loader cannot play. This is a semantic
 * failure (unsupported content), distinct from a malformed shape, so it gets a
 * dedicated error type rather than a generic validation issue.
 */
function assertSupportedExerciseKinds(rawExercises: unknown, lessonId?: string): void {
    if (!Array.isArray(rawExercises)) return
    for (const raw of rawExercises) {
        if (!isRecord(raw)) continue
        const kind = raw.kind
        if (typeof kind !== 'string' || !isLessonExerciseKind(kind)) {
            throw new UnsupportedExerciseTypeError(typeof kind === 'string' ? kind : '<missing>', lessonId)
        }
    }
}

/**
 * Validate an arbitrary parsed-JSON value as a canonical Lesson.
 *
 * Throws `UnsupportedLessonSchemaError`, `UnsupportedExerciseTypeError` or
 * `LessonValidationError` on failure. Returns a fully typed `Lesson` on
 * success.
 */
export function validateLesson(value: unknown, _source?: string): Lesson {
    if (!isRecord(value)) {
        throw new LessonValidationError(['lesson root must be an object'], undefined)
    }
    const lessonId = typeof value.id === 'string' ? value.id : undefined

    if (typeof value.schemaVersion === 'number' && value.schemaVersion > LESSON_SCHEMA_VERSION) {
        throw new UnsupportedLessonSchemaError(value.schemaVersion, lessonId)
    }

    assertSupportedExerciseKinds(value.exercises, lessonId)

    const result = lessonSchema.safeParse(value)
    if (!result.success) {
        throw new LessonValidationError(lessonValidationIssues(result.error.issues), lessonId)
    }
    return result.data as Lesson
}

export interface LessonSchemaValidation {
    type: 'lesson-schema'
    schemaVersion: number
}

export function lessonSchemaInfo(value: unknown): LessonSchemaValidation | null {
    if (!isRecord(value)) return null
    return {
        type: 'lesson-schema',
        schemaVersion: typeof value.schemaVersion === 'number' ? value.schemaVersion : LESSON_SCHEMA_VERSION,
    }
}

/** Parse + validate a JSON string into a typed Lesson. */
export function parseLesson(json: string, source: string): Lesson {
    let raw: unknown
    try {
        raw = JSON.parse(json)
    } catch (error) {
        throw new LessonParseError(`Could not parse JSON from "${source}": ${(error as Error).message}`, source)
    }
    return validateLesson(raw, source)
}

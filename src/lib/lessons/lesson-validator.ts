import type { ZodIssue } from 'zod'
import { LESSON_SCHEMA_VERSION, type Lesson } from '@/types/lesson'

import { isLessonExerciseKind } from '@/types/exercise'
import { containsMyanmar, validateMyanmarText } from '@/core/unicode/myanmar'
import { lessonSchema } from '@/schemas/lesson'
import { LessonValidationError, LessonParseError, UnsupportedExerciseTypeError, UnsupportedLessonSchemaError } from './lesson-errors'

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function formatPath(path: ReadonlyArray<PropertyKey>): string {
    return path.length === 0 ? '' : path.join('.') + ': '
}

function lessonValidationIssues(issues: ReadonlyArray<ZodIssue>): string[] {
    return issues.map((issue) => `${formatPath(issue.path)}${issue.message}`)
}

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

function validateMyanmarLessonUnicode(lesson: Lesson): void {
    if (lesson.language !== 'my') return
    const issues: string[] = []
    const check = (value: string, exerciseId: string | undefined, field: string): void => {
        if (!containsMyanmar(value)) return
        for (const problem of validateMyanmarText(value)) {
            const where = exerciseId !== undefined ? `lesson: ${lesson.id} exercise: ${exerciseId}` : `lesson: ${lesson.id}`
            const code = problem.codePoint === 0 ? '' : ` (U+${problem.codePoint.toString(16).toUpperCase().padStart(4, '0')})`
            issues.push(`${where} field: ${field} problem: ${problem.message}${code}`)
        }
    }
    check(lesson.titleMy ?? '', undefined, 'titleMy')
    check(lesson.description, undefined, 'description')
    for (const exercise of lesson.exercises) {
        const exerciseId = exercise.id
        check(exercise.instruction ?? '', exerciseId, 'instruction')
        if ('text' in exercise && typeof exercise.text === 'string') {
            check(exercise.text, exerciseId, 'text')
        }
        if ('keys' in exercise) {
            for (const key of exercise.keys) check(key, exerciseId, 'keys')
        }
        if ('words' in exercise) {
            for (const word of exercise.words) check(word, exerciseId, 'words')
        }
        if ('sentences' in exercise) {
            for (const sentence of exercise.sentences) check(sentence, exerciseId, 'sentences')
        }
        if ('subtype' in exercise && typeof exercise.subtype === 'string') {
            check(exercise.subtype, exerciseId, 'subtype')
        }
    }
    if (issues.length > 0) {
        throw new LessonValidationError(issues, lesson.id)
    }
}

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
    const lesson = result.data as Lesson
    validateMyanmarLessonUnicode(lesson)
    return lesson
}

export function parseLesson(json: string, source: string): Lesson {
    let raw: unknown
    try {
        raw = JSON.parse(json)
    } catch (error) {
        throw new LessonParseError(`Could not parse JSON from "${source}": ${(error as Error).message}`, source)
    }
    return validateLesson(raw, source)
}

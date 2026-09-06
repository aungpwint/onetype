import type { LessonExercise, ExerciseOptions, NormalizedExercise } from './exercise'
import type { LessonLanguage } from './language'
import type { KeyboardId } from './keyboard'
import type { Difficulty, FingerId, Hand, Language, Level, LessonFocus } from './index'

/** Current lesson JSON schema version understood by the loader. */
export const LESSON_SCHEMA_VERSION = 1

export interface LessonCompletionRule {
    minAccuracy: number
    minWpm: number | null
}

/**
 * Canonical, serializable lesson model — the single source of truth for lesson
 * content. Lesson JSON files are instances of this shape.
 *
 * Field meanings deliberately mirror the established runtime domain so the
 * migration is lossless: `language`/`level`/`difficulty` use their long-standing
 * union members, `number` is the deterministic ordering key, and `completion`
 * drives pass/fail scoring.
 */
export interface Lesson {
    schemaVersion: number
    id: string
    level: Level
    language: LessonLanguage
    number: number
    title: string
    titleMy?: string
    description: string
    difficulty: Difficulty
    estimatedMinutes: number
    /** Canonical keyboard reference. See KeyboardId. */
    keyboard: KeyboardId
    completion: LessonCompletionRule
    focusKeys?: string[]
    focus?: LessonFocus[]
    targetFingers?: FingerId[]
    targetHands?: Hand[]
    requiresShift?: boolean
    prerequisites?: string[]
    exercises: LessonExercise[]
    metadata?: LessonMetadata
}

export interface LessonMetadata {
    author?: string
    version?: string
    tags?: string[]
    estimatedDuration?: number
    difficulty?: Difficulty
    prerequisites?: string[]
    createdAt?: string
    updatedAt?: string
}

/**
 * Legacy-compatible lesson phase. The application's typing engine consumes
 * lessons as an ordered list of `{ instruction, text }` phases, so every
 * exercise normalizes to at least one phase.
 */
export interface LessonPhase {
    instruction: string
    text: string
}

/**
 * The runtime domain shape the application already consumes. Normalized lessons
 * are produced by the lesson normalizer and are structurally interchangeable
 * with the legacy `LessonData` interface (every `LessonData` field is present),
 * while also carrying the canonical keyboard reference and resolved exercises.
 */
export interface NormalizedLesson {
    id: string
    level: Level
    number: number
    title: string
    titleMy: string
    description: string
    difficulty: Difficulty
    estimatedMinutes: number
    language: Language
    layoutId: 'english-qwerty' | 'myanmar'
    completion: LessonCompletionRule
    focusKeys?: string[]
    focus?: LessonFocus[]
    targetFingers?: FingerId[]
    targetHands?: Hand[]
    requiresShift?: boolean
    prerequisites?: string[]
    phases: LessonPhase[]
    /** Canonical keyboard reference used by the typing engine. */
    keyboard: KeyboardId
    exercises: NormalizedExercise[]
    options?: ExerciseOptions
    metadata?: LessonMetadata
}

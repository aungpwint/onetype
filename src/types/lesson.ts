import type { LessonExercise, ExerciseOptions, NormalizedExercise } from './exercise'
import type { LessonLanguage } from './language'
import type { KeyboardId } from './keyboard'
import type { Difficulty, FingerId, Hand, Language, Level, LessonFocus } from './index'

export const LESSON_SCHEMA_VERSION = 1

export interface LessonCompletionRule {
    minAccuracy: number
    minWpm: number | null
}

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

export interface LessonPhase {
    instruction: string
    text: string
}

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
    keyboard: KeyboardId
    exercises: NormalizedExercise[]
    options?: ExerciseOptions
    metadata?: LessonMetadata
}

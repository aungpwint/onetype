import type { ExerciseGeneratorSpec } from '@/core/pedagogy/types'
import { generateLessonExerciseText } from '@/core/pedagogy/index'

export type LessonExercise = KeyExercise | WordExercise | SentenceExercise | TextExercise | ParagraphExercise | CustomExercise | GeneratedExercise

export interface ExerciseOptions {
    allowBackspace?: boolean
    allowMistakes?: boolean
    showTarget?: boolean
}

interface ExerciseBase {
    id: string
    options?: ExerciseOptions
    instruction?: string
}

export interface KeyExercise extends ExerciseBase {
    kind: 'keys'
    keys: string[]
    repeats?: number
}

export interface WordExercise extends ExerciseBase {
    kind: 'words'
    words: string[]
}

export interface SentenceExercise extends ExerciseBase {
    kind: 'sentences'
    sentences: string[]
}

export interface TextExercise extends ExerciseBase {
    kind: 'text'
    text: string
}

export interface ParagraphExercise extends ExerciseBase {
    kind: 'paragraph'
    text: string
}

export interface CustomExercise extends ExerciseBase {
    kind: 'custom'
    text: string
    subtype: string
}

// Deterministic, seeded generator spec. The actual typed text is produced at
// normalization time so the content stays fresh per exercise without bloating
// the lesson data, and identical on every reload.
export interface GeneratedExercise extends ExerciseBase {
    kind: 'generated'
    generator: ExerciseGeneratorSpec
}

export function isGeneratedExercise(exercise: LessonExercise): exercise is GeneratedExercise {
    return exercise.kind === 'generated'
}

export const EXERCISE_KINDS = ['keys', 'words', 'sentences', 'text', 'paragraph', 'custom', 'generated'] as const

export type LessonExerciseKind = (typeof EXERCISE_KINDS)[number]

export function isLessonExerciseKind(value: unknown): value is LessonExerciseKind {
    return typeof value === 'string' && (EXERCISE_KINDS as readonly string[]).includes(value)
}

export interface ExerciseTextContext {
    lessonId: string
    languageId: string
}

export function exerciseText(exercise: LessonExercise, ctx?: ExerciseTextContext): string {
    switch (exercise.kind) {
        case 'keys':
            return expandKeyExercise(exercise)
        case 'words':
            return exercise.words.join(' ')
        case 'sentences':
            return exercise.sentences.join(' ')
        case 'text':
        case 'paragraph':
        case 'custom':
            return exercise.text
        case 'generated':
            if (!ctx) {
                throw new Error(`Generated exercise "${exercise.id}" requires a normalization context (lessonId + languageId)`)
            }
            return generateLessonExerciseText(exercise.generator, { lessonId: ctx.lessonId, exerciseId: exercise.id }, ctx.languageId)
    }
}

function expandKeyExercise(exercise: KeyExercise): string {
    const repeats = exercise.repeats ?? 3
    const tokens: string[] = []
    for (const key of exercise.keys) {
        for (let i = 0; i < repeats; i++) tokens.push(key)
    }
    return tokens.join(' ')
}

export interface NormalizedExercise {
    id: string
    kind: LessonExerciseKind
    text: string
    instruction?: string
    options?: ExerciseOptions
    generator?: ExerciseGeneratorSpec
}

import type { Difficulty, FingerId, Hand, LessonFocus, Level } from './index'

export type { Difficulty, FingerId, Hand, LessonFocus, Level }

export const LESSON_LEVELS: readonly Level[] = ['beginner', 'intermediate', 'advanced'] as const

export const LESSON_DIFFICULTIES: readonly Difficulty[] = ['basic', 'easy', 'medium', 'hard'] as const

export function isLessonLevel(value: unknown): value is Level {
    return typeof value === 'string' && (LESSON_LEVELS as readonly string[]).includes(value)
}

export function isLessonDifficulty(value: unknown): value is Difficulty {
    return typeof value === 'string' && (LESSON_DIFFICULTIES as readonly string[]).includes(value)
}

export function isHand(value: unknown): value is Hand {
    return value === 'left' || value === 'right'
}

export function isFingerId(value: unknown): value is FingerId {
    return (
        value === 'left-pinky' ||
        value === 'left-ring' ||
        value === 'left-middle' ||
        value === 'left-index' ||
        value === 'left-thumb' ||
        value === 'right-thumb' ||
        value === 'right-index' ||
        value === 'right-middle' ||
        value === 'right-ring' ||
        value === 'right-pinky'
    )
}

export function isLessonFocus(value: unknown): value is LessonFocus {
    return (
        typeof value === 'string' &&
        [
            'key-memory',
            'finger-control',
            'home-row',
            'top-row',
            'bottom-row',
            'row-transition',
            'hand-alternation',
            'same-hand',
            'finger-independence',
            'shift',
            'numbers',
            'symbols',
            'words',
            'sentences',
            'punctuation',
            'unicode',
            'syllable',
            'medial',
            'tone',
            'bilingual',
            'accuracy',
            'speed',
            'alphabet',
        ].includes(value)
    )
}

import type { NormalizedLesson } from '@/types/lesson'

export type { LessonPhase, LessonCompletionRule } from '@/types/lesson'

export type LessonData = Pick<
    NormalizedLesson,
    | 'id'
    | 'level'
    | 'number'
    | 'title'
    | 'titleMy'
    | 'description'
    | 'difficulty'
    | 'estimatedMinutes'
    | 'language'
    | 'layoutId'
    | 'completion'
    | 'focusKeys'
    | 'focus'
    | 'targetFingers'
    | 'targetHands'
    | 'requiresShift'
    | 'prerequisites'
    | 'phases'
>

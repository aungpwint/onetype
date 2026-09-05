import type { NormalizedLesson } from '@/types/lesson'

export type { LessonPhase, LessonCompletionRule } from '@/types/lesson'

/**
 * Legacy runtime lesson shape consumed by the curriculum resolver, stores, and
 * test materials. It is a projection of the canonical normalized lesson: every
 * field here maps 1:1 onto `NormalizedLesson` (which the repository hands out),
 * so this alias stays structurally compatible while the domain types own the
 * definition.
 */
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

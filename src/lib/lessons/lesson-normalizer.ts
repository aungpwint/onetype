import { exerciseText, type NormalizedExercise } from '@/types/exercise'

import type { Lesson, LessonPhase, NormalizedLesson } from '@/types/lesson'
import { toLegacyLanguage } from '@/types/language'
import { toLayoutId } from '@/types/keyboard'
import { lessonPhaseFromExercise } from './lesson-phase'

export function normalizeLesson(lesson: Lesson): NormalizedLesson {
    const exercises = lesson.exercises.map((exercise, index): NormalizedExercise => {
        const id = exercise.id ?? `${lesson.id}-ex-${index + 1}`
        return {
            id,
            kind: exercise.kind,
            text: exerciseText(exercise),
            instruction: exercise.instruction,
            options: exercise.options,
        }
    })

    const phases: LessonPhase[] = lesson.exercises.map(lessonPhaseFromExercise)

    const normalized: NormalizedLesson = {
        id: lesson.id,
        level: lesson.level,
        number: lesson.number,
        title: lesson.title,
        titleMy: lesson.titleMy ?? lesson.title,
        description: lesson.description,
        difficulty: lesson.difficulty,
        estimatedMinutes: lesson.estimatedMinutes,
        language: toLegacyLanguage(lesson.language),
        layoutId: toLayoutId(lesson.keyboard),
        completion: lesson.completion,
        phases,
        keyboard: lesson.keyboard,
        exercises,
    }

    if (lesson.focusKeys !== undefined) normalized.focusKeys = lesson.focusKeys
    if (lesson.focus !== undefined) normalized.focus = lesson.focus
    if (lesson.targetFingers !== undefined) normalized.targetFingers = lesson.targetFingers
    if (lesson.targetHands !== undefined) normalized.targetHands = lesson.targetHands
    if (lesson.requiresShift !== undefined) normalized.requiresShift = lesson.requiresShift
    if (lesson.prerequisites !== undefined) normalized.prerequisites = lesson.prerequisites
    if (lesson.metadata !== undefined) normalized.metadata = lesson.metadata

    return normalized
}

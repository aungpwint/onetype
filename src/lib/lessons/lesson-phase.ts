import { exerciseText, type LessonExercise } from '@/types/exercise'

import type { LessonPhase } from '@/types/lesson'

export function lessonPhaseFromExercise(exercise: LessonExercise): LessonPhase {
    const text = exerciseText(exercise)
    return {
        instruction: exercise.instruction ?? text,
        text,
    }
}

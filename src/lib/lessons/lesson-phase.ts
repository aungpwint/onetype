import { exerciseText, type ExerciseTextContext, type LessonExercise } from '@/types/exercise'

import type { LessonPhase } from '@/types/lesson'

export function lessonPhaseFromExercise(exercise: LessonExercise, ctx?: ExerciseTextContext): LessonPhase {
    const text = exerciseText(exercise, ctx)
    return {
        instruction: exercise.instruction ?? text,
        text,
    }
}

import { exerciseText, type LessonExercise } from '@/types/exercise'

import type { LessonPhase } from '@/types/lesson'

/**
 * Convert an exercise into the legacy `{ instruction, text }` phase a phase
 * entry in the typing engine consumes.
 *
 * The instruction defaults to the full target text, mirroring the historical
 * behaviour where every phase's `instruction` and `text` were identical. Custom
 * instructions (when present) are preserved verbatim.
 */
export function lessonPhaseFromExercise(exercise: LessonExercise): LessonPhase {
    const text = exerciseText(exercise)
    return {
        instruction: exercise.instruction ?? text,
        text,
    }
}

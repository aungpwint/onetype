import { reinforcementFromWeakKeys } from './service'
import type { MuscleMemoryGoal } from '@/core/drills/engine'

export interface DrillPreview {
    goal: MuscleMemoryGoal
    keys: string[]
    count: number
}

const GOAL_LABELS: Record<MuscleMemoryGoal, string> = {
    'finger-isolation': 'Finger isolation',
    'hand-alternation': 'Hand alternation',
    'same-hand': 'Same-hand',
    shift: 'Shift',
    'row-transition': 'Row transition',
    repetition: 'Repetition',
    pair: 'Key pair',
}

/** What an adaptive weakness drill would look like for the given weak keys (weakest-first by accuracy). */
export function previewWeaknessDrill(keys: { key: string; accuracy: number }[], limit = 8): DrillPreview | null {
    const ranked = [...keys]
        .sort((a, b) => a.accuracy - b.accuracy)
        .map((k, i) => ({ key: k.key, lowerBound: i }))
    if (ranked.length === 0) return null
    let drill
    try {
        drill = reinforcementFromWeakKeys(ranked, { maxKeys: limit })
    } catch {
        return null
    }
    return { goal: drill.goal, keys: drill.focusKeys, count: drill.targeted.length }
}

export function drillGoalLabel(goal: MuscleMemoryGoal): string {
    return GOAL_LABELS[goal] ?? 'Strength'
}
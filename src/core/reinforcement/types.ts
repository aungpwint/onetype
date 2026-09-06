import type { FingerId, Modifier } from '@/types'
import type { MuscleMemoryGoal, MuscleMemoryPlan } from '@/core/drills/engine'

export interface WeakKeyId {
    key: string
    lowerBound: number
}

export interface ReinforcementOptions {
    goal?: MuscleMemoryGoal
    length?: number
    maxKeys?: number
}

export interface ReinforcedDrill {
    goal: MuscleMemoryGoal
    source: 'keys' | 'fingers'
    targeted: string[]
    focusKeys: string[]
    plan: MuscleMemoryPlan
}

export interface ParsedKeyId {
    code: string
    modifier: Modifier
}

export type { FingerId }

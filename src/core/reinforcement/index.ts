export { type ParsedKeyId, type ReinforcedDrill, type ReinforcementOptions, type WeakKeyId } from './types'
export {
    decideDrillGoal,
    focusCharsFromWeakFingers,
    focusCharsFromWeakKeys,
    keyIdToChar,
    keyIdLabel,
    parseKeyId,
    planWeakestReinforcement,
    reinforcementFromWeakFingers,
    reinforcementFromWeakKeys,
} from './service'
export type { MuscleMemoryGoal } from '@/core/drills/engine'

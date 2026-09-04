export {
  type FingerId,
  type ParsedKeyId,
  type ReinforcedDrill,
  type ReinforcementOptions,
  type WeakKeyId,
} from "./types";
export {
  DEFAULT_MAX_KEYS,
  decideDrillGoal,
  focusCharsFromWeakFingers,
  focusCharsFromWeakKeys,
  keyIdToChar,
  parseKeyId,
  planWeakestReinforcement,
  reinforcementFromWeakFingers,
  reinforcementFromWeakKeys,
} from "./service";
export type { MuscleMemoryGoal } from "../drills/engine";

export {
  DEFAULT_MASTERY_CONFIG,
  MASTERY_ORDER,
  type AttemptRecord,
  type MasteryConfig,
  type MasteryLevel,
} from "./types";
export {
  computeMasteryForLessons,
  computeMasteryLevel,
  hasMasteryLevel,
  isLessonUnlocked,
  isMasteryPass,
  projectMasteryDelta,
  type MasteryDelta,
} from "./service";

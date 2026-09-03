/**
 * Mastery levels track how well a student has learned a lesson. The levels are
 * ordered: not-started < attempted < passed < mastered.
 */
export type MasteryLevel = "not-started" | "attempted" | "passed" | "mastered";

/**
 * Ordered list of mastery levels from lowest to highest.
 */
export const MASTERY_ORDER: readonly MasteryLevel[] = [
  "not-started",
  "attempted",
  "passed",
  "mastered",
];

/**
 * Configuration for the mastery computation.
 */
export interface MasteryConfig {
  /** Number of consecutive passes required for "mastered". Default 3. */
  consecutivePassesRequired: number;
  /**
   * Accuracy margin (percentage points) above the lesson's minimum accuracy
   * that each mastery-window pass must meet. Default 10.
   */
  accuracyMargin: number;
}

/**
 * The default mastery configuration: 3 consecutive passes each at least 10%
 * above the lesson's minimum accuracy.
 */
export const DEFAULT_MASTERY_CONFIG: MasteryConfig = {
  consecutivePassesRequired: 3,
  accuracyMargin: 10,
};

/**
 * A single attempt record as needed by the mastery computation. This is the
 * minimal subset of information required; the service layer can project from
 * ExerciseResult or LessonProgress.
 */
export interface AttemptRecord {
  /** Whether this attempt met the lesson's normal completion threshold. */
  passed: boolean;
  /** Accuracy percentage (0-100) achieved in this attempt. */
  accuracy: number;
}

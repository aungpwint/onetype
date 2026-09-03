import {
  MASTERY_ORDER,
  DEFAULT_MASTERY_CONFIG,
  type AttemptRecord,
  type MasteryConfig,
  type MasteryLevel,
} from "./types";

/**
 * Pure mastery computation and progression-gating functions. These have no
 * side effects and no dependency on the store/data model, so they are fully
 * unit-testable and safe to wire into any persistence layer later.
 */

/**
 * Whether a single attempt is a "mastery pass" — i.e. it not only met the
 * lesson's normal completion threshold but also cleared the accuracy margin
 * above that threshold. A factually non-passing attempt is never a mastery
 * pass regardless of accuracy.
 */
export function isMasteryPass(
  attempt: AttemptRecord,
  minAccuracy: number,
  config: MasteryConfig = DEFAULT_MASTERY_CONFIG,
): boolean {
  if (!attempt.passed) return false;
  return attempt.accuracy >= minAccuracy + config.accuracyMargin;
}

/**
 * Compute the mastery level a student has reached for a lesson, given the
 * lesson's minimum accuracy threshold and the attempt history (oldest first).
 *
 * - no attempts          -> "not-started"
 * - any attempts, none finished the window -> "attempted"
 * - reached "passed" but not the full run  -> "passed"
 * - the most recent `consecutivePassesRequired` attempts are all mastery
 *   passes  -> "mastered"
 */
export function computeMasteryLevel(
  attempts: AttemptRecord[],
  minAccuracy: number,
  config: MasteryConfig = DEFAULT_MASTERY_CONFIG,
): MasteryLevel {
  const isMaster = (a: AttemptRecord) => isMasteryPass(a, minAccuracy, config);
  const hasMasteredRun = attempts.length >= config.consecutivePassesRequired
    && attempts
      .slice(-config.consecutivePassesRequired)
      .every(isMaster);
  if (hasMasteredRun) return "mastered";

  const hasPass = attempts.some((a) => a.passed);
  if (hasPass) return "passed";

  return attempts.length > 0 ? "attempted" : "not-started";
}

/**
 * Whether the student has reached at least the given mastery level.
 */
export function hasMasteryLevel(
  achieved: MasteryLevel,
  required: MasteryLevel,
): boolean {
  return MASTERY_ORDER.indexOf(achieved) >= MASTERY_ORDER.indexOf(required);
}

/**
 * The next lesson in a progression is unlocked once the student has mastered
 * at least `requiredLevel` (default "passed") of the prerequisite lesson.
 */
export function isLessonUnlocked(
  prerequisiteAttempts: AttemptRecord[],
  prerequisiteMinAccuracy: number,
  requiredLevel: MasteryLevel = "passed",
  config: MasteryConfig = DEFAULT_MASTERY_CONFIG,
): boolean {
  const level = computeMasteryLevel(prerequisiteAttempts, prerequisiteMinAccuracy, config);
  return hasMasteryLevel(level, requiredLevel);
}

/**
 * A pass/fail summary of a newly recorded attempt's effect on mastery, so a
 * UI can surface whether mastery just increased.
 */
export interface MasteryDelta {
  before: MasteryLevel;
  after: MasteryLevel;
  improved: boolean;
}

/**
 * Compute how mastery changes when a new attempt (already appended to the
 * history) is recorded.
 */
export function projectMasteryDelta(
  attemptsIncludingNew: AttemptRecord[],
  minAccuracy: number,
  config: MasteryConfig = DEFAULT_MASTERY_CONFIG,
): MasteryDelta {
  if (attemptsIncludingNew.length === 0) {
    return { before: "not-started", after: "not-started", improved: false };
  }
  const before = computeMasteryLevel(
    attemptsIncludingNew.slice(0, -1),
    minAccuracy,
    config,
  );
  const after = computeMasteryLevel(attemptsIncludingNew, minAccuracy, config);
  return { before, after, improved: MASTERY_ORDER.indexOf(after) > MASTERY_ORDER.indexOf(before) };
}

/**
 * Compute mastery levels for every lesson from the student's full exercise
 * history, grouped by lessonId and ordered by attempt number ascending.
 * Returns a Map from lessonId to its mastery level. Lessons not present in
 * `records` get "not-started".
 *
 * `records` is a generic shape matching ExerciseResult (or any object with
 * `lessonId`, `attempt`, `passed`, and `accuracy`) so this function stays
 * free of backend-type imports.
 */
export function computeMasteryForLessons(
  records: { lessonId: string; attempt: number; passed: boolean; accuracy: number }[],
  lessons: Record<string, { minAccuracy: number }>,
  config: MasteryConfig = DEFAULT_MASTERY_CONFIG,
): Map<string, MasteryLevel> {
  const grouped = new Map<string, { lessonId: string; attempt: number; passed: boolean; accuracy: number }[]>();
  for (const r of records) {
    if (!r.lessonId) continue;
    const group = grouped.get(r.lessonId) ?? [];
    group.push(r);
    grouped.set(r.lessonId, group);
  }
  const result = new Map<string, MasteryLevel>();
  for (const [lessonId, attempts] of grouped) {
    const sorted = [...attempts].sort((a, b) => a.attempt - b.attempt);
    const passAttempts: AttemptRecord[] = sorted.map((a) => ({ passed: a.passed, accuracy: a.accuracy }));
    const minAccuracy = lessons[lessonId]?.minAccuracy ?? 80;
    result.set(lessonId, computeMasteryLevel(passAttempts, minAccuracy, config));
  }
  return result;
}

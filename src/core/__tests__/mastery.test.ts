import { describe, expect, it } from "vitest";
import {
  computeMasteryForLessons,
  computeMasteryLevel,
  hasMasteryLevel,
  isLessonUnlocked,
  isMasteryPass,
  projectMasteryDelta,
  MASTERY_ORDER,
  type MasteryLevel,
} from "../mastery";

type Att = { passed: boolean; accuracy: number };
const p = (accuracy: number): Att => ({ passed: true, accuracy });
const f = (accuracy: number): Att => ({ passed: false, accuracy });

describe("isMasteryPass", () => {
  it("requires a passing attempt AND accuracy above the threshold plus the margin", () => {
    const cfg = { consecutivePassesRequired: 3, accuracyMargin: 10 };
    expect(isMasteryPass(p(85), 75, cfg)).toBe(true); // 75 + 10 = 85
    expect(isMasteryPass(p(84), 75, cfg)).toBe(false); // below margin
    expect(isMasteryPass(f(95), 75, cfg)).toBe(false); // not passed
    expect(isMasteryPass(p(75), 75, cfg)).toBe(false); // exactly threshold
  });

  it("uses defaults when no config is given", () => {
    expect(isMasteryPass(p(85), 75)).toBe(true);
    expect(isMasteryPass(p(84), 75)).toBe(false);
  });
});

describe("computeMasteryLevel", () => {
  it("returns not-started for no attempts", () => {
    expect(computeMasteryLevel([], 75)).toBe("not-started");
  });

  it("returns attempted when attempts exist but none passed", () => {
    expect(computeMasteryLevel([f(50), f(60)], 75)).toBe("attempted");
  });

  it("returns passed once there is any pass, even if not a full mastery run", () => {
    expect(computeMasteryLevel([f(50), p(90)], 75)).toBe("passed");
  });

  it("returns mastered only after the required consecutive mastery passes", () => {
    const cfg = { consecutivePassesRequired: 3, accuracyMargin: 10 };
    // Only two mastery passes -> still just "passed".
    expect(computeMasteryLevel([p(90), p(90)], 75, cfg)).toBe("passed");
    // Three consecutive mastery passes -> mastered.
    expect(computeMasteryLevel([p(90), p(91), p(92)], 75, cfg)).toBe("mastered");
  });

  it("breaks a mastery run when a pass falls below the margin or fails", () => {
    const cfg = { consecutivePassesRequired: 3, accuracyMargin: 10 };
    // p(90) p(90) p(80) p(90): the in-window p(80) is below 85 -> not mastered.
    expect(computeMasteryLevel([p(90), p(90), p(80), p(90)], 75, cfg)).toBe("passed");
    // A failed attempt in the window breaks the run.
    expect(computeMasteryLevel([p(90), p(90), f(90), p(90)], 75, cfg)).toBe("passed");
  });

  it("uses only the trailing window when later passes recover a run", () => {
    const cfg = { consecutivePassesRequired: 3, accuracyMargin: 10 };
    // [fail, pass, pass, pass] -> trailing three passes -> mastered.
    expect(computeMasteryLevel([f(80), p(90), p(91), p(92)], 75, cfg)).toBe("mastered");
  });
});

describe("hasMasteryLevel", () => {
  it("respects the ordering", () => {
    expect(hasMasteryLevel("mastered", "passed")).toBe(true);
    expect(hasMasteryLevel("passed", "mastered")).toBe(false);
    expect(hasMasteryLevel("passed", "passed")).toBe(true);
    expect(hasMasteryLevel("not-started", "not-started")).toBe(true);
    expect(hasMasteryLevel("attempted", "passed")).toBe(false);
  });
});

describe("isLessonUnlocked", () => {
  it("unlocks the next lesson once the prerequisite is at least 'passed'", () => {
    expect(isLessonUnlocked([], 75)).toBe(false);
    expect(isLessonUnlocked([f(80)], 75)).toBe(false);
    expect(isLessonUnlocked([p(80)], 75)).toBe(true);
    expect(isLessonUnlocked([p(90), p(90), p(90)], 75)).toBe(true);
  });

  it("can require a higher level for gating", () => {
    const cfg = { consecutivePassesRequired: 3, accuracyMargin: 10 };
    // One pass is not enough if 'mastered' is required.
    expect(isLessonUnlocked([p(90)], 75, "mastered", cfg)).toBe(false);
    expect(isLessonUnlocked([p(90), p(91), p(92)], 75, "mastered", cfg)).toBe(true);
  });
});

describe("projectMasteryDelta", () => {
  it("reports improvement when the new attempt reaches a higher level", () => {
    const cfg = { consecutivePassesRequired: 3, accuracyMargin: 10 };
    // f, f, p(90) -> before: attempted, after: passed
    const delta = projectMasteryDelta([f(50), f(60), p(90)], 75, cfg);
    expect(delta.before).toBe("attempted");
    expect(delta.after).toBe("passed");
    expect(delta.improved).toBe(true);
  });

  it("reports no improvement when level is unchanged", () => {
    const cfg = { consecutivePassesRequired: 3, accuracyMargin: 10 };
    const delta = projectMasteryDelta([p(90), p(91)], 75, cfg);
    expect(delta.before).toBe("passed");
    expect(delta.after).toBe("passed");
    expect(delta.improved).toBe(false);
  });
});

describe("MASTERY_ORDER", () => {
  it("is strictly ordered from low to high with no duplicates", () => {
    expect(new Set(MASTERY_ORDER).size).toBe(MASTERY_ORDER.length);
    expect(MASTERY_ORDER).toEqual(["not-started", "attempted", "passed", "mastered"]);
    const levels: MasteryLevel[] = ["not-started", "attempted", "passed", "mastered"];
    expect(MASTERY_ORDER).toEqual(levels);
  });
});

describe("computeMasteryForLessons", () => {
  const lessons = {
    "lesson-en-1": { minAccuracy: 75 },
    "lesson-en-2": { minAccuracy: 80 },
  };

  it("returns empty map for no records", () => {
    const result = computeMasteryForLessons([], lessons);
    expect(result.size).toBe(0);
  });

  it("groups records by lessonId and computes mastery independently", () => {
    const records = [
      { lessonId: "lesson-en-1", attempt: 1, passed: false, accuracy: 50 },
      { lessonId: "lesson-en-1", attempt: 2, passed: true, accuracy: 90 },
      { lessonId: "lesson-en-2", attempt: 1, passed: false, accuracy: 40 },
    ];
    const result = computeMasteryForLessons(records, lessons);
    expect(result.get("lesson-en-1")).toBe("passed");
    expect(result.get("lesson-en-2")).toBe("attempted");
  });

  it("sorts by attempt ascending before computing", () => {
    const records = [
      { lessonId: "lesson-en-1", attempt: 3, passed: true, accuracy: 90 },
      { lessonId: "lesson-en-1", attempt: 1, passed: false, accuracy: 50 },
      { lessonId: "lesson-en-1", attempt: 2, passed: true, accuracy: 91 },
    ];
    const result = computeMasteryForLessons(records, lessons);
    expect(result.get("lesson-en-1")).toBe("passed");
  });

  it("skips records with empty lessonId", () => {
    const records = [
      { lessonId: "", attempt: 1, passed: true, accuracy: 90 },
      { lessonId: "lesson-en-1", attempt: 1, passed: true, accuracy: 90 },
    ];
    const result = computeMasteryForLessons(records, lessons);
    expect(result.size).toBe(1);
    expect(result.get("lesson-en-1")).toBe("passed");
  });

  it("defaults minAccuracy to 80 for unknown lesson ids", () => {
    const records = [
      { lessonId: "unknown-lesson", attempt: 1, passed: true, accuracy: 85 },
    ];
    const result = computeMasteryForLessons(records, lessons);
    // 85 >= 80 + 10 (default margin) = 90? No -> just "passed".
    expect(result.get("unknown-lesson")).toBe("passed");
  });
});

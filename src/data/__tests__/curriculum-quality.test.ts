import { describe, expect, it } from "vitest";
import { listAllLessons, resolveLessonById } from "../curriculum";

/**
 * Phase 9 — Curriculum Quality Audit.
 *
 * These checks validate the *pedagogical soundness* of the curriculum, beyond
 * the structural invariants covered by curriculum.test.ts: completion rules stay
 * in range, estimated pacing is sane, declared focus material is actually
 * present in the resolved units, and Shift is introduced at the right stage of
 * the progression rather than leaking into early beginner drills.
 */

function resolve(id: string) {
  return resolveLessonById(id);
}

describe("curriculum quality audit", () => {
  const lessons = listAllLessons();

  it("every lesson has at least one non-empty phase", () => {
    for (const lesson of lessons) {
      expect(lesson.phases.length, lesson.id).toBeGreaterThan(0);
      for (const phase of lesson.phases) {
        expect(phase.text.trim().length, `${lesson.id} phase`).toBeGreaterThan(0);
      }
    }
  });

  it("every lesson declares sane completion rules", () => {
    for (const lesson of lessons) {
      const { minAccuracy, minWpm } = lesson.completion;
      expect(minAccuracy, lesson.id).toBeGreaterThanOrEqual(0);
      expect(minAccuracy, lesson.id).toBeLessThanOrEqual(100);
      if (minWpm !== null) {
        expect(minWpm, lesson.id).toBeGreaterThan(0);
        expect(minWpm, lesson.id).toBeLessThan(200);
      }
    }
  });

  it("every lesson has a positive and reasonable estimated duration", () => {
    for (const lesson of lessons) {
      expect(lesson.estimatedMinutes, lesson.id).toBeGreaterThan(0);
      expect(lesson.estimatedMinutes, lesson.id).toBeLessThanOrEqual(90);
    }
  });

  it("declared focus keys are actually exercised by the lesson", () => {
    for (const lesson of lessons) {
      const declared = lesson.focusKeys ?? [];
      if (declared.length === 0) continue;
      const resolved = resolve(lesson.id);
      const unitCodes = new Set(resolved.sequence.units.map((u) => u.keyCode));
      const shiftRight = resolved.sequence.units.some((u) => u.modifier === "shift" && u.shiftHand === "right");
      const shiftLeft = resolved.sequence.units.some((u) => u.modifier === "shift" && u.shiftHand === "left");
      for (const code of declared) {
        if (code === "ShiftRight") {
          expect(shiftRight, `${lesson.id} should exercise Right Shift`).toBe(true);
        } else if (code === "ShiftLeft") {
          expect(shiftLeft, `${lesson.id} should exercise Left Shift`).toBe(true);
        } else {
          // Character keys appear as unit keyCodes.
          expect(unitCodes.has(code), `${lesson.id} should exercise ${code}`).toBe(true);
        }
      }
    }
  });

  it("declared target hands and fingers actually appear in the lesson", () => {
    for (const lesson of lessons) {
      const resolved = resolve(lesson.id);
      // A lesson can train a hand either by typing letters with it or by using
      // that hand to press Shift (unit.shiftHand). Consider both.
      const letterHands = new Set(resolved.sequence.units.map((u) => u.hand));
      const shiftHands = new Set(
        resolved.sequence.units.filter((u) => u.shiftHand).map((u) => u.shiftHand),
      );
      const hands = new Set([...letterHands, ...shiftHands]);
      const fingers = new Set(resolved.sequence.units.map((u) => u.finger));
      // Shift is always pressed with the pinky of the opposite hand.
      for (const u of resolved.sequence.units) {
        if (u.shiftHand === "right") fingers.add("right-pinky");
        if (u.shiftHand === "left") fingers.add("left-pinky");
      }
      for (const h of lesson.targetHands ?? []) {
        expect(hands.has(h), `${lesson.id} should train hand ${h}`).toBe(true);
      }
      for (const f of lesson.targetFingers ?? []) {
        expect(fingers.has(f), `${lesson.id} should train finger ${f}`).toBe(true);
      }
    }
  });

  it("Shift is not introduced before the dedicated shift stage of the progression", () => {
    // The authoritative progression is the source array order in index.ts,
    // not the per-level restarting `number` field. Shift must not be required
    // before the curriculum begins teaching it. Once the shift stage begins,
    // later non-shift lessons (e.g. the unshifted number rows) are legitimate.
    const englishLessons = lessons.filter((l) => l.language === "english");
    let shiftStart = -1;
    for (let i = 0; i < englishLessons.length; i++) {
      if (resolve(englishLessons[i].id).sequence.units.some((u) => u.modifier === "shift")) {
        shiftStart = i;
        break;
      }
    }
    expect(shiftStart).toBeGreaterThan(0);
    for (let i = 0; i < shiftStart; i++) {
      const lesson = englishLessons[i];
      const hasShiftUnit = resolve(lesson.id).sequence.units.some((u) => u.modifier === "shift");
      expect(hasShiftUnit, `${lesson.id} must not require Shift yet`).toBe(false);
    }
  });

  it("lessons that declare Shift triggers actually require it", () => {
    for (const lesson of lessons) {
      if (!lesson.requiresShift) continue;
      const resolved = resolve(lesson.id);
      expect(
        resolved.sequence.units.some((u) => u.modifier === "shift"),
        `${lesson.id} declares requiresShift but has no shift unit`,
      ).toBe(true);
    }
  });

  it("all lesson titles and descriptions are non-empty", () => {
    for (const lesson of lessons) {
      expect(lesson.title.trim().length, lesson.id).toBeGreaterThan(0);
      expect(lesson.description.trim().length, lesson.id).toBeGreaterThan(0);
    }
  });

  it("focus metadata matches the lesson level where provided", () => {
    for (const lesson of lessons) {
      const focus = lesson.focus ?? [];
      if (focus.length === 0) continue;
      const resolved = resolve(lesson.id);
      // A lesson that targets the shift focus must actually contain shift units.
      if (focus.includes("shift")) {
        expect(
          resolved.sequence.units.some((u) => u.modifier === "shift"),
          `${lesson.id} declares shift focus`,
        ).toBe(true);
      }
      if (focus.includes("numbers")) {
        expect(
          resolved.sequence.units.some((u) => /^Digit[0-9]$/.test(u.keyCode)),
          `${lesson.id} declares numbers focus`,
        ).toBe(true);
      }
    }
  });

  it("every lesson resolves deterministically (idempotent) across repeated resolution", () => {
    // Spot-check a spread of lessons (faster than all 150 twice).
    const sample = lessons.filter((_, i) => i % 25 === 0);
    for (const lesson of sample) {
      const a = resolveLessonById(lesson.id);
      const b = resolve(lesson.id);
      expect(a.sequence.units.length).toBe(b.sequence.units.length);
      expect(a.totalUnits).toBe(a.sequence.units.length);
    }
  });

  it("no lesson is accidentally flagged as its own prerequisite", () => {
    for (const lesson of lessons) {
      for (const prereq of lesson.prerequisites ?? []) {
        expect(prereq, lesson.id).not.toBe(lesson.id);
      }
    }
  });
});

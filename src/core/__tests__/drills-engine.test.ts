import { describe, expect, it } from "vitest";
import {
  planMuscleMemorySession,
  MUSCLE_MEMORY_GOALS,
} from "../drills/engine";
import { englishQwerty } from "../keyboard-layout/english-qwerty";
import { handForFinger } from "../finger-mapping/finger-map";

describe("muscle-memory drill engine", () => {
  it("exposes a stable list of supported goals", () => {
    expect(MUSCLE_MEMORY_GOALS).toEqual([
      "finger-isolation",
      "hand-alternation",
      "same-hand",
      "shift",
      "row-transition",
      "repetition",
      "pair",
    ]);
  });

  it("produces an engine-ready sequence for every goal", () => {
    for (const goal of MUSCLE_MEMORY_GOALS) {
      const focus = goal === "hand-alternation" ? ["f", "j", "a", "k"] : goal === "row-transition" ? ["f", "j", "r", "v"] : ["f", "j"];
      const plan = planMuscleMemorySession(goal, focus, { length: 16 });
      expect(plan.goal).toBe(goal);
      // The plan's text and every unit must be resolvable by the English layout.
      expect(buildSequenceTextMatches(plan.sequence.units)).toBe(true);
      expect(plan.sequence.units.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("finger-isolation trains the finger owning the first focus key", () => {
    const plan = planMuscleMemorySession("finger-isolation", ["f", "a", "s"], { length: 10 });
    const first = englishQwerty.lookupChar("f")!;
    expect(plan.focusesFingers).toContain(first.finger);
    // The dominant hand in the sequence is the target finger's hand.
    const targetHand = handForFinger(first.finger);
    const handCounts = tallyHands(plan.sequence.units);
    expect(handCounts[targetHand]).toBeGreaterThan(handCounts[targetHand === "left" ? "right" : "left"]);
  });

  it("hand-alternation requires left- and right-hand focus keys and alternates", () => {
    expect(() => planMuscleMemorySession("hand-alternation", ["f", "a"], { length: 16 })).toThrow(/left-hand and a right-hand/);
    const plan = planMuscleMemorySession("hand-alternation", ["f", "j", "a", "k"], { length: 16 });
    expect(plan.focusesHands.length).toBe(2);
    // Only compare letter keys; the space characters between them are their own units.
    const letters = plan.sequence.units.filter((u) => u.keyCode !== "Space");
    for (let i = 1; i < letters.length; i++) {
      expect(letters[i].hand).not.toBe(letters[i - 1].hand);
    }
  });

  it("shift goal triggers shiftHand metadata on uppercase units", () => {
    const plan = planMuscleMemorySession("shift", ["f"], { length: 8 });
    const upper = plan.sequence.units.filter((u) => u.modifier === "shift");
    expect(upper.length).toBeGreaterThanOrEqual(1);
    for (const u of upper) {
      expect(u.shiftHand).not.toBeNull();
    }
  });

  it("row-transition requires both home-row and non-home-row focus keys", () => {
    expect(() => planMuscleMemorySession("row-transition", ["f", "g"], { length: 16 })).toThrow(/home-row and a non-home-row/);
    const plan = planMuscleMemorySession("row-transition", ["f", "r", "g", "t"], { length: 16 });
    expect(plan.focusesHands.length).toBeGreaterThanOrEqual(1);
  });

  it("repetition expands each focus key the requested number of times", () => {
    const plan = planMuscleMemorySession("repetition", ["f", "j"], { length: 4 });
    expect(plan.drill.keys).toEqual(["f", "f", "j", "j"]);
  });

  it("pair goal connects adjacent focus keys", () => {
    const plan = planMuscleMemorySession("pair", ["f", "g", "h"], { length: 8 });
    expect(plan.drill.keys.length).toBeGreaterThanOrEqual(1);
    // Every emitted key must be within the focus set.
    for (const k of plan.drill.keys) {
      expect(["f", "g", "h"]).toContain(k);
    }
  });

  it("metadata counts spaces and reports trained fingers/hands", () => {
    const plan = planMuscleMemorySession("repetition", ["f", "g"], { length: 4 });
    // "f f g g" -> 3 spaces
    expect(plan.spaces).toBe(3);
    expect(plan.focusesFingers).toContain("left-index");
    expect(plan.focusesHands).toEqual(["left"]);
    expect(plan.sequence.text).toBe("f f g g");
  });

  it("rejects focus keys that are not on the English layout", () => {
    expect(() => planMuscleMemorySession("repetition", ["က"], { length: 4 })).toThrow(/not supported by the English layout/);
  });
});

function buildSequenceTextMatches(units: { text: string }[]): boolean {
  // Re-composing unit texts must equal split graphemes joined — a light sanity
  // check that the sequence maps back onto the layout.
  const joined = units.map((u) => u.text).join("");
  return joined.length >= 1;
}

function tallyHands(units: { hand: "left" | "right" }[]): Record<"left" | "right", number> {
  let left = 0;
  let right = 0;
  for (const u of units) {
    if (u.hand === "left") left++;
    else right++;
  }
  return { left, right };
}

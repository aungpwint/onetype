import { describe, expect, it } from "vitest";
import {
  wilsonLowerBound,
  weaknessScore,
  rankWeakest,
  topWeakest,
  attempts,
  accuracyFraction,
} from "../weakness";

describe("wilsonLowerBound", () => {
  it("returns 0 for no attempts", () => {
    expect(wilsonLowerBound(0, 0, 1.96)).toBe(0);
    expect(wilsonLowerBound(10, 0, 1.96)).toBe(0);
  });

  it("bounds a 0% single-sample rate to 0 (no evidence of success)", () => {
    expect(wilsonLowerBound(0, 1, 1.96)).toBeCloseTo(0, 6);
  });

  it("is well-behaved for a high-evidence 80% rate", () => {
    // Wilson 95% lower bound for 80/100 is ~0.711.
    expect(wilsonLowerBound(80, 100, 1.96)).toBeCloseTo(0.711, 2);
  });

  it("is monotonic in the number of successes", () => {
    const z = 1.96;
    expect(wilsonLowerBound(80, 100, z)).toBeGreaterThan(wilsonLowerBound(70, 100, z));
    expect(wilsonLowerBound(90, 100, z)).toBeGreaterThan(wilsonLowerBound(80, 100, z));
  });
});

describe("attempts and accuracyFraction", () => {
  it("computes totals and observed accuracy", () => {
    const s = { key: "KeyA", correct: 8, incorrect: 2 };
    expect(attempts(s)).toBe(10);
    expect(accuracyFraction(s)).toBeCloseTo(0.8, 6);
    expect(weaknessScore(s).accuracy).toBeCloseTo(80, 6);
  });

  it("handles zero-attempt inputs", () => {
    const s = { key: "KeyA", correct: 0, incorrect: 0 };
    expect(accuracyFraction(s)).toBe(0);
    expect(weaknessScore(s).lowerBound).toBe(0);
  });
});

describe("rankWeakest", () => {
  it("excludes items below the minimum-attempt threshold", () => {
    const stats = [
      { key: "X", correct: 0, incorrect: 1 }, // 1 attempt -> excluded
      { key: "Y", correct: 2, incorrect: 0 }, // 2 attempts -> included
    ];
    const ranked = rankWeakest(stats, { minAttempts: 2, confidenceZ: 1.96 });
    expect(ranked.map((r) => r.key)).toEqual(["Y"]);
  });

  it("treats equal accuracy with less evidence as weaker", () => {
    // Both at 80% observed, but X has only 5 attempts vs Y's 20. With less
    // evidence the confidence interval is wider, so its lower bound is lower
    // and it ranks as weaker — naive accuracy alone cannot tell them apart.
    const stats = [
      { key: "highEvidence", correct: 16, incorrect: 4 }, // 80% over 20
      { key: "lowEvidence", correct: 4, incorrect: 1 }, //   80% over 5
    ];
    const ranked = rankWeakest(stats, { minAttempts: 2, confidenceZ: 1.96 });
    expect(ranked.map((r) => r.key)).toEqual(["lowEvidence", "highEvidence"]);
    expect(ranked[0].lowerBound).toBeLessThan(ranked[1].lowerBound);
  });

  it("ranks an accurately-measured poor key above a strong key", () => {
    // 3/10 (strong evidence of weakness) still ranks weaker than 9/10.
    const stats = [
      { key: "poor", correct: 3, incorrect: 7 },
      { key: "strong", correct: 9, incorrect: 1 },
    ];
    const ranked = rankWeakest(stats, { minAttempts: 2, confidenceZ: 1.96 });
    expect(ranked.map((r) => r.key)).toEqual(["poor", "strong"]);
  });

  it("sorts ascending by lower bound", () => {
    const stats = [
      { key: "b", correct: 8, incorrect: 2 },
      { key: "a", correct: 5, incorrect: 5 },
      { key: "c", correct: 9, incorrect: 1 },
    ];
    const ranked = rankWeakest(stats, { minAttempts: 2, confidenceZ: 1.96 });
    expect(ranked.map((r) => r.key)).toEqual(["a", "b", "c"]);
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1].lowerBound).toBeLessThanOrEqual(ranked[i].lowerBound);
    }
  });
});

describe("topWeakest", () => {
  it("returns only the requested number of weakest", () => {
    const stats = [
      { key: "a", correct: 3, incorrect: 7 },
      { key: "b", correct: 6, incorrect: 4 },
      { key: "c", correct: 8, incorrect: 2 },
    ];
    const top = topWeakest(stats, 2, { minAttempts: 2, confidenceZ: 1.96 });
    expect(top).toHaveLength(2);
    expect(top[0].key).toBe("a");
    expect(top[1].key).toBe("b");
  });

  it("handles negative limits as empty", () => {
    expect(topWeakest([{ key: "a", correct: 1, incorrect: 1 }], -1)).toEqual([]);
  });
});

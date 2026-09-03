import { describe, expect, it } from "vitest";
import {
  pooledAccuracy,
  orderChronologically,
  linearTrend,
  metricTrend,
  standardDeviation,
  coefficientOfVariation,
  summarizePerformance,
  type SessionPoint,
} from "../analytics";

function pt(over: Partial<SessionPoint> & { startedAt: number }): SessionPoint {
  return { wpm: 0, accuracy: 0, correctCount: 0, errorCount: 0, ...over };
}

describe("pooledAccuracy", () => {
  it("weights larger sessions correctly, unlike a mean of ratios", () => {
    // 95% over 200 keystrokes + 0% over 100 keystrokes.
    const a = pt({ startedAt: 1, correctCount: 190, errorCount: 10 });
    const b = pt({ startedAt: 2, correctCount: 0, errorCount: 100 });
    expect(pooledAccuracy([a, b])).toBeCloseTo((190 / 300) * 100, 6); // 63.33%
    // The naive mean of the two per-session ratios would be 47.5%, not this.
  });

  it("returns 0 for empty input or no keystrokes", () => {
    expect(pooledAccuracy([])).toBe(0);
    expect(pooledAccuracy([pt({ startedAt: 1, correctCount: 0, errorCount: 0 })])).toBe(0);
  });

  it("returns 100 for perfectly accurate sessions", () => {
    const p = pt({ startedAt: 1, correctCount: 50, errorCount: 0 });
    expect(pooledAccuracy([p, p])).toBe(100);
  });
});

describe("orderChronologically", () => {
  it("sorts by start time without mutating the input", () => {
    const input = [pt({ startedAt: 30 }), pt({ startedAt: 10 }), pt({ startedAt: 20 })];
    const sorted = orderChronologically(input);
    expect(sorted.map((p) => p.startedAt)).toEqual([10, 20, 30]);
    expect(input.map((p) => p.startedAt)).toEqual([30, 10, 20]);
  });
});

describe("linearTrend", () => {
  it("fits an ascending line with positive slope", () => {
    const trend = linearTrend([10, 20, 30]);
    expect(trend.valid).toBe(true);
    expect(trend.slope).toBeCloseTo(10, 6);
    expect(trend.intercept).toBeCloseTo(10, 6);
  });

  it("fits a descending line with negative slope", () => {
    const trend = linearTrend([30, 20, 10]);
    expect(trend.slope).toBeCloseTo(-10, 6);
  });

  it("returns zero slope for a flat series", () => {
    const trend = linearTrend([20, 20, 20, 20]);
    expect(trend.valid).toBe(true);
    expect(trend.slope).toBeCloseTo(0, 6);
  });

  it("is not valid for fewer than two points", () => {
    expect(linearTrend([]).valid).toBe(false);
    expect(linearTrend([42]).valid).toBe(false);
    expect(linearTrend([42]).intercept).toBe(42);
  });
});

describe("metricTrend", () => {
  it("computes a positive WPM trend over chronological order", () => {
    const points = [
      pt({ startedAt: 3, wpm: 20 }),
      pt({ startedAt: 1, wpm: 10 }),
      pt({ startedAt: 5, wpm: 30 }),
    ];
    const trend = metricTrend(points, "wpm");
    expect(trend.valid).toBe(true);
    expect(trend.slope).toBeCloseTo(10, 6);
  });

  it("trends are based on chronological order regardless of array order", () => {
    const shuffled = [
      pt({ startedAt: 5, wpm: 30 }),
      pt({ startedAt: 1, wpm: 10 }),
      pt({ startedAt: 3, wpm: 20 }),
    ];
    expect(metricTrend(shuffled, "wpm").slope).toBeCloseTo(10, 6);
  });
});

describe("standardDeviation", () => {
  it("returns 0 for empty or single-value input", () => {
    expect(standardDeviation([])).toBe(0);
    expect(standardDeviation([5])).toBe(0);
  });

  it("computes sample standard deviation", () => {
    // [2,4,4,4,5,5,7,9]: mean 5, sample variance 32/7.
    expect(standardDeviation([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(Math.sqrt(32 / 7), 6);
  });
});

describe("coefficientOfVariation", () => {
  it("is 0 for constant performance", () => {
    expect(coefficientOfVariation([100, 100, 100])).toBe(0);
  });

  it("is 0 for insufficient data", () => {
    expect(coefficientOfVariation([])).toBe(0);
    expect(coefficientOfVariation([80])).toBe(0);
  });

  it("normalizes spread by the mean", () => {
    const cv = coefficientOfVariation([100, 150]);
    const mean = 125;
    const std = Math.sqrt(((100 - mean) ** 2 + (150 - mean) ** 2) / 1);
    expect(cv).toBeCloseTo(std / mean, 6);
  });
});

describe("summarizePerformance", () => {
  it("combines all metrics into a single summary", () => {
    const points = [
      pt({ startedAt: 1, wpm: 20, accuracy: 90, correctCount: 90, errorCount: 10 }),
      pt({ startedAt: 2, wpm: 30, accuracy: 95, correctCount: 95, errorCount: 5 }),
      pt({ startedAt: 3, wpm: 40, accuracy: 100, correctCount: 100, errorCount: 0 }),
    ];
    const summary = summarizePerformance(points);
    expect(summary.pooledAccuracy).toBeCloseTo((285 / 300) * 100, 6);
    expect(summary.avgWpm).toBeCloseTo(30, 6);
    expect(summary.bestWpm).toBe(40);
    expect(summary.wpmVariability).toBeGreaterThan(0);
    expect(summary.wpmTrend.slope).toBeCloseTo(10, 6);
    expect(summary.accuracyTrend.slope).toBeCloseTo(5, 6);
  });

  it("handles an empty set gracefully", () => {
    const summary = summarizePerformance([]);
    expect(summary.pooledAccuracy).toBe(0);
    expect(summary.avgWpm).toBe(0);
    expect(summary.bestWpm).toBe(0);
    expect(summary.wpmVariability).toBe(0);
    expect(summary.wpmTrend.valid).toBe(false);
  });
});

import type { PerformanceSummary, SessionPoint, Trend } from "./types";

/**
 * Pure performance-analytics functions. These compute statistically correct
 * aggregates (pooled accuracy rather than the biased mean-of-ratios commonly
 * used elsewhere), quantify improvement over time, and measure consistency.
 * They have no side effects and are fully unit-testable.
 */

/**
 * Pooled accuracy over total keystrokes: sum(correct) / sum(correct + error),
 * expressed as a percentage. Unlike a mean of per-session accuracy ratios,
 * this weights larger sessions correctly and is robust to sessions with very
 * few keystrokes. Returns 0 when there are no keystrokes.
 */
export function pooledAccuracy(points: SessionPoint[]): number {
  let correct = 0;
  let total = 0;
  for (const p of points) {
    correct += p.correctCount;
    total += p.correctCount + p.errorCount;
  }
  if (total <= 0) return 0;
  return (correct / total) * 100;
}

/** Chronologically order a set of sessions by start time. */
export function orderChronologically(points: SessionPoint[]): SessionPoint[] {
  return [...points].sort((a, b) => a.startedAt - b.startedAt);
}

/**
 * Least-squares linear trend of `value` over the series, using session index
 * as the x-axis (0..n-1). `slope` is the average change per session step.
 * Returns `valid: false` when fewer than two points are available.
 */
export function linearTrend(values: number[]): Trend {
  const n = values.length;
  if (n < 2) {
    return { slope: 0, intercept: n === 1 ? values[0] : 0, valid: false };
  }
  const meanX = (n - 1) / 2;
  const meanY = values.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    const dx = i - meanX;
    num += dx * (values[i] - meanY);
    den += dx * dx;
  }
  const slope = den !== 0 ? num / den : 0;
  const intercept = meanY - slope * meanX;
  return { slope, intercept, valid: true };
}

/** Trend of a session metric (e.g. "wpm" or "accuracy") over chronological order. */
export function metricTrend(
  points: SessionPoint[],
  metric: "wpm" | "accuracy",
): Trend {
  const ordered = orderChronologically(points);
  return linearTrend(ordered.map((p) => p[metric]));
}

/** Standard deviation of a set of values. */
export function standardDeviation(values: number[]): number {
  const n = values.length;
  if (n === 0) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / n;
  if (n === 1) return 0;
  const variance = values.reduce((s, v) => s + (v - mean) * (v - mean), 0) / (n - 1);
  return Math.sqrt(variance);
}

/**
 * Coefficient of variation (stddev / mean) as a fraction of 0..1.
 * Lower values indicate more consistent performance. Returns 0 when the means
 * are not meaningful (no values or zero mean).
 */
export function coefficientOfVariation(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / n;
  if (mean === 0) return 0;
  return standardDeviation(values) / mean;
}

/**
 * Compute the full performance summary: pooled accuracy, average/best WPM,
 * WPM consistency, and both WPM and accuracy trends over time.
 */
export function summarizePerformance(points: SessionPoint[]): PerformanceSummary {
  const wpmValues = points.map((p) => p.wpm);
  const avgWpm = wpmValues.length > 0 ? wpmValues.reduce((s, v) => s + v, 0) / wpmValues.length : 0;
  const bestWpm = wpmValues.length > 0 ? Math.max(...wpmValues) : 0;
  return {
    pooledAccuracy: pooledAccuracy(points),
    avgWpm,
    bestWpm,
    wpmVariability: coefficientOfVariation(wpmValues),
    wpmTrend: metricTrend(points, "wpm"),
    accuracyTrend: metricTrend(points, "accuracy"),
  };
}

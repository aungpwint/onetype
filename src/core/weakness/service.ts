import type { StatInput, WeaknessConfig, WeaknessScore } from "./types";

/**
 * Adaptive weakness detection. Ranks keys/fingers by a confidence-weighted
 * weakness score — the lower bound of a Wilson score interval — so items with
 * little evidence are pulled toward the prior rather than ranked worst off a
 * single unlucky attempt, while items with lots of evidence of low accuracy
 * rank as genuinely weak. Pure functions, no side effects.
 */

export const DEFAULT_WEAKNESS_CONFIG: WeaknessConfig = {
  minAttempts: 2,
  confidenceZ: 1.96,
};

/** Total attempts for a stat input. */
export function attempts(stat: StatInput): number {
  return stat.correct + stat.incorrect;
}

/** Observed accuracy as a fraction (0..1); 0 when there are no attempts. */
export function accuracyFraction(stat: StatInput): number {
  const n = attempts(stat);
  if (n <= 0) return 0;
  return stat.correct / n;
}

/**
 * Lower bound of the Wilson score interval for a binary success/failure rate.
 * Returns 0 when there are no attempts.
 *
 *   p̂ = correct / n ;  the interval uses the observed proportion.
 *   lower = (p̂ + z²/2n − z·√((p̂(1−p̂) + z²/4n) / n)) / (1 + z²/n)
 */
export function wilsonLowerBound(correct: number, n: number, z: number): number {
  if (n <= 0) return 0;
  const p = correct / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const center = p + z2 / (2 * n);
  const width = z * Math.sqrt(Math.max(0, (p * (1 - p) + z2 / (4 * n)) / n));
  return (center - width) / denom;
}

/** Compute the weakness score for a single stat input. */
export function weaknessScore(stat: StatInput, config: WeaknessConfig = DEFAULT_WEAKNESS_CONFIG): WeaknessScore {
  const n = attempts(stat);
  return {
    key: stat.key,
    accuracy: accuracyFraction(stat) * 100,
    attempts: n,
    lowerBound: wilsonLowerBound(stat.correct, n, config.confidenceZ),
  };
}

/**
 * Rank the given stats from weakest to strongest by their Wilson lower bound.
 * Items with fewer than `config.minAttempts` attempts are excluded (insufficient
 * evidence). The result is ordered ascending by `lowerBound`.
 */
export function rankWeakest(
  stats: StatInput[],
  config: WeaknessConfig = DEFAULT_WEAKNESS_CONFIG,
): WeaknessScore[] {
  return stats
    .filter((s) => attempts(s) >= config.minAttempts)
    .map((s) => weaknessScore(s, config))
    .sort((a, b) => a.lowerBound - b.lowerBound);
}

/**
 * Convenience: rank weakest and return only the top `limit` entries.
 */
export function topWeakest(
  stats: StatInput[],
  limit: number,
  config: WeaknessConfig = DEFAULT_WEAKNESS_CONFIG,
): WeaknessScore[] {
  return rankWeakest(stats, config).slice(0, Math.max(0, limit));
}

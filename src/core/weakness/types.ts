/**
 * Per-key (or per-finger) observation counts. The unit type is deliberately
 * minimalist so the service can project from the existing key/finger stat
 * stores (KeyStatistic) without coupling to the full data model.
 */
export interface StatInput {
  /** The key id (e.g. "KeyA") or finger id (e.g. "left-pinky"). */
  key: string;
  /** Number of correct key presses observed. */
  correct: number;
  /** Number of incorrect key presses observed. */
  incorrect: number;
}

/** Configuration for the adaptive weakness scoring. */
export interface WeaknessConfig {
  /**
   * Minimum total attempts required before an item is considered for ranking.
   * Items below this are treated as insufficient evidence and excluded, which
   * filters single-sample noise. Default 2.
   */
  minAttempts: number;
  /**
   * Confidence z-score for the Wilson score interval. Higher values pull
   * low-evidence items harder toward the prior. Default 1.96 (95% confidence).
   */
  confidenceZ: number;
}

/** Output of the weakness scoring for a single item. */
export interface WeaknessScore {
  key: string;
  /** Observed accuracy percentage (correct / attempts). */
  accuracy: number;
  /** Total attempts. */
  attempts: number;
  /**
   * Lower bound of the Wilson score interval, expressed as 0..1.
   * Lower = weaker, weighted by the amount of evidence.
   */
  lowerBound: number;
}

/**
 * Minimal session data required by the analytics functions. Kept deliberately
 * small so the service layer can project from TypingSession (or any other
 * source) without coupling analytics to the full data model.
 */
export interface SessionPoint {
  /** Epoch ms the session started; used for chronological ordering. */
  startedAt: number;
  /** Words-per-minute achieved in this session. */
  wpm: number;
  /** The session's reported accuracy percentage (0-100). */
  accuracy: number;
  /** Number of correctly typed key presses. */
  correctCount: number;
  /** Number of incorrect key presses. */
  errorCount: number;
}

/** Result of a linear (least-squares) fit over a performance series. */
export interface Trend {
  /**
   * Average per-step change in `value` (in value units per session step) over
   * the ordered series. Positive = improving with practice.
   */
  slope: number;
  /** The fitted value at the series start; context for interpreting slope. */
  intercept: number;
  /** `true` when there are at least two points to fit a line. */
  valid: boolean;
}

/** Aggregate performance statistics for a set of sessions. */
export interface PerformanceSummary {
  /** Pooled accuracy over total keystrokes (correct/total * 100). */
  pooledAccuracy: number;
  /** Mean of per-session WPM. */
  avgWpm: number;
  /** Best single-session WPM. */
  bestWpm: number;
  /** Coefficient of variation of WPM (0 = perfectly consistent). */
  wpmVariability: number;
  /** WPM trend across the (chronological) series. */
  wpmTrend: Trend;
  /** Accuracy trend across the (chronological) series. */
  accuracyTrend: Trend;
}

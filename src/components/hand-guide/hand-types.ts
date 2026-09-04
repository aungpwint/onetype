import type { FingerId, Hand } from "../../types";

/**
 * Shared types for the hand-guide layer. `FingerId` and `Hand` are the single
 * source of truth already defined in `src/types`, covering the combined
 * hand+finger identifiers used by every finger highlight `data-finger` in the
 * hand SVG assets and by the keyboard layout / target model.
 */
export type { FingerId, Hand };

/** The finger(s) the hand guide should highlight for the active target. */
export interface HandHighlight {
  /** Finger on the left hand to highlight (if typing is driving it). */
  left: FingerId | null;
  /** Finger on the right hand to highlight (if typing is driving it). */
  right: FingerId | null;
}

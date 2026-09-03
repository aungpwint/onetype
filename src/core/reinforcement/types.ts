import type { FingerId, Modifier } from "../../types";
import type { MuscleMemoryGoal, MuscleMemoryPlan } from "../drills/engine";

/**
 * A weakness reported by the adaptive detection layer. `key` is a layout key
 * id in the engine's `${code}:${modifier}` form (e.g. "KeyA:none", "KeyJ:shift");
 * `lowerBound` is the Wilson lower bound from `src/core/weakness` — lower means
 * weaker.
 */
export interface WeakKeyId {
  key: string;
  lowerBound: number;
}

/** Options for building an adaptive reinforcement drill. */
export interface ReinforcementOptions {
  /** Muscle-memory goal. Defaults to "finger-isolation" (target the weakest). */
  goal?: MuscleMemoryGoal;
  /** Rough number of key presses for the drill. */
  length?: number;
  /** Maximum number of distinct weakness characters to target. Default 8. */
  maxKeys?: number;
}

/** A scheduled reinforcement drill targeting detected weaknesses. */
export interface ReinforcedDrill {
  goal: MuscleMemoryGoal;
  source: "keys" | "fingers";
  /** The weak key ids (or finger ids) that were targeted. */
  targeted: string[];
  /** The character focus set passed to the drill engine. */
  focusKeys: string[];
  /** Engine-ready plan from `planMuscleMemorySession`. */
  plan: MuscleMemoryPlan;
}

/** Parsed form of an engine key id. */
export interface ParsedKeyId {
  code: string;
  modifier: Modifier;
}

export type { FingerId };

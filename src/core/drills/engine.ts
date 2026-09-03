import type { FingerId, Hand } from "../../types";
import { englishQwerty } from "../keyboard-layout/english-qwerty";
import { buildSequence, type BuiltSequence } from "../typing-engine/sequence";
import { handForFinger } from "../finger-mapping/finger-map";
import {
  generateRepetitionDrill,
  generatePairDrill,
  generateFingerIsolationDrill,
  generateAlternationDrill,
  generateSameHandDrill,
  generateShiftDrill,
  generateRowTransitionDrill,
  type GeneratedDrill,
} from "./generator";
import { DEFAULT_ENGLISH_CONSTRAINTS } from "./types";
import type { DrillConstraints } from "./types";

/**
 * The kinds of muscle-memory practice the engine can build for English,
 * each mapped onto the corresponding drill generator at `src/core/drills`.
 */
export type MuscleMemoryGoal =
  | "finger-isolation"
  | "hand-alternation"
  | "same-hand"
  | "shift"
  | "row-transition"
  | "repetition"
  | "pair";

export interface MuscleMemoryOptions {
  /** Rough number of key presses to generate. Generator-specific. */
  length?: number;
  /** Seeded determinism for generators that accept one. */
  seed?: number;
  /** Overrides applied on top of the default English constraints. */
  constraints?: Partial<DrillConstraints>;
}

export interface MuscleMemoryPlan {
  goal: MuscleMemoryGoal;
  /** The characters actually produced by the drill (focus set).
   *  For the `pair` goal this is the flattened pair set. */
  keys: string[];
  /** Fingers trained by the drill. */
  focusesFingers: FingerId[];
  /** Hands trained by the drill. */
  focusesHands: Hand[];
  /** Count of space characters in the drill text. */
  spaces: number;
  /** Raw generator output. */
  drill: GeneratedDrill;
  /** Engine-ready typing sequence for the TypingEngine. */
  sequence: BuiltSequence;
}

function fingersFor(keys: string[]): FingerId[] {
  const set = new Set<FingerId>();
  for (const k of keys) {
    const lookup = englishQwerty.lookupChar(k);
    if (lookup) set.add(lookup.finger);
  }
  return [...set];
}

function handsFor(keys: string[]): Hand[] {
  const set = new Set<Hand>();
  for (const f of fingersFor(keys)) set.add(handForFinger(f));
  return [...set];
}

function rowOf(ch: string): "number" | "top" | "home" | "bottom" | "space" {
  return englishQwerty.getKey(englishQwerty.lookupChar(ch)?.code ?? "")?.row ?? "home";
}

function buildPlan(goal: MuscleMemoryGoal, drill: GeneratedDrill): MuscleMemoryPlan {
  const keys = [...new Set(drill.keys)];
  const text = drill.text;
  const sequence = buildSequence(text, englishQwerty);
  const spaces = (text.match(/ /g) ?? []).length;
  return {
    goal,
    keys,
    focusesFingers: fingersFor(keys),
    focusesHands: handsFor(keys),
    spaces,
    drill,
    sequence,
  };
}

/**
 * Build a single English muscle-memory practice session for the given goal and
 * focus-key set. "Focus keys" are character keys (e.g. `["f", "j"]`); the
 * resulting plan is fully determinable and ready for the TypingEngine.
 */
export function planMuscleMemorySession(
  goal: MuscleMemoryGoal,
  focusKeys: string[],
  opts: MuscleMemoryOptions = {},
): MuscleMemoryPlan {
  const length = opts.length ?? 20;

  for (const k of focusKeys) {
    if (!englishQwerty.lookupChar(k)) {
      throw new Error(`Focus key "${k}" is not supported by the English layout`);
    }
  }

  switch (goal) {
    case "finger-isolation": {
      if (focusKeys.length === 0) {
        throw new Error("finger-isolation goal requires at least one focus key");
      }
      const first = englishQwerty.lookupChar(focusKeys[0]);
      if (!first) throw new Error(`Focus key "${focusKeys[0]}" is not on the English layout`);
      const finger = first.finger;
      const drill = generateFingerIsolationDrill(finger, focusKeys, charFingerMap(), length);
      return buildPlan(goal, drill);
    }
    case "hand-alternation": {
      if (focusKeys.length < 2) {
        throw new Error("hand-alternation goal requires at least two focus keys");
      }
      const left = focusKeys.filter((k) => englishQwerty.lookupChar(k)?.hand === "left");
      const right = focusKeys.filter((k) => englishQwerty.lookupChar(k)?.hand === "right");      if (left.length === 0 || right.length === 0) {
        throw new Error("hand-alternation goal needs both a left-hand and a right-hand focus key");
      }
      const drill = generateAlternationDrill(left, right, Math.max(1, Math.floor(length / 2)));
      return buildPlan(goal, drill);
    }
    case "same-hand": {
      if (focusKeys.length === 0) {
        throw new Error("same-hand goal requires at least one focus key");
      }
      const drill = generateSameHandDrill(focusKeys, Math.max(1, opts.constraints?.maxConsecutive ?? 4), Math.max(1, Math.ceil(length / 4)));
      return buildPlan(goal, drill);
    }
    case "shift": {
      if (focusKeys.length === 0) {
        throw new Error("shift goal requires at least one focus key");
      }
      const drill = generateShiftDrill(focusKeys, Math.max(1, Math.ceil(length / (focusKeys.length * 2))), "lower-upper");
      return buildPlan(goal, drill);
    }
    case "row-transition": {
      if (focusKeys.length === 0) {
        throw new Error("row-transition goal requires at least one focus key");
      }
      const home = focusKeys.filter((k) => rowOf(k) === "home");
      const other = focusKeys.filter((k) => rowOf(k) !== "home");
      if (home.length === 0 || other.length === 0) {
        throw new Error("row-transition goal needs both a home-row and a non-home-row focus key");
      }
      const drill = generateRowTransitionDrill(home, other, Math.max(1, Math.ceil(length / 2)));
      return buildPlan(goal, drill);
    }
    case "repetition": {
      if (focusKeys.length === 0) {
        throw new Error("repetition goal requires at least one focus key");
      }
      const perKey = Math.max(1, Math.ceil(length / focusKeys.length));
      const drill = generateRepetitionDrill(focusKeys, perKey);
      return buildPlan(goal, drill);
    }
    case "pair": {
      if (focusKeys.length < 2) {
        throw new Error("pair goal requires at least two focus keys");
      }
      const pairs: [string, string][] = [];
      for (let i = 1; i < focusKeys.length; i++) {
        pairs.push([focusKeys[i - 1], focusKeys[i]]);
      }
      const repeats = Math.max(1, Math.ceil(length / pairs.length) / 2);
      const drill = generatePairDrill(pairs, repeats);
      return buildPlan(goal, drill);
    }
  }
}

/**
 * Character -> finger map for the English layout, derived from the Canda layout,
 * used by the finger-sensitive drill generators.
 */
function charFingerMap(): Record<string, FingerId> {
  const map: Record<string, FingerId> = {};
  for (const row of englishQwerty.rows) {
    for (const key of row) {
      if (key.plain !== undefined) map[key.plain] = key.finger;
    }
  }
  return map;
}

export const MUSCLE_MEMORY_GOALS: MuscleMemoryGoal[] = [
  "finger-isolation",
  "hand-alternation",
  "same-hand",
  "shift",
  "row-transition",
  "repetition",
  "pair",
];

export { DEFAULT_ENGLISH_CONSTRAINTS };

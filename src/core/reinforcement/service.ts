import type { KeyboardLayout } from "../keyboard-layout/layout";
import { englishQwerty } from "../keyboard-layout/english-qwerty";
import { ENGLISH_FINGER_KEYS } from "../drills/types";
import {
  planMuscleMemorySession,
  type MuscleMemoryGoal,
  type MuscleMemoryPlan,
} from "../drills/engine";
import type {
  FingerId,
  ParsedKeyId,
  ReinforcedDrill,
  ReinforcementOptions,
  WeakKeyId,
} from "./types";

/**
 * Adaptive reinforcement. Converts detected weaknesses (Phase 14) into targeted
 * muscle-memory drills (Phase 10): weak keys (`"KeyA:none"`) and weak fingers
 * are mapped to the characters the learner should re-drill, then fed to the
 * drill engine. Pure functions, no side effects.
 */

export const DEFAULT_MAX_KEYS = 8;

/** Split an engine key id into its code and modifier. */
export function parseKeyId(id: string): ParsedKeyId {
  const idx = id.indexOf(":");
  if (idx === -1) return { code: id, modifier: "none" };
  const code = id.slice(0, idx);
  const modifier = id.slice(idx + 1);
  return {
    code,
    modifier: modifier === "shift" || modifier === "none" ? modifier : "none",
  };
}

/** Map a weak key id to the character it emits on the layout, if any. */
export function keyIdToChar(id: string, layout: KeyboardLayout = englishQwerty): string | undefined {
  const { code, modifier } = parseKeyId(id);
  return layout.outputFor(code, modifier)?.text;
}

/**
 * Compute the character focus set for a list of weak keys: sort weakest-first
 * (ascending lower bound), map each to its character, dedupe, and cap at
 * `maxKeys`. Un-mappable ids are skipped.
 */
export function focusCharsFromWeakKeys(
  weakKeys: WeakKeyId[],
  opts: Pick<ReinforcementOptions, "maxKeys"> = {},
  layout: KeyboardLayout = englishQwerty,
): string[] {
  const maxKeys = opts.maxKeys ?? DEFAULT_MAX_KEYS;
  const sorted = [...weakKeys].sort((a, b) => a.lowerBound - b.lowerBound);
  const seen = new Set<string>();
  for (const wk of sorted) {
    if (seen.size >= maxKeys) break;
    const ch = keyIdToChar(wk.key, layout);
    if (ch !== undefined && !seen.has(ch)) seen.add(ch);
  }
  return [...seen];
}

/**
 * Compute the character focus set for a list of weak finger ids, using the
 * English finger-key map. Dedupes and caps at `maxKeys`.
 */
export function focusCharsFromWeakFingers(
  fingers: FingerId[],
  opts: Pick<ReinforcementOptions, "maxKeys"> = {},
  layout: KeyboardLayout = englishQwerty,
): string[] {
  const maxKeys = opts.maxKeys ?? DEFAULT_MAX_KEYS;
  const seen = new Set<string>();
  for (const finger of fingers) {
    for (const ch of ENGLISH_FINGER_KEYS[finger] ?? []) {
      if (seen.size >= maxKeys) break;
      if (ch !== " " && layout.lookupChar(ch)) seen.add(ch);
    }
  }
  return [...seen];
}

function makeDrill(
  goal: MuscleMemoryGoal,
  focusKeys: string[],
  targeted: string[],
  source: "keys" | "fingers",
  length: number | undefined,
): ReinforcedDrill {
  const plan = planMuscleMemorySession(goal, focusKeys, { length });
  return { goal, source, targeted, focusKeys, plan };
}

/** Build an adaptive reinforcement drill targeting the given weak keys. */
export function reinforcementFromWeakKeys(
  weakKeys: WeakKeyId[],
  opts: ReinforcementOptions = {},
): ReinforcedDrill {
  const goal = opts.goal ?? "finger-isolation";
  const focusKeys = focusCharsFromWeakKeys(weakKeys, opts);
  if (focusKeys.length === 0) {
    throw new Error("reinforcement: no weak keys mapped to a character on the layout");
  }
  return makeDrill(goal, focusKeys, weakKeys.map((w) => w.key), "keys", opts.length);
}

/** Build an adaptive reinforcement drill targeting the given weak fingers. */
export function reinforcementFromWeakFingers(
  weakFingers: FingerId[],
  opts: ReinforcementOptions = {},
): ReinforcedDrill {
  const goal = opts.goal ?? "finger-isolation";
  const focusKeys = focusCharsFromWeakFingers(weakFingers, opts);
  if (focusKeys.length === 0) {
    throw new Error("reinforcement: no weak fingers carry a usable key");
  }
  return makeDrill(goal, focusKeys, weakFingers, "fingers", opts.length);
}

/**
 * Build an adaptive reinforcement drill from the output of `rankWeakest`
 * (Phase 14): the weakest key (lowest lower bound) is isolated for drilling.
 * See `reinforcementFromWeakKeys` for override options.
 */
export function planWeakestReinforcement(
  ranks: { key: string; lowerBound: number }[],
  opts: ReinforcementOptions = {},
): ReinforcedDrill {
  return reinforcementFromWeakKeys(ranks, opts);
}

/** @internal re-export for convenience/tests. */
export type { MuscleMemoryPlan };

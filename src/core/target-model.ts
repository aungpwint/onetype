import type { FingerId, Hand, Modifier } from "../types";
import type { TypingEngine } from "./typing-engine/engine";
import type { KeyboardLayout } from "./keyboard-layout/layout";

export interface TargetState {
  keyCode: string | null;
  modifier: Modifier;
  finger: FingerId | null;
  hand: Hand | null;
  requiresShift: boolean;
}

export interface LastKeyState {
  keyCode: string | null;
  correct: boolean;
}

const IDLE_TARGET: TargetState = {
  keyCode: null,
  modifier: "none",
  finger: null,
  hand: null,
  requiresShift: false,
};

const NO_LAST_KEY: LastKeyState = { keyCode: null, correct: false };

/**
 * Resolve the current target (the key a learner should press next) from the
 * typing engine. The engine's expected unit already carries the finger and hand
 * for the target, so no layout lookup is required; `layout` is kept for callers
 * that want to reach extra key metadata.
 */
export function resolveTarget(
  engine: TypingEngine | null,
  _layout: KeyboardLayout | null,
): TargetState {
  const unit = engine?.expectedUnit ?? null;
  if (!unit) return IDLE_TARGET;
  return {
    keyCode: unit.keyCode,
    modifier: unit.modifier,
    finger: unit.finger,
    hand: unit.hand,
    requiresShift: unit.modifier === "shift",
  };
}

/**
 * Resolve the most recent key-press outcome (correct/incorrect) so the UI can
 * tint the corresponding finger. Uses the engine's last event, so it reflects
 * the key actually pressed rather than the newly-advanced target.
 */
export function resolveLastKey(engine: TypingEngine | null): LastKeyState {
  const event = engine?.lastEvent ?? null;
  if (!event) return NO_LAST_KEY;
  if (event.type !== "correct" && event.type !== "incorrect") return NO_LAST_KEY;
  return {
    keyCode: event.keyCode ?? null,
    correct: event.type === "correct",
  };
}

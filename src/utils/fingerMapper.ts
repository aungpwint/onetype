import type { FingerId } from "../types";
import { FINGER_LABELS, fingerForCode } from "../core/finger-mapping/finger-map";

/**
 * Optional human-readable label for wide keys whose layout `label` is too terse
 * to sit comfortably on a wide keycap (e.g. "Shift", "Enter", "Backspace").
 */
export const WIDE_KEY_LABEL: Record<string, string> = {
  Tab: "Tab",
  CapsLock: "Caps",
  Enter: "Enter",
  Backspace: "⌫",
  ShiftLeft: "Shift",
  ShiftRight: "Shift",
  ControlLeft: "Ctrl",
  AltLeft: "Alt",
  MetaLeft: "Cmd",
};

export interface FingerMapping {
  primary: FingerId | null;
  shift: FingerId | null;
}

/**
 * Resolve the primary finger (and, when `withShift`, the opposite-hand pinky
 * used for the Shift chord) responsible for a given key code.
 */
export function resolveFingerMapping(
  keyCode: string,
  withShift: boolean,
): FingerMapping {
  const primary = keyCode ? fingerForCode(keyCode) : null;
  let shift: FingerId | null = null;
  if (withShift && primary) {
    shift = primary.startsWith("left") ? "right-pinky" : "left-pinky";
  }
  return { primary, shift };
}

/** A short uppercase label for a finger ("L-Pinky"), used in tidy chips. */
export function fingerShort(finger: FingerId | null): string {
  if (!finger) return "";
  const full = FINGER_LABELS[finger];
  const match = full.toLowerCase().match(/^(\w+)\s+(\w+)$/);
  if (!match) return full;
  const side = match[1] === "right" ? "R" : "L";
  const name = match[2];
  return name === "Pinky" ? `${side}-Pink` : `${side}-${name}`;
}

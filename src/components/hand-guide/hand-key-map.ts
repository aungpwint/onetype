import type { FingerId, Hand } from "../../types";
import { fingerForCode } from "../../core/finger-mapping/finger-map";

/**
 * The set of physical keyboard `event.code` values that have a defined finger.
 * Mirrors the `STANDARD` map in `finger-map.ts` so unknown/absent codes (or
 * synthetic Myanmar composite keys that never map to a single finger) resolve to
 * no highlight rather than wrongly lighting up a finger.
 */
const KNOWN_CODES = new Set([
  "Backquote", "Digit1", "Digit2", "Digit3", "Digit4", "Digit5",
  "Digit6", "Digit7", "Digit8", "Digit9", "Digit0",
  "Minus", "Equal", "Backspace", "Tab",
  "KeyQ", "KeyW", "KeyE", "KeyR", "KeyT", "KeyY", "KeyU", "KeyI", "KeyO", "KeyP",
  "BracketLeft", "BracketRight", "Backslash",
  "CapsLock",
  "KeyA", "KeyS", "KeyD", "KeyF", "KeyG", "KeyH", "KeyJ", "KeyK", "KeyL",
  "Semicolon", "Quote", "Enter",
  "ShiftLeft", "KeyZ", "KeyX", "KeyC", "KeyV", "KeyB",
  "KeyN", "KeyM", "Comma", "Period", "Slash", "ShiftRight",
  "ControlLeft", "AltLeft", "MetaLeft", "ControlRight", "AltRight", "MetaRight",
  "Space",
]);

/**
 * Resolve the finger responsible for a physical key code, or `null` when there is
 * none (idle, or an unknown key). Unknown codes return `null` explicitly instead
 * of `fingerForCode`'s pinky fallback, so we never highlight the wrong finger.
 */
export function resolveFinger(code: string | null | undefined): FingerId | null {
  if (!code || !KNOWN_CODES.has(code)) return null;
  return fingerForCode(code);
}

/** The hand a finger belongs to ("left" | "right"). */
export function fingerHand(finger: FingerId): Hand {
  return finger.startsWith("left") ? "left" : "right";
}

/** True when `finger` belongs to the given hand. */
export function fingerOnHand(finger: FingerId, hand: Hand): boolean {
  return fingerHand(finger) === hand;
}

import { useMemo } from "react";
import type { FingerId } from "../../types";
import handsSvg from "./hands.svg?raw";

interface HandGuideProps {
  activeKey?: string | null;
  feedbackFinger?: { finger: FingerId; state: "correct" | "error" } | null;
  interactive?: boolean;
  ariaHidden?: boolean;
}

/**
 * Map a physical keyboard event.code to the matching gesture group id inside the
 * typing-club-hands SVG asset (see hands.svg). Each group draws one hand with
 * the responsible finger highlighted via the asset's blue stroke.
 */
const CODE_TO_GESTURE: Record<string, string> = {
  Tab: "tab",
  Enter: "enter",
  Space: "space",
  ShiftLeft: "shift-left",
  ShiftRight: "shift-right",
  ControlLeft: "option-left",
  AltLeft: "option-left",
  MetaLeft: "option-left",
  ControlRight: "option-right",
  AltRight: "option-right",
  MetaRight: "option-right",
  Equal: "equal",
  Minus: "minus",
  Backquote: "tilda",
  BracketLeft: "open-bracket",
  BracketRight: "close-bracket",
  Backslash: "backslash",
  Semicolon: "semicolon",
  Quote: "quote",
  Comma: "comma",
  Period: "dot",
  Slash: "slash",
  Backspace: "neutral-right",
  CapsLock: "shift-left",
};

function gestureForCode(code: string | null): string {
  if (!code) return "neutral-right";
  if (CODE_TO_GESTURE[code]) return CODE_TO_GESTURE[code];
  if (/^Key[A-Z]$/.test(code)) return code.slice(3).toLowerCase();
  if (/^Digit[0-9]$/.test(code)) return `key-${code.slice(5)}`;
  return "neutral-right";
}

/**
 * `hands.svg` stores each hand+gesture as its own `<g>` group, initially hidden
 * with `class="st0"` (display:none). We always reveal two groups — one per hand —
 * so BOTH hands stay visible. The hand that just typed a key is swapped from its
 * neutral group to the matching gesture group, highlighting the used finger via
 * the asset's blue stroke, while the other hand stays neutral.
 */
const LEFT_GESTURES = new Set([
  "q", "w", "e", "r", "t", "a", "s", "d", "f", "g", "z", "x", "c", "v", "b",
  "key-1", "key-2", "key-3", "key-4", "key-5",
  "tab", "shift-left", "option-left", "shift-option-left", "tilda",
]);

const RIGHT_GESTURES = new Set([
  "y", "u", "i", "o", "p", "h", "j", "k", "l", "n", "m",
  "key-0", "key-6", "key-7", "key-8", "key-9",
  "equal", "minus", "open-bracket", "close-bracket", "backslash",
  "semicolon", "quote", "comma", "dot", "slash",
  "enter", "space", "shift-right", "option-right", "shift-option-right",
]);

function setVisible(html: string, id: string): string {
  return html.replace(`<g id="${id}" class="st0">`, `<g id="${id}" style="display:block">`);
}

function buildSvgHtml(activeKey: string | null): string {
  let left: string = "neutral-left";
  let right: string = "neutral-right";
  const gesture = gestureForCode(activeKey);
  if (LEFT_GESTURES.has(gesture)) {
    left = gesture;
  } else if (RIGHT_GESTURES.has(gesture)) {
    right = gesture;
  }
  return setVisible(setVisible(handsSvg, left), right);
}

/**
 * Two-handed typing hand guide (bird's-eye typing-club-hands style), matching
 * the design in demo-layout.html. Renders the shared hands.svg asset and reveals
 * the single gesture for the current target key; idle shows a neutral hand.
 */
export function HandGuide({
  activeKey,
  feedbackFinger,
  interactive = true,
  ariaHidden = false,
}: HandGuideProps) {
  const svgHtml = useMemo(
    () => buildSvgHtml(interactive ? activeKey ?? null : null),
    [interactive, activeKey],
  );

  const feedback = feedbackFinger ? (feedbackFinger.state === "correct" ? "correct" : "incorrect") : null;

  const classes = ["typing-club-hands"];
  if (feedback) classes.push(`hg-${feedback}`);

  return (
    <div
      className={classes.join(" ")}
      aria-hidden={ariaHidden || undefined}
      aria-label={ariaHidden ? undefined : "Hand guide"}
      dangerouslySetInnerHTML={{ __html: svgHtml }}
    />
  );
}

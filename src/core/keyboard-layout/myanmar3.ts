import { KeyboardLayout, type KeyboardLayoutSpec, type KeyDefinition } from "./layout";
import { fingerForCode, handForFinger } from "../finger-mapping/finger-map";

export const MYANMAR3_REVISION = 1;

const LETTERS: Record<string, { plain: string; shifted: string }> = {
  KeyQ: { plain: "\u1006", shifted: "\u1008" },
  KeyW: { plain: "\u1010", shifted: "\u101D" },
  KeyE: { plain: "\u1014", shifted: "\u1023" },
  KeyR: { plain: "\u1019", shifted: "\u104E" },
  KeyT: { plain: "\u1021", shifted: "\u1024" },
  KeyY: { plain: "\u1015", shifted: "\u104C" },
  KeyU: { plain: "\u1000", shifted: "\u1025" },
  KeyI: { plain: "\u1004", shifted: "\u104D" },
  KeyO: { plain: "\u101E", shifted: "\u103F" },
  KeyP: { plain: "\u1005", shifted: "\u100F" },
  KeyA: { plain: "\u1031", shifted: "\u1017" },
  KeyS: { plain: "\u103B", shifted: "\u103E" },
  KeyD: { plain: "\u102D", shifted: "\u102E" },
  KeyF: { plain: "\u103A", shifted: "\u1039" },
  KeyG: { plain: "\u102B", shifted: "\u103D" },
  KeyH: { plain: "\u1037", shifted: "\u1036" },
  KeyJ: { plain: "\u103C", shifted: "\u1032" },
  KeyK: { plain: "\u102F", shifted: "\u1012" },
  KeyL: { plain: "\u1030", shifted: "\u1013" },
  KeyZ: { plain: "\u1016", shifted: "\u1007" },
  KeyX: { plain: "\u1011", shifted: "\u100C" },
  KeyC: { plain: "\u1001", shifted: "\u1003" },
  KeyV: { plain: "\u101C", shifted: "\u1020" },
  KeyB: { plain: "\u1018", shifted: "\u101A" },
  KeyN: { plain: "\u100A", shifted: "\u1009" },
  KeyM: { plain: "\u102C", shifted: "\u1026" },
};

const DIGIT_PLAIN: Record<string, string> = {
  Digit1: "\u1041",
  Digit2: "\u1042",
  Digit3: "\u1043",
  Digit4: "\u1044",
  Digit5: "\u1045",
  Digit6: "\u1046",
  Digit7: "\u1047",
  Digit8: "\u1048",
  Digit9: "\u1049",
  Digit0: "\u1040",
};

const DIGIT_SHIFTED: Record<string, string> = {
  Digit1: "\u100D",
  Digit2: "\u1052",
  Digit3: "\u100B",
  Digit4: "\u1053",
  Digit5: "\u1054",
  Digit6: "\u1055",
  Digit7: "\u101B",
};

function key(code: string, label: string, plain: string, shifted: string): KeyDefinition {
  const finger = fingerForCode(code);
  return { code, label, finger, hand: handForFinger(finger), row: "number", plain, shifted };
}

function plainKey(code: string, label: string, plain: string): KeyDefinition {
  const finger = fingerForCode(code);
  return { code, label, finger, hand: handForFinger(finger), row: "number", plain };
}

function noOutputKey(code: string, label: string): KeyDefinition {
  const finger = fingerForCode(code);
  return { code, label, finger, hand: handForFinger(finger), row: "number" };
}

function modifierKey(code: string, label: string): KeyDefinition {
  const finger = fingerForCode(code);
  return { code, label, finger, hand: handForFinger(finger), row: "home", kind: "modifier", legend: label };
}

function letterKey(code: string, row: "top" | "home" | "bottom"): KeyDefinition {
  const { plain, shifted } = LETTERS[code];
  const finger = fingerForCode(code);
  return { code, label: plain, finger, hand: handForFinger(finger), row, plain, shifted };
}

function padding(width: number): KeyDefinition {
  return { code: "", label: "", finger: "left-pinky", hand: "left", row: "space", width, kind: "modifier" };
}

const rows: KeyDefinition[][] = [
  [
    plainKey("Backquote", "\u1050", "\u1050"),
    {
      code: "Digit1",
      label: "\u1041",
      finger: fingerForCode("Digit1"),
      hand: handForFinger(fingerForCode("Digit1")),
      row: "number" as const,
      plain: DIGIT_PLAIN.Digit1,
      shifted: DIGIT_SHIFTED.Digit1,
    },
    {
      code: "Digit2",
      label: "\u1042",
      finger: fingerForCode("Digit2"),
      hand: handForFinger(fingerForCode("Digit2")),
      row: "number" as const,
      plain: DIGIT_PLAIN.Digit2,
      shifted: DIGIT_SHIFTED.Digit2,
    },
    {
      code: "Digit3",
      label: "\u1043",
      finger: fingerForCode("Digit3"),
      hand: handForFinger(fingerForCode("Digit3")),
      row: "number" as const,
      plain: DIGIT_PLAIN.Digit3,
      shifted: DIGIT_SHIFTED.Digit3,
    },
    {
      code: "Digit4",
      label: "\u1044",
      finger: fingerForCode("Digit4"),
      hand: handForFinger(fingerForCode("Digit4")),
      row: "number" as const,
      plain: DIGIT_PLAIN.Digit4,
      shifted: DIGIT_SHIFTED.Digit4,
    },
    {
      code: "Digit5",
      label: "\u1045",
      finger: fingerForCode("Digit5"),
      hand: handForFinger(fingerForCode("Digit5")),
      row: "number" as const,
      plain: DIGIT_PLAIN.Digit5,
      shifted: DIGIT_SHIFTED.Digit5,
    },
    {
      code: "Digit6",
      label: "\u1046",
      finger: fingerForCode("Digit6"),
      hand: handForFinger(fingerForCode("Digit6")),
      row: "number" as const,
      plain: DIGIT_PLAIN.Digit6,
      shifted: DIGIT_SHIFTED.Digit6,
    },
    {
      code: "Digit7",
      label: "\u1047",
      finger: fingerForCode("Digit7"),
      hand: handForFinger(fingerForCode("Digit7")),
      row: "number" as const,
      plain: DIGIT_PLAIN.Digit7,
      shifted: DIGIT_SHIFTED.Digit7,
    },
    {
      code: "Digit8",
      label: "\u1048",
      finger: fingerForCode("Digit8"),
      hand: handForFinger(fingerForCode("Digit8")),
      row: "number" as const,
      plain: DIGIT_PLAIN.Digit8,
      shifted: DIGIT_SHIFTED.Digit8,
    },
    {
      code: "Digit9",
      label: "\u1049",
      finger: fingerForCode("Digit9"),
      hand: handForFinger(fingerForCode("Digit9")),
      row: "number" as const,
      plain: DIGIT_PLAIN.Digit9,
      shifted: DIGIT_SHIFTED.Digit9,
    },
    {
      code: "Digit0",
      label: "\u1040",
      finger: fingerForCode("Digit0"),
      hand: handForFinger(fingerForCode("Digit0")),
      row: "number" as const,
      plain: DIGIT_PLAIN.Digit0,
      shifted: DIGIT_SHIFTED.Digit0,
    },
    noOutputKey("Minus", "-"),
    noOutputKey("Equal", "="),
    { ...modifierKey("Backspace", "Backspace"), row: "number" as const, width: 2 },
  ],
  [
    { ...modifierKey("Tab", "Tab"), row: "top" as const, width: 1.5 },
    letterKey("KeyQ", "top"),
    letterKey("KeyW", "top"),
    letterKey("KeyE", "top"),
    letterKey("KeyR", "top"),
    letterKey("KeyT", "top"),
    letterKey("KeyY", "top"),
    letterKey("KeyU", "top"),
    letterKey("KeyI", "top"),
    letterKey("KeyO", "top"),
    letterKey("KeyP", "top"),
    key("BracketLeft", "\u101F", "\u101F", "\u1027"),
    key("BracketRight", "\u1029", "\u1029", "\u102A"),
    { ...modifierKey("Backslash", "\\"), row: "top" as const, width: 1.5 },
  ],
  [
    { ...modifierKey("CapsLock", "Caps"), row: "home" as const, width: 1.75 },
    letterKey("KeyA", "home"),
    letterKey("KeyS", "home"),
    letterKey("KeyD", "home"),
    letterKey("KeyF", "home"),
    letterKey("KeyG", "home"),
    letterKey("KeyH", "home"),
    letterKey("KeyJ", "home"),
    letterKey("KeyK", "home"),
    letterKey("KeyL", "home"),
    key("Semicolon", "\u1038", "\u1038", "\u1002"),
    noOutputKey("Quote", "`"),
    { ...modifierKey("Enter", "Enter"), row: "home" as const, width: 2.25 },
  ],
  [
    { ...modifierKey("ShiftLeft", "Shift"), row: "bottom" as const, width: 2.25 },
    letterKey("KeyZ", "bottom"),
    letterKey("KeyX", "bottom"),
    letterKey("KeyC", "bottom"),
    letterKey("KeyV", "bottom"),
    letterKey("KeyB", "bottom"),
    letterKey("KeyN", "bottom"),
    letterKey("KeyM", "bottom"),
    plainKey("Comma", "\u104A", "\u104A"),
    plainKey("Period", "\u104B", "\u104B"),
    noOutputKey("Slash", "/"),
    { ...modifierKey("ShiftRight", "Shift"), row: "bottom" as const, width: 2.75 },
  ],
  [
    padding(2.25),
    { ...modifierKey("ControlLeft", "Ctrl"), row: "space" as const, width: 1.25 },
    { ...modifierKey("MetaLeft", "Alt"), row: "space" as const, width: 1.25 },
    { code: "Space", label: "space", finger: fingerForCode("Space"), hand: "left", row: "space" as const, plain: " ", width: 6.5, kind: "modifier" },
    { ...modifierKey("MetaRight", "Alt"), row: "space" as const },
    { ...modifierKey("ControlRight", "Ctrl"), row: "space" as const },
    padding(2.25),
  ],
];

export const myanmar3 = new KeyboardLayout({
  id: "myanmar3",
  name: "Myanmar3",
  language: "myanmar",
  version: MYANMAR3_REVISION,
  source:
    "SIL Myanmar3 (sil_myanmar_my3) v1.7.5, verified against the Keyman source files. Physical keys are the same positions as US QWERTY; the stored byte sequence of every lesson text matches the canonical Myanmar3 typing order, so each character reverse-maps to exactly one keypress.",
  rows,
  note: "Punctuation: Comma = ၊ (U+104A), Period = ။ (U+104B), Shift+F = virama ္ for stacked consonants, H = asat ့, Shift+7 = ရ, digits 1..0 = ၁..၀.",
} satisfies KeyboardLayoutSpec);
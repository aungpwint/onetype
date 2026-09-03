import { KeyboardLayout, type KeyboardLayoutSpec, type KeyDefinition } from "./layout";
import { fingerForCode, handForFinger } from "../finger-mapping/finger-map";

const LETTERS: Record<string, string> = {
  KeyQ: "q",
  KeyW: "w",
  KeyE: "e",
  KeyR: "r",
  KeyT: "t",
  KeyY: "y",
  KeyU: "u",
  KeyI: "i",
  KeyO: "o",
  KeyP: "p",
  KeyA: "a",
  KeyS: "s",
  KeyD: "d",
  KeyF: "f",
  KeyG: "g",
  KeyH: "h",
  KeyJ: "j",
  KeyK: "k",
  KeyL: "l",
  KeyZ: "z",
  KeyX: "x",
  KeyC: "c",
  KeyV: "v",
  KeyB: "b",
  KeyN: "n",
  KeyM: "m",
};

const DIGITS: Record<string, string> = {
  Digit1: "1",
  Digit2: "2",
  Digit3: "3",
  Digit4: "4",
  Digit5: "5",
  Digit6: "6",
  Digit7: "7",
  Digit8: "8",
  Digit9: "9",
  Digit0: "0",
};

const DIGIT_SHIFTED: Record<string, string> = {
  Digit1: "!",
  Digit2: "@",
  Digit3: "#",
  Digit4: "$",
  Digit5: "%",
  Digit6: "^",
  Digit7: "&",
  Digit8: "*",
  Digit9: "(",
  Digit0: ")",
};

function key(code: string, label: string, plain: string, shifted: string): KeyDefinition {
  const finger = fingerForCode(code);
  return { code, label, finger, hand: handForFinger(finger), row: "number", plain, shifted };
}

function digitKey(code: string, label: string): KeyDefinition {
  const finger = fingerForCode(code);
  return { code, label, finger, hand: handForFinger(finger), row: "number", plain: DIGITS[code], shifted: DIGIT_SHIFTED[code] };
}

function plainKey(code: string, label: string, plain: string): KeyDefinition {
  const finger = fingerForCode(code);
  return { code, label, finger, hand: handForFinger(finger), row: "number", plain };
}

function modifierKey(code: string, label: string): KeyDefinition {
  const finger = fingerForCode(code);
  return { code, label, finger, hand: handForFinger(finger), row: "home", kind: "modifier", legend: label };
}

function letterKey(code: string, row: "top" | "home" | "bottom"): KeyDefinition {
  const label = LETTERS[code];
  const finger = fingerForCode(code);
  return { code, label, finger, hand: handForFinger(finger), row, plain: label, shifted: label.toUpperCase() };
}

function padding(width: number): KeyDefinition {
  return { code: "", label: "", finger: "left-pinky", hand: "left", row: "space", width, kind: "modifier" };
}

const rows: KeyDefinition[][] = [
  [
    plainKey("Backquote", "`", "`"),
    digitKey("Digit1", "1"),
    digitKey("Digit2", "2"),
    digitKey("Digit3", "3"),
    digitKey("Digit4", "4"),
    digitKey("Digit5", "5"),
    digitKey("Digit6", "6"),
    digitKey("Digit7", "7"),
    digitKey("Digit8", "8"),
    digitKey("Digit9", "9"),
    digitKey("Digit0", "0"),
    key("Minus", "-", "-", "_"),
    key("Equal", "=", "=", "+"),
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
    key("BracketLeft", "[", "[", "{"),
    key("BracketRight", "]", "]", "}"),
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
    key("Semicolon", ";", ";", ":"),
    key("Quote", "'", "'", '"'),
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
    key("Comma", ",", ",", "<"),
    key("Period", ".", ".", ">"),
    key("Slash", "/", "/", "?"),
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

export const ENGLISH_QWERTY_REVISION = 1;

export const englishQwerty = new KeyboardLayout({
  id: "english-qwerty",
  name: "English QWERTY",
  language: "english",
  version: ENGLISH_QWERTY_REVISION,
  source: "Standard US QWERTY (ANSI-104). Physical-key touch typing reference.",
  rows,
} satisfies KeyboardLayoutSpec);

export const ENGLISH_KEYROW_LABELS = ["` 1 2 3 4 5 6 7 8 9 0 - =", "Tab Q W E R T Y U I O P [ ] \\", "Caps A S D F G H J K L ; ' Enter", "Shift Z X C V B N M , . / Shift"];
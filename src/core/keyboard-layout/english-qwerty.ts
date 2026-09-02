import { KeyboardLayout, type KeyboardLayoutSpec, type KeyDefinition } from "./layout";
import { fingerForCode } from "../finger-mapping/finger-map";

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
  return { code, label, finger: fingerForCode(code), plain, shifted };
}

function digitKey(code: string, label: string): KeyDefinition {
  return { code, label, finger: fingerForCode(code), plain: DIGITS[code], shifted: DIGIT_SHIFTED[code] };
}

function plainKey(code: string, label: string, plain: string): KeyDefinition {
  return { code, label, finger: fingerForCode(code), plain };
}

function modifierKey(code: string, label: string): KeyDefinition {
  return { code, label, finger: fingerForCode(code), kind: "modifier", legend: label };
}

function letterKey(code: string): KeyDefinition {
  const label = LETTERS[code];
  return key(code, label, label, label.toUpperCase());
}

function padding(width: number): KeyDefinition {
  return { code: "", label: "", finger: "left-pinky", width, kind: "modifier" };
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
    { ...modifierKey("Backspace", "Backspace"), width: 2 },
  ],
  [
    { ...modifierKey("Tab", "Tab"), width: 1.5 },
    letterKey("KeyQ"),
    letterKey("KeyW"),
    letterKey("KeyE"),
    letterKey("KeyR"),
    letterKey("KeyT"),
    letterKey("KeyY"),
    letterKey("KeyU"),
    letterKey("KeyI"),
    letterKey("KeyO"),
    letterKey("KeyP"),
    key("BracketLeft", "[", "[", "{"),
    key("BracketRight", "]", "]", "}"),
    { ...modifierKey("Backslash", "\\"), width: 1.5 },
  ],
  [
    { ...modifierKey("CapsLock", "Caps"), width: 1.75 },
    letterKey("KeyA"),
    letterKey("KeyS"),
    letterKey("KeyD"),
    letterKey("KeyF"),
    letterKey("KeyG"),
    letterKey("KeyH"),
    letterKey("KeyJ"),
    letterKey("KeyK"),
    letterKey("KeyL"),
    key("Semicolon", ";", ";", ":"),
    key("Quote", "'", "'", '"'),
    { ...modifierKey("Enter", "Enter"), width: 2.25 },
  ],
  [
    { ...modifierKey("ShiftLeft", "Shift"), width: 2.25 },
    letterKey("KeyZ"),
    letterKey("KeyX"),
    letterKey("KeyC"),
    letterKey("KeyV"),
    letterKey("KeyB"),
    letterKey("KeyN"),
    letterKey("KeyM"),
    key("Comma", ",", ",", "<"),
    key("Period", ".", ".", ">"),
    key("Slash", "/", "/", "?"),
    { ...modifierKey("ShiftRight", "Shift"), width: 2.75 },
  ],
  [
    padding(2.25),
    { ...modifierKey("ControlLeft", "Ctrl"), width: 1.25 },
    { ...modifierKey("MetaLeft", "Alt"), width: 1.25 },
    { code: "Space", label: "space", finger: fingerForCode("Space"), plain: " ", width: 6.5, kind: "modifier" },
    modifierKey("MetaRight", "Alt"),
    modifierKey("ControlRight", "Ctrl"),
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
import type { FingerId, Hand } from "../../types";
import type { KeyboardLayout } from "../keyboard-layout/layout";

export interface DrillConfig {
  layout: KeyboardLayout;
  allowedKeys: string[];
  length: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
  targetFinger?: FingerId;
  targetHand?: Hand;
  constraints: DrillConstraints;
}

export interface DrillConstraints {
  maxConsecutive: number;
  requireAlternation: boolean;
  sameHandMax: number;
  allowShift: boolean;
  mustInclude?: string[];
  exclude?: string[];
}

export interface WordList {
  words: string[];
  minLetters?: string[];
  maxWordLength?: number;
}

export const DEFAULT_ENGLISH_CONSTRAINTS: DrillConstraints = {
  maxConsecutive: 3,
  requireAlternation: false,
  sameHandMax: 4,
  allowShift: false,
};

export const ENGLISH_FINGER_KEYS: Record<FingerId, string[]> = {
  "left-pinky": ["q", "a", "z"],
  "left-ring": ["w", "s", "x"],
  "left-middle": ["e", "d", "c"],
  "left-index": ["r", "t", "f", "g", "v", "b"],
  "left-thumb": [" "],
  "right-thumb": [" "],
  "right-index": ["y", "u", "h", "j", "n", "m"],
  "right-middle": ["i", "k", ","],
  "right-ring": ["o", "l", "."],
  "right-pinky": ["p", ";", "'", "/", "[", "]", "\\"],
};

export const HOME_ROW_KEYS = ["a", "s", "d", "f", "g", "h", "j", "k", "l", ";"];
export const HOME_ROW_LEFT = ["a", "s", "d", "f", "g"];
export const HOME_ROW_RIGHT = ["h", "j", "k", "l", ";"];

export const TOP_ROW_KEYS = ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"];
export const TOP_ROW_LEFT = ["q", "w", "e", "r", "t"];
export const TOP_ROW_RIGHT = ["y", "u", "i", "o", "p"];

export const BOTTOM_ROW_KEYS = ["z", "x", "c", "v", "b", "n", "m"];
export const BOTTOM_ROW_LEFT = ["z", "x", "c", "v", "b"];
export const BOTTOM_ROW_RIGHT = ["n", "m"];

export const ALL_LETTER_KEYS = [
  ...TOP_ROW_KEYS,
  ...HOME_ROW_KEYS,
  ...BOTTOM_ROW_KEYS,
];

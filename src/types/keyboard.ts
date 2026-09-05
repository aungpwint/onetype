import type { FingerId, Hand } from "./index";
import type { KeyboardRow } from "@/core/keyboard-layout/layout";

/**
 * Canonical keyboard identifiers referenced by lesson JSON files.
 *
 * `layoutId` (the runtime keyboard-layout id) and `keyboard` (the canonical
 * lesson-schema identifier) are kept as separate domains so lessons stay
 * transportable while the runtime keyboard registry remains authoritative for
 * geometry/behaviour.
 */
export type KeyboardId = "qwerty" | "myanmar3";

export const LESSON_KEYBOARD_IDS: readonly KeyboardId[] = ["qwerty", "myanmar3"] as const;

export function isKeyboardId(value: unknown): value is KeyboardId {
  return typeof value === "string" && (LESSON_KEYBOARD_IDS as readonly string[]).includes(value);
}

export type RuntimeLayoutId = "english-qwerty" | "myanmar3";

export function toLayoutId(keyboard: KeyboardId): RuntimeLayoutId {
  switch (keyboard) {
    case "qwerty":
      return "english-qwerty";
    case "myanmar3":
      return "myanmar3";
  }
}

export function fromLayoutId(layoutId: string): KeyboardId {
  if (layoutId === "english-qwerty") return "qwerty";
  if (layoutId === "myanmar3") return "myanmar3";
  throw new Error(`Layout "${layoutId}" has no canonical lesson keyboard identifier`);
}

/**
 * Serialized keyboard definition (JSON-friendly). This mirrors the runtime
 * `KeyboardLayoutSpec` surface so the registry can hydrate a `KeyboardLayout`
 * from `src/data/keyboards/*.json`. Lessons only *reference* a keyboard by id;
 * they never embed geometry.
 */
export interface KeyboardDefinitionJson {
  id: string;
  name: string;
  language: "english" | "myanmar" | "mixed";
  version: number;
  source: string;
  rows: KeyboardKeyDefinitionJson[][];
  space?: KeyboardKeyDefinitionJson;
  note?: string;
}

export interface KeyboardKeyDefinitionJson {
  code: string;
  label: string;
  finger: FingerId;
  hand: Hand;
  row: KeyboardRow;
  plain?: string;
  shifted?: string;
  width?: number;
  kind?: "key" | "modifier";
  legend?: string;
}
import type { FingerId, Modifier } from "../../types";

export interface KeyDefinition {
  code: string;
  label: string;
  finger: FingerId;
  plain?: string;
  shifted?: string;
  width?: number;
  kind?: "key" | "modifier";
  legend?: string;
}

export interface KeyOutput {
  text: string;
  modifier: Modifier;
}

export interface KeyLookup {
  code: string;
  modifier: Modifier;
  text: string;
  finger: FingerId;
}

export interface KeyboardLayoutSpec {
  id: string;
  name: string;
  language: "english" | "myanmar" | "mixed";
  version: number;
  source: string;
  rows: KeyDefinition[][];
  space?: KeyDefinition;
  note?: string;
}

export class KeyboardLayout {
  readonly id: string;
  readonly name: string;
  readonly language: "english" | "myanmar" | "mixed";
  readonly version: number;
  readonly source: string;
  readonly rows: KeyDefinition[][];
  readonly space: KeyDefinition;
  readonly byCode = new Map<string, KeyDefinition>();
  readonly charMap = new Map<string, KeyLookup>();
  readonly note?: string;

  constructor(spec: KeyboardLayoutSpec) {
    this.id = spec.id;
    this.name = spec.name;
    this.language = spec.language;
    this.version = spec.version;
    this.source = spec.source;
    this.rows = spec.rows;
    this.note = spec.note;
    this.space = spec.space ?? {
      code: "Space",
      label: "space",
      finger: "left-thumb",
      plain: " ",
    };
    for (const row of spec.rows) {
      for (const key of row) {
        this.byCode.set(key.code, key);
        if (key.plain === undefined) continue;
        this.registerChar(key.plain, key.code, "none", key.finger);
        if (key.shifted !== undefined) {
          this.registerChar(key.shifted, key.code, "shift", key.finger);
        }
      }
    }
    this.registerChar("\u0020", "Space", "none", this.space.finger);
  }

  private registerChar(text: string, code: string, modifier: Modifier, finger: FingerId) {
    if (this.charMap.has(text)) return;
    this.charMap.set(text, { code, modifier, text, finger });
  }

  getKey(code: string): KeyDefinition | undefined {
    return this.byCode.get(code);
  }

  outputFor(code: string, modifier: Modifier): KeyOutput | undefined {
    if (code === "Space") return { text: " ", modifier: "none" };
    const key = this.byCode.get(code);
    if (!key) return undefined;
    const text = modifier === "shift" ? key.shifted : key.plain;
    if (text === undefined) return undefined;
    return { text, modifier };
  }

  lookupChar(text: string): KeyLookup | undefined {
    return this.charMap.get(text);
  }

  reverseMap(tokens: string[]): { lookup: KeyLookup; token: string }[] {
    const out: { lookup: KeyLookup; token: string }[] = [];
    for (const token of tokens) {
      for (const ch of token) {
        const lookup = this.lookupChar(ch);
        if (!lookup) {
          throw new Error(`Layout "${this.id}" has no key for character "${ch}" (${ch.codePointAt(0)?.toString(16)})`);
        }
        out.push({ lookup, token });
      }
    }
    return out;
  }
}
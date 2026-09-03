import type { FingerId, Hand } from "../../types";
import { handForFinger } from "../finger-mapping/finger-map";
import type {
  DrillConfig,
  WordList,
} from "./types";

function shuffle<T>(arr: T[], seed: number): T[] {
  const out = [...arr];
  let s = seed;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function handOf(key: string, fingerMap: Record<string, FingerId>): Hand {
  const f = fingerMap[key] ?? "left-pinky";
  return handForFinger(f);
}

export interface GeneratedDrill {
  text: string;
  keys: string[];
}

export function generateRepetitionDrill(
  keys: string[],
  repeats: number,
  separator: string = " ",
): GeneratedDrill {
  const out: string[] = [];
  for (const k of keys) {
    for (let i = 0; i < repeats; i++) out.push(k);
  }
  return { text: out.join(separator), keys: out };
}

export function generatePairDrill(
  pairs: [string, string][],
  repeats: number,
  separator: string = " ",
): GeneratedDrill {
  const out: string[] = [];
  for (const [a, b] of pairs) {
    for (let i = 0; i < repeats; i++) out.push(a, b);
  }
  return { text: out.join(separator), keys: out };
}

export function generateFingerIsolationDrill(
  targetFinger: FingerId,
  keys: string[],
  fingerMap: Record<string, FingerId>,
  length: number = 20,
): GeneratedDrill {
  const target = keys.filter((k) => fingerMap[k] === targetFinger);
  const others = keys.filter((k) => fingerMap[k] !== targetFinger);
  if (target.length === 0) {
    return { text: "", keys: [] };
  }
  const out: string[] = [];
  for (let i = 0; i < length; i++) {
    out.push(target[i % target.length]);
    if (i % 4 === 3 && others.length > 0) {
      out.push(others[i % others.length]);
    }
  }
  return { text: out.join(" "), keys: out };
}

export function generateAlternationDrill(
  leftKeys: string[],
  rightKeys: string[],
  pairsCount: number,
): GeneratedDrill {
  const out: string[] = [];
  for (let i = 0; i < pairsCount; i++) {
    out.push(leftKeys[i % leftKeys.length]);
    out.push(rightKeys[i % rightKeys.length]);
  }
  return { text: out.join(" "), keys: out };
}

export function generateSameHandDrill(
  keys: string[],
  groupSize: number,
  groups: number,
): GeneratedDrill {
  const out: string[] = [];
  for (let g = 0; g < groups; g++) {
    for (let i = 0; i < groupSize; i++) {
      out.push(keys[(g * groupSize + i) % keys.length]);
    }
  }
  return { text: out.join(" "), keys: out };
}

export function generateShiftDrill(
  lowercase: string[],
  repeats: number,
  mode: "lower-upper" | "upper-lower" | "mixed" = "lower-upper",
): GeneratedDrill {
  const out: string[] = [];
  for (const ch of lowercase) {
    const upper = ch.toUpperCase();
    for (let i = 0; i < repeats; i++) {
      if (mode === "lower-upper") {
        out.push(ch, upper);
      } else if (mode === "upper-lower") {
        out.push(upper, ch);
      } else {
        out.push(i % 2 === 0 ? ch : upper);
        out.push(i % 2 === 0 ? upper : ch);
      }
    }
  }
  return { text: out.join(" "), keys: out };
}

export function generateShiftSentenceDrill(
  words: string[],
): GeneratedDrill {
  const out: string[] = [];
  for (const w of words) {
    out.push(w);
  }
  return { text: out.join(" "), keys: out };
}

export function generateNumberDrill(
  digits: string[],
  length: number,
): GeneratedDrill {
  const out: string[] = [];
  for (let i = 0; i < length; i++) {
    out.push(digits[i % digits.length]);
  }
  return { text: out.join(" "), keys: out };
}

export function generateAlternatingNumberDrill(
  leftDigits: string[],
  rightDigits: string,
  pairsCount: number,
): GeneratedDrill {
  const out: string[] = [];
  for (let i = 0; i < pairsCount; i++) {
    out.push(leftDigits[i % leftDigits.length]);
    out.push(rightDigits);
  }
  return { text: out.join(" "), keys: out };
}

export function generateWordDrill(
  wordList: WordList,
  count: number,
  seed: number = 42,
): GeneratedDrill {
  const filtered = wordList.words.filter((w) => {
    if (wordList.maxWordLength && w.length > wordList.maxWordLength) return false;
    if (wordList.minLetters) {
      for (const ch of w.toLowerCase()) {
        if (ch !== " " && !wordList.minLetters.includes(ch)) return false;
      }
    }
    return true;
  });
  const shuffled = shuffle(filtered, seed);
  const out: string[] = [];
  for (let i = 0; i < count && i < shuffled.length; i++) {
    out.push(shuffled[i]);
  }
  return { text: out.join(" "), keys: out };
}

export function generateConstrainedDrill(config: DrillConfig): GeneratedDrill {
  const { allowedKeys, length, constraints, layout } = config;
  const fingerMap: Record<string, FingerId> = {};
  for (const k of allowedKeys) {
    const lookup = layout.lookupChar(k);
    if (lookup) fingerMap[k] = lookup.finger;
  }

  const out: string[] = [];
  let prevHand: Hand | null = null;
  let sameHandCount = 0;
  let consecCount = 0;
  let lastKey = "";

  for (let i = 0; i < length; i++) {
    const excludeSet = new Set(constraints.exclude ?? []);
    // same-key repetition limit is always satisfiable as long as any other key
    // exists, so it is applied at every relaxation level.
    const repeatOk = (k: string) => !(k === lastKey && consecCount >= constraints.maxConsecutive);
    const handOk = (k: string) => {
      const h = handOf(k, fingerMap);
      if (constraints.requireAlternation && h === prevHand) return false;
      if (constraints.sameHandMax > 0 && h === prevHand && sameHandCount >= constraints.sameHandMax) return false;
      return true;
    };
    let candidates = allowedKeys.filter((k) => !excludeSet.has(k) && repeatOk(k) && handOk(k));
    // If the hand-based constraints are unsatisfiable for this key set (e.g.
    // every allowed key belongs to one hand while sameHandMax is low), relax
    // them rather than dropping the same-key safety rule, which would produce
    // illegal runs.
    if (candidates.length === 0) {
      candidates = allowedKeys.filter((k) => !excludeSet.has(k) && repeatOk(k));
    }
    if (candidates.length === 0) candidates = allowedKeys.filter((k) => !excludeSet.has(k));
    if (constraints.mustInclude) {
      const mustHave = constraints.mustInclude.filter((k) => !out.includes(k));
      if (mustHave.length > 0 && i < length - mustHave.length) {
        candidates = mustHave;
      }
    }

    const idx = ((i * 2654435761) >>> 0) % candidates.length;
    const chosen = candidates[idx];

    if (chosen === lastKey) {
      consecCount++;
    } else {
      consecCount = 1;
    }

    const h = handOf(chosen, fingerMap);
    if (h === prevHand) {
      sameHandCount++;
    } else {
      sameHandCount = 1;
    }
    prevHand = h;
    lastKey = chosen;
    out.push(chosen);
  }

  return { text: out.join(" "), keys: out };
}

export function generateRowTransitionDrill(
  homeRowKeys: string[],
  otherRowKeys: string[],
  pairsCount: number,
): GeneratedDrill {
  const out: string[] = [];
  const homeLeft = homeRowKeys.slice(0, 5);
  const homeRight = homeRowKeys.slice(5);
  const otherLeft = otherRowKeys.slice(0, Math.ceil(otherRowKeys.length / 2));
  const otherRight = otherRowKeys.slice(Math.ceil(otherRowKeys.length / 2));

  for (let i = 0; i < pairsCount; i++) {
    const useLeft = i % 2 === 0;
    if (useLeft) {
      out.push(homeLeft[i % homeLeft.length]);
      out.push(otherLeft[i % otherLeft.length]);
    } else {
      out.push(homeRight[i % homeRight.length]);
      out.push(otherRight[i % otherRight.length]);
    }
  }
  return { text: out.join(" "), keys: out };
}

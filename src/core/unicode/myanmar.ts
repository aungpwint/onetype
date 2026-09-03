export const MYANMAR_BASE_MIN = 0x1000;
export const MYANMAR_BASE_MAX = 0x109f;

export function isMyanmarCodePoint(code: number): boolean {
  return code >= MYANMAR_BASE_MIN && code <= MYANMAR_BASE_MAX;
}

export function containsMyanmar(text: string): boolean {
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    if (isMyanmarCodePoint(code)) return true;
  }
  return false;
}

export function detectLanguage(text: string): "myanmar" | "english" {
  return containsMyanmar(text) ? "myanmar" : "english";
}

export function toUnicodeLabels(text: string): string[] {
  return Array.from(text).map((ch) => `U+${(ch.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, "0")}`);
}

export function charNames(text: string): string[] {
  return Array.from(text).map((ch) => {
    const cp = ch.codePointAt(0) ?? 0;
    return `U+${cp.toString(16).padStart(4, "0")}`;
  });
}

// --- Myanmar syllable cluster segmentation ---------------------------------
//
// A typing system for Myanmar needs to treat a full syllable cluster (base
// consonant + medials + vowel signs + asat/kinzi/stacking + tone marks) as a
// single deletion unit, otherwise Backspace would erase one combining mark at
// a time. The generic Intl.Segmenter does not always group this correctly
// (e.g. the preposed vowel U+1031 is left standalone), so we implement the
// canonical Myanmar syllable-break rules here.

/**
 * Characters that, as a class, start or continue Myanmar syllables. We operate
 * on code points so surrogate pairing is handled correctly.
 */
const RE_CONSONANT = /[\u1000-\u1021\u1023-\u1027\u1029-\u102A\u103F]/;
const RE_ATTACHING = /[\u102B-\u1032\u1036-\u103E]/;
const PREPOSED_VOWEL = 0x1031; // ေ

/**
 * Split Myanmar text into syllable clusters. Each returned cluster is a string
 * that the learner should perceive (and delete) as a single unit.
 */
export function splitMyanmarSyllables(text: string): string[] {
  const chars = Array.from(text);
  const out: string[] = [];
  let current = "";
  let pending = ""; // holds a preposed vowel to be merged into the next cluster

  for (let i = 0; i < chars.length; i++) {
    const code = chars[i].codePointAt(0) ?? 0;
    const prev = i > 0 ? (chars[i - 1].codePointAt(0) ?? 0) : 0;
    const next = i + 1 < chars.length ? (chars[i + 1].codePointAt(0) ?? 0) : 0;

    if (code === PREPOSED_VOWEL) {
      // ေ precedes its base consonant; hold it and merge into the next cluster.
      pending += chars[i];
      continue;
    }

    if (isSyllableStart(code, prev, next)) {
      if (current.length > 0) out.push(current);
      current = pending + chars[i];
      pending = "";
    } else {
      current += chars[i];
    }
  }
  if (pending.length > 0) current += pending;
  if (current.length > 0) out.push(current);
  return out;
}

/**
 * Whether the code point `code` begins a new Myanmar syllable, given the
 * preceding (`prev`) and following (`next`) code points.
 */
function isSyllableStart(code: number, prev: number, next: number): boolean {
  // Base consonants (and vowel-letter bases like ဣ ဤ ဥ ဦ ဧ ဩ ဿ) attach any
  // cluster-internal marks.
  if (RE_CONSONANT.test(String.fromCodePoint(code))) {
    // Final consonants (followed by asat U+103A) and stacked consonants
    // (following virama U+1039 / asat U+103A) continue the previous cluster.
    if (next === 0x103a) return false;
    if (prev === 0x103a || prev === 0x1039) return false;
    // A consonant directly after a consonant starts a new syllable, unless the
    // preceding one already carried a vowel (handled by the independent rules).
    return true;
  }
  // Medials and vowel signs always attach to the current cluster.
  if (RE_ATTACHING.test(String.fromCodePoint(code))) return false;
  // Anything else (punctuation, whitespace, digits) starts a new group.
  return true;
}
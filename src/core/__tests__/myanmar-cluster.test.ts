import { describe, expect, it } from "vitest";
import { splitMyanmarSyllables } from "../unicode/myanmar";
import { buildSequence, clusterStartForUnit } from "../typing-engine/sequence";
import { myanmar3 } from "../keyboard-layout/myanmar3";
import { englishQwerty } from "../keyboard-layout/english-qwerty";

describe("Myanmar syllable cluster segmentation", () => {
  it("groups a base consonant with its medials, vowels and tone marks into one cluster", () => {
    // "ကျောင့်း" = ေ + က + ျ + င + ၚ-asat + း
    const word = "\u1031\u1000\u103B\u1004\u103A\u1038";
    expect(splitMyanmarSyllables(word)).toEqual([word]);
  });

  it("keeps preposed vowel U+1031 attached to its following consonant cluster", () => {
    // "ေ" + "က" must not be split.
    const preposed = "\u1031\u1000\u103B\u102C";
    const clusters = splitMyanmarSyllables(preposed);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]).toBe(preposed);
  });

  it("keeps a final consonant (followed by asat) inside its syllable", () => {
    // "ငြိမ်" = င + ြ + ိ + မ + ၚ-asat -> one cluster
    const finalConsonant = "\u1004\u103C\u102D\u1019\u103A";
    expect(splitMyanmarSyllables(finalConsonant)).toEqual([finalConsonant]);
  });

  it("groups stacked and kinzi clusters as a single unit", () => {
    // "က္ခ" (stacked) = က + ္ + ခ
    expect(splitMyanmarSyllables("\u1000\u1039\u1001")).toEqual(["\u1000\u1039\u1001"]);
    // "င်္ခ" (kinzi) = င + ၚ-asat + ္ + ခ
    expect(splitMyanmarSyllables("\u1004\u103A\u1039\u1001")).toEqual(["\u1004\u103A\u1039\u1001"]);
  });

  it("splits two independent syllables", () => {
    // "ကမ္ဘာ" = က + မ + ္ + ဘ + ာ -> [က, မ္ဘာ]
    expect(splitMyanmarSyllables("\u1000\u1019\u1039\u1018\u102C")).toEqual(["\u1000", "\u1019\u1039\u1018\u102C"]);
  });

  it("concatenation property: rejoining clusters yields the original text", () => {
    const text = "\u1000\u102D \u101E\u102F\u1036 \u1031\u1000\u103B\u102C";
    expect(splitMyanmarSyllables(text).join("")).toBe(text);
  });

  it("returns non-Myanmar characters as their own clusters", () => {
    expect(splitMyanmarSyllables("a1 \u1000\u102C")).toEqual(["a", "1", " ", "\u1000\u102C"]);
  });
});

describe("Myanmar sequence cluster boundaries", () => {
  it("maps each Myanmar syllable cluster to one grapheme range", () => {
    // "ကာ" (1 unit) + " " (1 unit) + "သုံ" (3 units) -> 6 units across 3 graphemes
    const seq = buildSequence("\u1000\u102C \u101E\u102F\u1036", myanmar3);
    expect(seq.graphemes).toHaveLength(3);
    expect(seq.graphemeUnitRanges).toEqual([
      [0, 2],
      [2, 3],
      [3, 6],
    ]);
  });

  it("clusterStartForUnit returns the start of the owning cluster", () => {
    const seq = buildSequence("\u1000\u102C \u101E\u102F\u1036", myanmar3);
    // Mid-way through "သုံ" (start unit 3), the preceding cluster starts at 3.
    expect(clusterStartForUnit(seq, 5)).toBe(3);
    // Before the second cluster's final unit.
    expect(clusterStartForUnit(seq, 4)).toBe(3);
    // For the first cluster.
    expect(clusterStartForUnit(seq, 2)).toBe(0);
    expect(clusterStartForUnit(seq, 1)).toBe(0);
    expect(clusterStartForUnit(seq, 0)).toBe(0);
  });

  it("clusterStartForUnit is a no-op stepping one unit for English", () => {
    const seq = buildSequence("fj", englishQwerty);
    for (let i = 1; i <= 2; i++) {
      expect(clusterStartForUnit(seq, i)).toBe(i - 1);
    }
  });
});

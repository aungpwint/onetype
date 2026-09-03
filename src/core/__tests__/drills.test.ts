import { describe, expect, it } from "vitest";
import {
  generateRepetitionDrill,
  generatePairDrill,
  generateFingerIsolationDrill,
  generateAlternationDrill,
  generateSameHandDrill,
  generateShiftDrill,
  generateShiftSentenceDrill,
  generateNumberDrill,
  generateAlternatingNumberDrill,
  generateWordDrill,
  generateConstrainedDrill,
  generateRowTransitionDrill,
} from "../drills/generator";
import {
  HOME_ROW_KEYS,
  TOP_ROW_KEYS,
  DEFAULT_ENGLISH_CONSTRAINTS,
} from "../drills/types";
import type { DrillConfig, WordList } from "../drills/types";
import { englishQwerty } from "../keyboard-layout/english-qwerty";
import { handForFinger } from "../finger-mapping/finger-map";
import type { FingerId } from "../../types";

// Build a character -> finger map for the English layout, matching how the
// drills generators use `layout.lookupChar(ch).finger`.
const fingerMap: Record<string, FingerId> = {};
for (const row of englishQwerty.rows) {
  for (const key of row) {
    if (key.plain === undefined) continue;
    fingerMap[key.plain] = key.finger;
  }
}

function charHand(ch: string): "left" | "right" {
  return handForFinger(fingerMap[ch]);
}

describe("muscle-memory drill generators", () => {
  describe("generateRepetitionDrill", () => {
    it("repeats each key the requested number of times in order", () => {
      const drill = generateRepetitionDrill(["a", "s"], 3);
      expect(drill.keys).toEqual(["a", "a", "a", "s", "s", "s"]);
      expect(drill.text).toBe("a a a s s s");
    });

    it("honours a custom separator", () => {
      const drill = generateRepetitionDrill(["f"], 2, "");
      expect(drill.text).toBe("ff");
    });
  });

  describe("generatePairDrill", () => {
    it("interleaves each pair the requested number of times", () => {
      const drill = generatePairDrill([["f", "j"]], 2);
      expect(drill.keys).toEqual(["f", "j", "f", "j"]);
      expect(drill.text).toBe("f j f j");
    });
  });

  describe("generateFingerIsolationDrill", () => {
    it("emits mostly keys of the target finger and returns an empty drill when the finger owns none", () => {
      // `length` is the number of target-finger key repetitions; one non-target
      // key is occasionally interspersed (every 4th), so the output is >= length.
      const drill = generateFingerIsolationDrill("left-index", ["r", "t", "f", "g", "v", "b", "a"], fingerMap, 12);
      expect(drill.keys.length).toBeGreaterThanOrEqual(12);
      const nonTarget = drill.keys.filter((k) => fingerMap[k] !== "left-index");
      // At most one non-target key thrown in for every block of ~4 target keys.
      expect(nonTarget.length).toBeLessThanOrEqual(Math.ceil(drill.keys.length / 4));
      const targetCount = drill.keys.filter((k) => fingerMap[k] === "left-index").length;
      expect(targetCount).toBeGreaterThanOrEqual(12);
      // First emitted is always a target-finger key.
      expect(fingerMap[drill.keys[0]]).toBe("left-index");

      const empty = generateFingerIsolationDrill("left-thumb", ["a"], fingerMap, 10);
      expect(empty.keys).toEqual([]);
      expect(empty.text).toBe("");
    });
  });

  describe("generateAlternationDrill", () => {
    it("alternates between a left-hand and a right-hand key", () => {
      const left = ["f", "a"];
      const right = ["j", "k"];
      const drill = generateAlternationDrill(left, right, 8);
      expect(drill.keys.length).toBe(16);
      for (let i = 0; i < drill.keys.length; i++) {
        const expected = i % 2 === 0 ? "left" : "right";
        expect(charHand(drill.keys[i])).toBe(expected);
      }
    });
  });

  describe("generateSameHandDrill", () => {
    it("only produces keys from the provided set", () => {
      const drill = generateSameHandDrill(TOP_ROW_KEYS, 4, 3);
      expect(drill.keys).toHaveLength(12);
      for (const k of drill.keys) {
        expect(TOP_ROW_KEYS).toContain(k);
      }
    });
  });

  describe("generateShiftDrill", () => {
    it("produces lowercase/uppercase pairs per mode", () => {
      const lowerUpper = generateShiftDrill(["a"], 2, "lower-upper");
      expect(lowerUpper.keys).toEqual(["a", "A", "a", "A"]);

      const upperLower = generateShiftDrill(["a"], 2, "upper-lower");
      expect(upperLower.keys).toEqual(["A", "a", "A", "a"]);
    });
  });

  describe("generateShiftSentenceDrill", () => {
    it("joins words with spaces preserving case", () => {
      const drill = generateShiftSentenceDrill(["The", "quick", "Fox"]);
      expect(drill.text).toBe("The quick Fox");
    });
  });

  describe("generateNumberDrill", () => {
    it("cycles through the supplied digits to the requested length", () => {
      const drill = generateNumberDrill(["1", "2", "3"], 5);
      expect(drill.keys).toEqual(["1", "2", "3", "1", "2"]);
    });
  });

  describe("generateAlternatingNumberDrill", () => {
    it("alternates left digits with a fixed right digit", () => {
      const drill = generateAlternatingNumberDrill(["1", "3"], "6", 2);
      expect(drill.keys).toEqual(["1", "6", "3", "6"]);
    });
  });

  describe("generateWordDrill", () => {
    const list: WordList = { words: ["cat", "dog", "elephant", "ok"], minLetters: ["a", "c", "t", "d", "o", "g"] };
    it("filters words that contain banned letters and caps word length", () => {
      const capped: WordList = { words: ["cat", "dog", "elephant"], maxWordLength: 4 };
      const drill = generateWordDrill(capped, 10);
      expect(drill.keys).toEqual(["cat", "dog"]); // 'elephant' filtered out (>4 letters)
    });

    it("is deterministic for the same seed", () => {
      const a = generateWordDrill(list, 2, 7);
      const b = generateWordDrill(list, 2, 7);
      expect(a.keys).toEqual(b.keys);
    });

    it("keeps only words whose letters are all in minLetters when provided", () => {
      const out = generateWordDrill(list, 10, 1).text.split(" ");
      for (const word of out) {
        for (const ch of word) {
          expect(["a", "c", "t", "d", "o", "g"]).toContain(ch);
        }
      }
    });
  });

  describe("generateConstrainedDrill", () => {
    // Mix of left- and right-hand keys so hand-based constraints are satisfiable.
    const allowed = ["a", "s", "d", "f", "g", "j", "k", "l", ";"];
    function config(over: Partial<DrillConfig> = {}): DrillConfig {
      return {
        layout: englishQwerty,
        allowedKeys: allowed,
        length: 20,
        difficulty: 1,
        constraints: { ...DEFAULT_ENGLISH_CONSTRAINTS, ...over.constraints },
        ...over,
      };
    }

    it("respects maxConsecutive for repeated keys", () => {
      const cfg = config({ constraints: { ...DEFAULT_ENGLISH_CONSTRAINTS, maxConsecutive: 2 } });
      const drill = generateConstrainedDrill(cfg);
      let run = 1;
      for (let i = 1; i < drill.keys.length; i++) {
        run = drill.keys[i] === drill.keys[i - 1] ? run + 1 : 1;
        expect(run).toBeLessThanOrEqual(2);
      }
    });

    it("never exceeds sameHandMax consecutive same-hand keys", () => {
      const cfg = config({ constraints: { ...DEFAULT_ENGLISH_CONSTRAINTS, sameHandMax: 2 } });
      const drill = generateConstrainedDrill(cfg);
      let run = 1;
      for (let i = 1; i < drill.keys.length; i++) {
        run = charHand(drill.keys[i]) === charHand(drill.keys[i - 1]) ? run + 1 : 1;
        expect(run).toBeLessThanOrEqual(2);
      }
    });

    it("requires strict alternation when requireAlternation is set", () => {
      const cfg = config({ constraints: { ...DEFAULT_ENGLISH_CONSTRAINTS, requireAlternation: true } });
      const drill = generateConstrainedDrill(cfg);
      for (let i = 1; i < drill.keys.length; i++) {
        expect(charHand(drill.keys[i])).not.toBe(charHand(drill.keys[i - 1]));
      }
    });

    it("excludes banned keys", () => {
      const drill = generateConstrainedDrill(
        config({ allowedKeys: "abcdefghijklmnopqrstuvwxyz".split(""), constraints: { ...DEFAULT_ENGLISH_CONSTRAINTS, exclude: ["a"] }, length: 40 }),
      );
      expect(drill.keys).not.toContain("a");
    });

    it("includes every required key at least once when segment is long enough", () => {
      const cfg = config({ constraints: { ...DEFAULT_ENGLISH_CONSTRAINTS, mustInclude: ["g"] }, length: 30 });
      const drill = generateConstrainedDrill(cfg);
      expect(drill.keys).toContain("g");
    });

    it("keeps the same-key rule after the hand-constraint fallback on a single-hand key set", () => {
      // A homogeneous (all left-hand) key set makes sameHandMax unsatisfiable;
      // the generator must relax the hand rule without violating maxConsecutive.
      const singleHand = ["a", "s", "d", "f", "g"];
      const drill = generateConstrainedDrill({
        layout: englishQwerty,
        allowedKeys: singleHand,
        length: 30,
        difficulty: 1,
        constraints: { ...DEFAULT_ENGLISH_CONSTRAINTS, maxConsecutive: 2, sameHandMax: 1 },
      });
      let run = 1;
      for (let i = 1; i < drill.keys.length; i++) {
        run = drill.keys[i] === drill.keys[i - 1] ? run + 1 : 1;
        expect(run).toBeLessThanOrEqual(2);
      }
    });
  });

  describe("generateRowTransitionDrill", () => {
    it("alternates a home-row key with a top-row key per hand", () => {
      const drill = generateRowTransitionDrill(HOME_ROW_KEYS, TOP_ROW_KEYS, 6);
      expect(drill.keys.length).toBe(12);
      const hasHome = drill.keys.some((k) => HOME_ROW_KEYS.includes(k));
      const hasTop = drill.keys.some((k) => TOP_ROW_KEYS.includes(k));
      expect(hasHome).toBe(true);
      expect(hasTop).toBe(true);
    });

    it("never mixes hands within a single emitted pair", () => {
      const drill = generateRowTransitionDrill(HOME_ROW_KEYS, TOP_ROW_KEYS, 6);
      for (let i = 0; i + 1 < drill.keys.length; i += 2) {
        expect(charHand(drill.keys[i])).toBe(charHand(drill.keys[i + 1]));
      }
    });
  });
});

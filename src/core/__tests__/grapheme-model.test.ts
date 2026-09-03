import { describe, expect, it } from "vitest";
import { buildSequence } from "../typing-engine/sequence";
import { englishQwerty } from "../keyboard-layout/english-qwerty";
import { myanmar3 } from "../keyboard-layout/myanmar3";
import { splitGraphemes } from "../unicode/graphemes";
import { shiftHandFor } from "../keyboard-layout/layout";

describe("typing unit model", () => {
  it("maps English lowercase to single units with correct hand/finger", () => {
    const seq = buildSequence("fj", englishQwerty);
    expect(seq.units).toHaveLength(2);
    expect(seq.units[0].hand).toBe("left");
    expect(seq.units[0].finger).toBe("left-index");
    expect(seq.units[1].hand).toBe("right");
    expect(seq.units[1].finger).toBe("right-index");
    expect(seq.units[0].shiftHand).toBeNull();
    expect(seq.units[1].shiftHand).toBeNull();
  });

  it("reports correct shiftHand for uppercase letters", () => {
    const seq = buildSequence("A", englishQwerty);
    const unit = seq.units[0];
    expect(unit.modifier).toBe("shift");
    expect(unit.hand).toBe("left");
    expect(unit.shiftHand).toBe("right");
  });

  it("derives shiftHand consistently with shiftHandFor", () => {
    const seq = buildSequence("Aa", englishQwerty);
    expect(seq.units[0].shiftHand).toBe(shiftHandFor("left"));
    expect(seq.units[1].shiftHand).toBeNull();
    const right = buildSequence("Z", englishQwerty);
    expect(right.units[0].shiftHand).toBe(shiftHandFor("left"));
    const left = buildSequence("M", englishQwerty);
    expect(left.units[0].shiftHand).toBe(shiftHandFor("right"));
  });

  it("maps Myanmar combining sequences onto one typing unit per code point", () => {
    const word = "\u1031\u1000\u103B\u102C\u1004\u103A\u1038";
    const seq = buildSequence(word, myanmar3);
    expect(seq.units.map((u) => u.keyCode)).toEqual(["KeyA", "KeyU", "KeyS", "KeyM", "KeyI", "KeyF", "Semicolon"]);
    expect(seq.units.map((u) => u.text).join("")).toBe(word);
  });

  it("keeps grapheme grouping intact for Myanmar", () => {
    const word = "\u1031\u1000\u103B\u102C" as const;
    const graphemes = splitGraphemes(word);
    expect(graphemes.join("")).toBe(word);
    const seq = buildSequence(word, myanmar3);
    const expectedKeyCodes = ["KeyA", "KeyU", "KeyS", "KeyM"];
    expect(seq.graphemes.join("")).toBe(word);
    expect(seq.units.map((u) => u.keyCode)).toEqual(expectedKeyCodes);
    const rangesSum = seq.graphemeUnitRanges.reduce((acc, [s, e]) => acc + (e - s), 0);
    expect(rangesSum).toBe(seq.units.length);
    for (const unit of seq.units) {
      expect(unit.hand === "left" || unit.hand === "right").toBe(true);
    }
  });

  it("handles stacked Myanmar consonants as separate units", () => {
    const stacked = "\u1018\u1039\u1018\u102C" as const;
    const seq = buildSequence(stacked, myanmar3);
    expect(seq.units.length).toBeGreaterThanOrEqual(4);
    for (const unit of seq.units) {
      expect(unit.keyCode).toBeTruthy();
      expect(unit.hand === "left" || unit.hand === "right").toBe(true);
      expect(unit.finger).toBeTruthy();
    }
  });
});

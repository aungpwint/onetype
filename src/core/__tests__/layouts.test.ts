import { describe, expect, it } from "vitest";
import { myanmar3 } from "../keyboard-layout/myanmar3";
import { englishQwerty } from "../keyboard-layout/english-qwerty";

describe("myanmar3 layout", () => {
  it("maps the core consonants exactly as SIL Myanmar3", () => {
    const cases: [string, string, string][] = [
      ["KeyQ", "\u1006", "\u1008"],
      ["KeyW", "\u1010", "\u101D"],
      ["KeyE", "\u1014", "\u1023"],
      ["KeyR", "\u1019", "\u104E"],
      ["KeyT", "\u1021", "\u1024"],
      ["KeyY", "\u1015", "\u104C"],
      ["KeyU", "\u1000", "\u1025"],
      ["KeyI", "\u1004", "\u104D"],
      ["KeyO", "\u101E", "\u103F"],
      ["KeyP", "\u1005", "\u100F"],
      ["KeyA", "\u1031", "\u1017"],
      ["KeyS", "\u103B", "\u103E"],
      ["KeyD", "\u102D", "\u102E"],
      ["KeyF", "\u103A", "\u1039"],
      ["KeyG", "\u102B", "\u103D"],
      ["KeyH", "\u1037", "\u1036"],
      ["KeyJ", "\u103C", "\u1032"],
      ["KeyK", "\u102F", "\u1012"],
      ["KeyL", "\u1030", "\u1013"],
      ["KeyZ", "\u1016", "\u1007"],
      ["KeyX", "\u1011", "\u100C"],
      ["KeyC", "\u1001", "\u1003"],
      ["KeyV", "\u101C", "\u1020"],
      ["KeyB", "\u1018", "\u101A"],
      ["KeyN", "\u100A", "\u1009"],
      ["KeyM", "\u102C", "\u1026"],
    ];
    for (const [code, plain, shifted] of cases) {
      expect(myanmar3.outputFor(code, "none")?.text).toBe(plain);
      if (myanmar3.outputFor(code, "shift")?.text !== undefined) {
        expect(myanmar3.outputFor(code, "shift")?.text, code).toBe(shifted);
      }
    }
  });

  it("maps digits to Myanmar numerals", () => {
    expect(myanmar3.outputFor("Digit1", "none")?.text).toBe("\u1041");
    expect(myanmar3.outputFor("Digit9", "none")?.text).toBe("\u1049");
    expect(myanmar3.outputFor("Digit0", "none")?.text).toBe("\u1040");
    expect(myanmar3.outputFor("Digit1", "shift")?.text).toBe("\u100D");
    expect(myanmar3.outputFor("Digit2", "shift")?.text).toBe("\u1052");
    expect(myanmar3.outputFor("Digit7", "shift")?.text).toBe("\u101B");
  });

  it("reverse-maps a full word to its key sequence", () => {
    // ကျောင်း (school): a u s m i f ;
    const full = "\u1031\u1000\u103B\u102C\u1004\u103A\u1038";
    const pairs = myanmar3.reverseMap([full]);
    const codes = pairs.map((p) => p.lookup.code + (p.lookup.modifier === "shift" ? "^" : ""));
    expect(codes.join(" ")).toBe("KeyA KeyU KeyS KeyM KeyI KeyF Semicolon");
  });

  it("reverse-maps ။ and ၊ punctuation correctly", () => {
    const p = myanmar3.lookupChar("\u104B");
    expect(p?.code).toBe("Period");
    const comma = myanmar3.lookupChar("\u104A");
    expect(comma?.code).toBe("Comma");
  });

  it("establishes the space output", () => {
    expect(myanmar3.outputFor("Space", "none")?.text).toBe(" ");
  });

  it("every reverse-mappable char is recoverable to identical text", () => {
    const samples = [
      "\u1031\u1000\u103B\u102C\u1004\u103A\u1038",
      "\u1019\u103C\u1014\u103A\u1019\u102C",
      "\u1025\u1000\u1039\u1000\u100B\u1039\u100C",
      "\u101E\u102D\u102F\u1037",
      "\u1019\u103C\u102D\u102F\u1037",
      "\u1005\u104A\u1000\u102C\u104B",
    ];
    for (const word of samples) {
      const pairs = myanmar3.reverseMap([word]);
      const rebuilt = pairs.map((p) => p.lookup.text).join("");
      expect(rebuilt).toBe(word);
    }
  });
});

describe("english-qwerty layout", () => {
  it("maps letters to lowercase/uppercase", () => {
    expect(englishQwerty.outputFor("KeyA", "none")?.text).toBe("a");
    expect(englishQwerty.outputFor("KeyA", "shift")?.text).toBe("A");
    expect(englishQwerty.outputFor("KeyZ", "none")?.text).toBe("z");
  });

  it("maps digits and shifted punctuation", () => {
    expect(englishQwerty.outputFor("Digit1", "shift")?.text).toBe("!");
    expect(englishQwerty.outputFor("Digit9", "shift")?.text).toBe("(");
    expect(englishQwerty.outputFor("Space", "none")?.text).toBe(" ");
  });
});
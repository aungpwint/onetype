import { describe, expect, it } from "vitest";
import { splitGraphemes, graphemeCount } from "../unicode/graphemes";
import { containsMyanmar, detectLanguage } from "../unicode/myanmar";

describe("grapheme segmentation", () => {
  it("splits ASCII into single graphemes", () => {
    expect(splitGraphemes("abc")).toEqual(["a", "b", "c"]);
  });

  it("collects combining marks with their base", () => {
    const clusters = splitGraphemes("\u1000\u102D\u102F\u1037");
    expect(clusters.length).toBe(1);
    expect(clusters[0]).toBe("\u1000\u102D\u102F\u1037");
  });

  it("counts graphemes correctly for English", () => {
    expect(graphemeCount("hello world")).toBe(11);
  });
});

describe("myanmar helpers", () => {
  it("detects Myanmar text", () => {
    expect(containsMyanmar("မြန်မာ english")).toBe(true);
    expect(containsMyanmar("hello")).toBe(false);
  });

  it("detects language of a sample", () => {
    expect(detectLanguage("မင်္ဂလာပါ")).toBe("myanmar");
    expect(detectLanguage("Hello")).toBe("english");
  });
});
import { describe, it, expect } from "vitest";
import { buildTestMaterial } from "../materials/test-material";
import { getLayoutOrThrow } from "../keyboard-layout/registry";
import type { TypingTest } from "../../services/types";

function makeTest(overrides: Partial<TypingTest> = {}): TypingTest {
  return {
    id: "t-sandbox",
    code: "t-sandbox",
    name: "Sandbox test",
    durationSeconds: 60,
    language: "myanmar",
    layoutId: "myanmar3",
    minAccuracy: 80,
    minWpm: 20,
    contentVersion: 1,
    ...overrides,
  };
}

describe("buildTestMaterial", () => {
  it("builds a resolved lesson whose every unit maps to a key in the layout", () => {
    for (const language of ["myanmar", "english", "mixed"] as const) {
      const layoutId = language === "english" ? "english-qwerty" : "myanmar3";
      const material = buildTestMaterial(makeTest({ language, layoutId }));
      const layout = getLayoutOrThrow(layoutId);
      expect(material.totalUnits).toBeGreaterThan(0);
      for (const unit of material.sequence.units) {
        expect(layout.getKey(unit.keyCode)).toBeDefined();
        expect(unit.grapheme.length).toBeGreaterThan(0);
      }
      expect(material.phases.length).toBeGreaterThan(0);
    }
  });

  it("scales material size with the test duration", () => {
    const short = buildTestMaterial(makeTest({ id: "t-short", durationSeconds: 60 }));
    const long = buildTestMaterial(makeTest({ id: "t-long", durationSeconds: 600 }));
    expect(long.sequence.units.length).toBeGreaterThan(short.sequence.units.length);
  });
});
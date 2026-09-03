import { describe, expect, it } from "vitest";
import { englishQwerty } from "../keyboard-layout/english-qwerty";
import {
  parseKeyId,
  keyIdToChar,
  focusCharsFromWeakKeys,
  focusCharsFromWeakFingers,
  reinforcementFromWeakKeys,
  reinforcementFromWeakFingers,
  planWeakestReinforcement,
} from "../reinforcement";

describe("parseKeyId", () => {
  it("parses code and modifier", () => {
    expect(parseKeyId("KeyA:none")).toEqual({ code: "KeyA", modifier: "none" });
    expect(parseKeyId("KeyJ:shift")).toEqual({ code: "KeyJ", modifier: "shift" });
  });

  it("defaults modifier to none when absent", () => {
    expect(parseKeyId("KeyA")).toEqual({ code: "KeyA", modifier: "none" });
  });

  it("falls back to none for unknown modifiers", () => {
    expect(parseKeyId("KeyB:meta")).toEqual({ code: "KeyB", modifier: "none" });
  });
});

describe("keyIdToChar", () => {
  it("maps plain and shifted key ids to their characters", () => {
    expect(keyIdToChar("KeyA:none")).toBe("a");
    expect(keyIdToChar("KeyA:shift")).toBe("A");
    expect(keyIdToChar("KeyJ:shift")).toBe("J");
  });

  it("maps the space key", () => {
    expect(keyIdToChar("Space:none")).toBe(" ");
  });

  it("returns undefined for unmappable ids", () => {
    expect(keyIdToChar("F13:none")).toBeUndefined();
  });
});

describe("focusCharsFromWeakKeys", () => {
  it("sorts weakest-first and maps to characters", () => {
    const chars = focusCharsFromWeakKeys([
      { key: "KeyB:none", lowerBound: 0.3 },
      { key: "KeyA:none", lowerBound: 0.1 },
      { key: "KeyC:none", lowerBound: 0.2 },
    ]);
    expect(chars).toEqual(["a", "c", "b"]);
  });

  it("dedupes repeated weak keys", () => {
    const chars = focusCharsFromWeakKeys([
      { key: "KeyA:none", lowerBound: 0.1 },
      { key: "KeyA:none", lowerBound: 0.2 },
      { key: "KeyB:none", lowerBound: 0.3 },
    ]);
    expect(chars).toEqual(["a", "b"]);
  });

  it("caps at maxKeys", () => {
    const chars = focusCharsFromWeakKeys(
      [
        { key: "KeyA:none", lowerBound: 0.1 },
        { key: "KeyB:none", lowerBound: 0.2 },
        { key: "KeyC:none", lowerBound: 0.3 },
      ],
      { maxKeys: 2 },
    );
    expect(chars).toEqual(["a", "b"]);
  });

  it("skips un-mappable weak ids", () => {
    const chars = focusCharsFromWeakKeys([
      { key: "F13:none", lowerBound: 0.05 },
      { key: "KeyA:none", lowerBound: 0.6 },
    ]);
    expect(chars).toEqual(["a"]);
  });
});

describe("focusCharsFromWeakFingers", () => {
  it("expands a finger to its keys", () => {
    const chars = focusCharsFromWeakFingers(["left-pinky"], { maxKeys: 10 });
    expect(chars).toEqual(["q", "a", "z"]);
  });

  it("dedupes and caps across fingers", () => {
    const chars = focusCharsFromWeakFingers(
      ["left-middle", "left-index"],
      { maxKeys: 3 },
    );
    expect(chars).toEqual(["e", "d", "c"]);
  });
});

describe("reinforcementFromWeakKeys", () => {
  const weak = [
    { key: "KeyA:none", lowerBound: 0.1 },
    { key: "KeyS:none", lowerBound: 0.2 },
  ];

  it("builds an engine-ready drill targeting the weakest keys", () => {
    const drill = reinforcementFromWeakKeys(weak);
    expect(drill.source).toBe("keys");
    expect(drill.targeted).toEqual(["KeyA:none", "KeyS:none"]);
    expect(drill.focusKeys).toEqual(["a", "s"]);
    expect(drill.plan.goal).toBe("finger-isolation");
    expect(drill.plan.sequence.units.length).toBeGreaterThan(0);
    expect(drill.plan.keys).toEqual(expect.arrayContaining(["a", "s"]));
  });

  it("respects an override goal", () => {
    const drill = reinforcementFromWeakKeys(weak, { goal: "repetition" });
    expect(drill.plan.goal).toBe("repetition");
  });

  it("throws when nothing maps to the layout", () => {
    expect(() =>
      reinforcementFromWeakKeys([{ key: "F13:none", lowerBound: 0 }]),
    ).toThrow("no weak keys mapped");
  });
});

describe("reinforcementFromWeakFingers", () => {
  it("builds a drill targeting the weak finger's keys", () => {
    const drill = reinforcementFromWeakFingers(["left-pinky"]);
    expect(drill.source).toBe("fingers");
    expect(drill.targeted).toEqual(["left-pinky"]);
    expect(drill.focusKeys).toEqual(["q", "a", "z"]);
    expect(drill.plan.goal).toBe("finger-isolation");
  });

  it("throws for fingers with no drillable keys", () => {
    expect(() => reinforcementFromWeakFingers(["left-thumb"])).toThrow(
      "no weak fingers carry",
    );
  });
});

describe("planWeakestReinforcement", () => {
  it("feeds rankWeakest-style output straight through", () => {
    const drills = planWeakestReinforcement(
      [
        { key: "KeyD:none", lowerBound: 0.2 },
        { key: "KeyA:none", lowerBound: 0.1 },
      ],
      { goal: "finger-isolation" },
    );
    expect(drills.focusKeys).toEqual(["a", "d"]);
    expect(drills.plan.goal).toBe("finger-isolation");
  });
});

describe("real layout mapping", () => {
  it("mapped chars round-trip through the English layout", () => {
    // Sanity: the characters the module maps back are valid drill focus keys.
    const chars = focusCharsFromWeakKeys([
      { key: "KeyK:none", lowerBound: 0.1 },
      { key: "KeyO:shift", lowerBound: 0.2 },
    ]);
    for (const ch of chars) {
      expect(englishQwerty.lookupChar(ch)).toBeTruthy();
    }
  });
});

import { describe, it, expect } from "vitest";
import { reRankWeak } from "../backend";

/**
 * Parity coverage for the Tauri weak-key/finger re-ranking shim (Phase 21).
 * The Rust `weak_keys`/`weak_fingers` commands return raw rows ordered by naive
 * accuracy with no evidence filter; `reRankWeak` re-ranks them with the same
 * Wilson lower-bound logic + minimum-attempts filter the browser backend uses,
 * so desktop and browser rankings stay identical.
 */

describe("reRankWeak", () => {
  it("excludes single-attempt noise (minimum-attempts evidence filter)", () => {
    // 1 attempt at 100% — insufficient evidence under minAttempts=2.
    const pool = [
      { key: "KeyA", accuracy: 100, attempts: 1 },
      { key: "KeyS", accuracy: 40, attempts: 12 },
      { key: "KeyD", accuracy: 80, attempts: 9 },
    ];
    const result = reRankWeak(pool, 10);
    expect(result.find((k) => k.key === "KeyA")).toBeUndefined();
    expect(result.map((k) => k.key)).toEqual(["KeyS", "KeyD"]);
  });

  it("ranks a lower-accuracy but heavily-evidenced key as weakest", () => {
    const pool = [
      { key: "KeyJ", accuracy: 30, attempts: 4 },
      { key: "KeyF", accuracy: 35, attempts: 40 },
      { key: "KeyK", accuracy: 90, attempts: 50 },
    ];
    const result = reRankWeak(pool, 10);
    expect(result.map((k) => k.key)).toEqual(["KeyJ", "KeyF", "KeyK"]);
    // Round-trip of counts: 30% * 4 = 1.2 correct → rounded to 1 → 25%.
    expect(result[0].accuracy).toBe(25);
  });

  it("applies the requested limit after re-ranking", () => {
    const pool = [
      { key: "KeyA", accuracy: 20, attempts: 6 },
      { key: "KeyB", accuracy: 30, attempts: 6 },
      { key: "KeyC", accuracy: 40, attempts: 6 },
    ];
    const result = reRankWeak(pool, 2);
    expect(result).toHaveLength(2);
    expect(result.map((k) => k.key)).toEqual(["KeyA", "KeyB"]);
  });

  it("keeps negative or zero limits empty", () => {
    const pool = [{ key: "KeyA", accuracy: 20, attempts: 6 }];
    expect(reRankWeak(pool, 0)).toEqual([]);
    expect(reRankWeak(pool, -1)).toEqual([]);
  });

  it("recomputes accuracy as a rounded percentage matching the local backend", () => {
    const pool = [{ key: "KeyP", accuracy: 62.5, attempts: 16 }];
    const result = reRankWeak(pool, 10);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("KeyP");
    expect(result[0].attempts).toBe(16);
    // 62.5% * 16 = 10 correct → accuracy back out = 62.5
    expect(result[0].accuracy).toBeCloseTo(62.5);
  });
});

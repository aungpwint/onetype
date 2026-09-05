import { describe, expect, it } from "vitest";
import {
  LEFT_GEOMETRY,
  RIGHT_GEOMETRY,
  CENTER_GAP,
  MAX_PRESS,
  computeHandLayout,
  fingerRest,
  handArtExtent,
  handToKeyboard,
  keyboardToPixel,
  pressDelta,
  validateHandLayout,
  type KeyAnchor,
  type KeyboardGeometry,
} from "../hand-geometry";

/** Standard QWERTY home row: A..; at 40px pitch, home row centred on Y=400. */
function standardKeyboard(): { kb: KeyboardGeometry; anchors: Map<string, KeyAnchor> } {
  const kb: KeyboardGeometry = { x: 0, y: 0, width: 600, height: 260 };
  const anchors = new Map<string, KeyAnchor>();
  const centers: Record<string, number> = {
    KeyA: 120,
    KeyS: 160,
    KeyD: 200,
    KeyF: 240,
    KeyG: 280,
    KeyH: 320,
    KeyJ: 360,
    KeyK: 400,
    KeyL: 440,
    Semicolon: 480,
  };
  for (const [code, x] of Object.entries(centers)) {
    anchors.set(code, { code, x, y: 400, width: 40 / kb.width, height: 40 / kb.height });
  }
  return { kb, anchors };
}

function homeAnchor(anchors: ReadonlyMap<string, KeyAnchor>, code: string): KeyAnchor {
  const k = anchors.get(code);
  if (!k) throw new Error(`missing fixture anchor ${code}`);
  return k;
}

describe("computeHandLayout", () => {
  const { kb, anchors } = standardKeyboard();
  const f = homeAnchor(anchors, "KeyF");
  const j = homeAnchor(anchors, "KeyJ");

  it("anchors both hands from the measured keyboard geometry with symmetric clearance", () => {
    const layout = computeHandLayout(anchors);
    expect(layout).not.toBeNull();
    if (!layout) return;

    const scale = 40 / LEFT_GEOMETRY.pitch;
    const seam = CENTER_GAP * 40; // 10px

    // Finger tips rest on their home keys, pushed outward by the seam.
    expect(layout.left.x).toBeCloseTo(f.x - LEFT_GEOMETRY.index.x * scale - seam, 1);
    expect(layout.right.x).toBeCloseTo(j.x - RIGHT_GEOMETRY.index.x * scale + seam, 1);

    // The right hand window is the exact mirror of the left about the axis.
    expect(layout.right.x).toBeCloseTo(
      2 * layout.axisX - (layout.left.x + LEFT_GEOMETRY.view.w * scale),
      1,
    );

    expect(layout.axisX).toBeCloseTo((f.x + j.x) / 2, 6);
    expect(layout.pitchPx).toBeCloseTo(40, 6);
    expect(layout.centerGapPx).toBeCloseTo(seam, 6);
  });

  it("rests every finger tip on its home key (keyboard is the source of truth)", () => {
    const layout = computeHandLayout(anchors);
    if (!layout) return;
    expect(fingerRest(layout.left, LEFT_GEOMETRY, "left-pinky").x).toBeCloseTo(120 - 10, 1);
    expect(fingerRest(layout.left, LEFT_GEOMETRY, "left-index").x).toBeCloseTo(240 - 10, 1);
    expect(fingerRest(layout.right, RIGHT_GEOMETRY, "right-index").x).toBeCloseTo(360 + 10, 1);
    expect(fingerRest(layout.right, RIGHT_GEOMETRY, "right-pinky").x).toBeCloseTo(480 + 10, 1);
    for (const [hand, geom, place] of [
      ["left", LEFT_GEOMETRY, layout.left],
      ["right", RIGHT_GEOMETRY, layout.right],
    ] as const) {
      const homeY = fingerRest(place, geom, `${hand}-index`);
      expect(homeY.y).toBeCloseTo(400, 1);
    }
  });

  it("does not collide the two hands' solid art at the axis", () => {
    const layout = computeHandLayout(anchors);
    if (!layout) return;
    const leftArt = handArtExtent(layout.left, LEFT_GEOMETRY);
    const rightArt = handArtExtent(layout.right, RIGHT_GEOMETRY);
    // Symmetric palms keep a clean gap between the thumbs at the axis.
    expect(rightArt.left).toBeGreaterThan(leftArt.right);
    expect(validateHandLayout(layout, kb)).toBe(true);
  });

  it("returns null when the key anchors are not measured", () => {
    const empty = new Map<string, KeyAnchor>();
    expect(computeHandLayout(empty)).toBeNull();
    const partial = new Map<string, KeyAnchor>(anchors);
    partial.delete("KeyF");
    expect(computeHandLayout(partial)).toBeNull();
  });
});

describe("coordinate conversions", () => {
  it("keyboardToPixel lifts keyboard-local points into container space", () => {
    const kb: KeyboardGeometry = { x: 12, y: 34, width: 600, height: 260 };
    expect(keyboardToPixel(kb, { x: 100, y: 200 })).toEqual({ x: 112, y: 234 });
  });

  it("handToKeyboard maps hand-local user units through anchor and scale", () => {
    const place = { x: 24.91, y: 384.26, scale: 1.55844 };
    const p = handToKeyboard(place, { x: 53.4, y: 10.1 });
    expect(p.x).toBeCloseTo(place.x + 53.4 * place.scale, 1);
    expect(p.y).toBeCloseTo(place.y + 10.1 * place.scale, 1);
  });
});

describe("pressDelta", () => {
  const { anchors } = standardKeyboard();

  it("moves toward the target key, clamped to a small travel, never accumulating", () => {
    const layout = computeHandLayout(anchors);
    if (!layout) return;
    const rest = fingerRest(layout.right, RIGHT_GEOMETRY, "right-index");
    const farTarget = { x: rest.x + 500, y: rest.y };
    const travel = MAX_PRESS * RIGHT_GEOMETRY.pitch;

    const first = pressDelta({ geom: RIGHT_GEOMETRY, rest, target: farTarget, scale: layout.right.scale });
    const second = pressDelta({ geom: RIGHT_GEOMETRY, rest, target: farTarget, scale: layout.right.scale });
    // Stateless: identical inputs give identical clamped output (never accumulates).
    expect(first).toEqual(second);
    expect(first.dx).toBeCloseTo(travel, 6);
    expect(Math.abs(first.dx)).toBeLessThanOrEqual(travel);

    // No target ⇒ no motion (exact rest position).
    expect(pressDelta({ geom: RIGHT_GEOMETRY, rest, target: null, scale: 1 })).toEqual({ dx: 0, dy: 0 });
  });

  it("presses home-row keys horizontally, clamped, from the seamed rest position", () => {
    const layout = computeHandLayout(anchors);
    if (!layout) return;
    // Right index rests at KeyJ centre + outward seam → the KeyJ target drives a
    // clamped nudge back toward the key (negative x), with no vertical travel.
    const rest = fingerRest(layout.right, RIGHT_GEOMETRY, "right-index");
    const home = anchors.get("KeyJ")!;
    const d = pressDelta({ geom: RIGHT_GEOMETRY, rest, target: home, scale: layout.right.scale });
    expect(d.dx < 0).toBe(true);
    expect(d.dy).toBeCloseTo(0, 6);
    expect(Math.abs(d.dx)).toBeLessThanOrEqual(MAX_PRESS * RIGHT_GEOMETRY.pitch);
  });

  it("presses top-row keys upward and bottom-row keys downward", () => {
    const layout = computeHandLayout(anchors);
    if (!layout) return;
    const rest = fingerRest(layout.left, LEFT_GEOMETRY, "left-pinky");
    const above = { x: rest.x, y: rest.y - 40 };
    const below = { x: rest.x, y: rest.y + 40 };
    expect(pressDelta({ geom: LEFT_GEOMETRY, rest, target: above, scale: layout.left.scale }).dy).toBeLessThan(0);
    expect(pressDelta({ geom: LEFT_GEOMETRY, rest, target: below, scale: layout.left.scale }).dy).toBeGreaterThan(0);
  });
});
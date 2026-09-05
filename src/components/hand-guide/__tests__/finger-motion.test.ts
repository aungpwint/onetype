import { describe, expect, it } from "vitest";
import {
  LEFT_GEOMETRY,
  RIGHT_GEOMETRY,
  computeHandLayout,
  fingerGeometry,
  handToKeyboard,
  type HandPlacement,
  type KeyAnchor,
  type KeyboardGeometry,
} from "../hand-geometry";
import {
  APPROACH_PEAK,
  FINGER_PROFILES,
  ZERO_TARGET,
  advanceState,
  computeReach,
  envelopeP,
  fingertipPosition,
  needsFrame,
  targetForKey,
  toTransformAttribute,
  type FingerAnimState,
} from "../finger-motion";
import { fingerHand, resolveFinger } from "../hand-key-map";
import type { FingerId } from "../../../types";

/*
 * Standard QWERTY fixture (40px pitch, home row on Y=400), matching the
 * hand-geometry tests. Top row is right-shifted 20px, bottom row likewise.
 * Space is centred under the keyboard below the home row, under/near the left
 * thumb.
 */
function standardKeyboard(): Map<string, KeyAnchor> {
  const kb: KeyboardGeometry = { x: 0, y: 0, width: 600, height: 260 };
  const w = 40 / kb.width;
  const h = 40 / kb.height;
  const key = (code: string, x: number, y: number): KeyAnchor => ({ code, x, y, width: w, height: h });
  const anchors = new Map<string, KeyAnchor>();
  const row = (offset: number, y: number, codes: [string, number][]) => {
    for (const [code, col] of codes) anchors.set(code, key(code, offset + col, y));
  };
  row(120, 320, [
    ["KeyQ", 0],
    ["KeyW", 40],
    ["KeyE", 80],
    ["KeyR", 140],
    ["KeyT", 180],
    ["KeyY", 200],
    ["KeyU", 240],
  ]);
  row(120, 400, [
    ["KeyA", 0],
    ["KeyS", 40],
    ["KeyD", 80],
    ["KeyF", 120],
    ["KeyG", 160],
    ["KeyH", 200],
    ["KeyJ", 240],
    ["KeyK", 280],
    ["KeyL", 320],
    ["Semicolon", 360],
  ]);
  row(120, 480, [
    ["KeyZ", 0],
    ["KeyX", 40],
    ["KeyC", 80],
    ["KeyV", 140],
    ["KeyB", 180],
    ["KeyN", 220],
    ["KeyM", 260],
  ]);
  anchors.set("Space", key("Space", 300, 560));
  anchors.set("ShiftLeft", key("ShiftLeft", 80, 560));
  anchors.set("ShiftRight", key("ShiftRight", 440, 560));
  expect(anchors.size).toBeGreaterThan(15);
  return anchors;
}

function placeFor(anchors: ReadonlyMap<string, KeyAnchor>, hand: "left" | "right"): HandPlacement {
  const layout = computeHandLayout(anchors);
  if (!layout) throw new Error("layout failed for fixture");
  return layout[hand];
}

function reach(anchors: ReadonlyMap<string, KeyAnchor>, code: string): ReturnType<typeof targetForKey> {
  const finger = resolveFinger(code);
  if (!finger) throw new Error(`no finger for ${code}`);
  const anchor = anchors.get(code);
  if (!anchor) throw new Error(`no anchor for ${code}`);
  const hand = fingerHand(finger);
  const geom = hand === "left" ? LEFT_GEOMETRY : RIGHT_GEOMETRY;
  return targetForKey(finger, placeFor(anchors, hand), geom, FINGER_PROFILES[finger], anchor);
}

function reachedTip(
  anchors: ReadonlyMap<string, KeyAnchor>,
  code: string,
): { restY: number; tipY: number; distanceToKeyBefore: number; distanceToKeyAfter: number } {
  const finger = resolveFinger(code);
  if (!finger) throw new Error(`no finger for ${code}`);
  const anchor = anchors.get(code);
  if (!anchor) throw new Error(`no anchor for ${code}`);
  const hand = fingerHand(finger);
  const geom = hand === "left" ? LEFT_GEOMETRY : RIGHT_GEOMETRY;
  const place = placeFor(anchors, hand);
  const geo = fingerGeometry(hand, geom, finger);
  const prof = FINGER_PROFILES[finger];
  const target = targetForKey(finger, place, geom, prof, anchor);
  if (!target) throw new Error(`no target for ${code}`);
  const dist = (a: { x: number; y: number }) => {
    const kb = handToKeyboard(place, a);
    return Math.hypot(kb.x - anchor.x, kb.y - anchor.y);
  };
  const rest = geo.tip;
  const reached = fingertipPosition(geo, prof, target, 1);
  return {
    restY: rest.y,
    tipY: reached.y,
    distanceToKeyBefore: dist(rest),
    distanceToKeyAfter: dist(reached),
  };
}

const anchors = standardKeyboard();

describe("computeReach", () => {
  it("zero delta → exactly the neutral rest posture (zero for fingers, canted for thumbs)", () => {
    const indexGeo = fingerGeometry("left", LEFT_GEOMETRY, "left-index");
    const indexZero = computeReach(indexGeo, FINGER_PROFILES["left-index"], { x: 0, y: 0 });
    expect(indexZero).toEqual({ tx: 0, ty: 0, deg: 0 });

    const thumbGeoL = fingerGeometry("left", LEFT_GEOMETRY, "left-thumb");
    const thumbL = computeReach(thumbGeoL, FINGER_PROFILES["left-thumb"], { x: 0, y: 0 });
    expect(thumbL.tx).toBeCloseTo(-2, 5);
    expect(thumbL.deg).toBeCloseTo(-3, 5);

    const thumbGeoR = fingerGeometry("right", RIGHT_GEOMETRY, "right-thumb");
    const thumbR = computeReach(thumbGeoR, FINGER_PROFILES["right-thumb"], { x: 0, y: 0 });
    expect(thumbR.tx).toBeCloseTo(2, 5);
    expect(thumbR.deg).toBeCloseTo(3, 5);
  });

  it("clamps an oversized reach to the profile limits (bend + axial)", () => {
    const geo = fingerGeometry("left", LEFT_GEOMETRY, "left-index");
    const prof = FINGER_PROFILES["left-index"];
    const big = computeReach(geo, prof, { x: 10000, y: 10000 });
    const small = computeReach(geo, prof, { x: -10000, y: -10000 });
    for (const t of [big, small]) {
      expect(Math.abs(t.deg)).toBeLessThanOrEqual(prof.maxBendDeg + 1e-9);
      expect(t.deg).toBeGreaterThanOrEqual(-prof.maxBendDeg - 1e-9);
      const axial = ((t.tx - prof.neutral.tx) * (geo.tip.x - geo.base.x) + (t.ty - prof.neutral.ty) * (geo.tip.y - geo.base.y)) /
        (geo.length || 1);
      expect(axial).toBeGreaterThanOrEqual(-prof.maxBackward - 1e-6);
      expect(axial).toBeLessThanOrEqual(prof.maxForward + 1e-6);
    }
  });
});

describe("targetForKey (reach toward real keys)", () => {
  it("home keys need (near-)zero reach: KeyF → left-index, KeyJ → right-index", () => {
    for (const code of ["KeyF", "KeyJ"]) {
      const t = reach(anchors, code);
      expect(t, code).not.toBeNull();
      if (t) {
        expect(Math.abs(t.tx), code).toBeLessThan(0.5);
        expect(Math.abs(t.ty), code).toBeLessThan(0.5);
        expect(Math.abs(t.deg), code).toBeLessThan(0.5);
      }
    }
  });

  it("reaching up/down a row bends and strokes toward the key, staying in profile", () => {
    const r = reach(anchors, "KeyR");
    const v = reach(anchors, "KeyV");
    expect(r && v).toBeTruthy();
    if (!r || !v) return;
    // R sits above home: the fingertip must end up closer to KeyR than resting.
    const rTip = reachedTip(anchors, "KeyR");
    expect(rTip.tipY).toBeLessThan(rTip.restY); // the tip rises
    expect(rTip.distanceToKeyAfter).toBeLessThan(rTip.distanceToKeyBefore);
    // V sits below home: the tip drops toward the key.
    const vTip = reachedTip(anchors, "KeyV");
    expect(vTip.tipY).toBeGreaterThan(vTip.restY);
    expect(vTip.distanceToKeyAfter).toBeLessThan(vTip.distanceToKeyBefore);
    // Magnitudes are bounded by the animation profile.
    for (const t of [r, v]) {
      expect(Math.abs(t.deg)).toBeLessThanOrEqual(FINGER_PROFILES["left-index"].maxBendDeg + 1e-6);
      expect(t.ty).toBeGreaterThanOrEqual(-FINGER_PROFILES["left-index"].maxForward - 1e-6);
      expect(t.ty).toBeLessThanOrEqual(FINGER_PROFILES["left-index"].maxBackward + 1e-6);
    }
  });

  it("mirrored geometry flips the bend sign for equal left/right reaches", () => {
    const l = reach(anchors, "KeyR");
    const r = reach(anchors, "KeyU");
    expect(l && r).toBeTruthy();
    if (!l || !r) return;
    expect(Math.sign(l.deg)).toBe(-Math.sign(r.deg));
    expect(Math.abs(l.deg)).toBeCloseTo(Math.abs(r.deg), 6);
  });

  it("Space moves only the left thumb — down toward the space bar, within profile", () => {
    expect(resolveFinger("Space")).toBe("left-thumb");
    const t = reach(anchors, "Space");
    expect(t).not.toBeNull();
    if (!t) return;
    // The thumb strokes downward (away from the key axis, toward the palm).
    expect(t.ty).toBeGreaterThan(2);
    for (const bound of ["tx", "ty", "deg"] as const) {
      const prof = FINGER_PROFILES["left-thumb"];
      if (bound === "deg") expect(Math.abs(t.deg)).toBeLessThanOrEqual(prof.maxBendDeg + 1e-6);
      if (bound === "tx") expect(t.tx).toBeGreaterThan(-prof.maxForward - 1e-6);
      if (bound === "ty") expect(t.ty).toBeLessThanOrEqual(prof.maxBackward + 1e-6);
    }
    // Rest on KeyF — home — must have produced NO reach at all.
    const resting = reach(anchors, "KeyF");
    expect(resting?.deg ?? 99).toBeCloseTo(0, 1);
  });

  it("ShiftLeft/ShiftRight stroke their pinkies toward the shift bars (real-keyboard asymmetry)", () => {
    const sL = reach(anchors, "ShiftLeft");
    const sR = reach(anchors, "ShiftRight");
    expect(sL && sR).toBeTruthy();
    if (!sL || !sR) return;
    for (const [t, code] of [
      [sL, "ShiftLeft"],
      [sR, "ShiftRight"],
    ] as const) {
      // The pinky strokes down toward the shift bar (away from the key axis).
      expect(t.ty).toBeGreaterThan(2);
      // …and the fingertip genuinely gets closer to the shift cap than resting.
      const tip = reachedTip(anchors, code);
      expect(tip.distanceToKeyAfter).toBeLessThan(tip.distanceToKeyBefore);
    }
  });
});

describe("envelope and state machine (approach → press → held → release)", () => {
  const prof = FINGER_PROFILES["left-index"];

  function state(phaseStart: number, phase: FingerAnimState["phase"] = "approach"): FingerAnimState {
    const s: FingerAnimState = {
      phase,
      target: ZERO_TARGET,
      phaseStart,
      entryP: 0,
    };
    if (phase === "press") {
      s.phaseStart = phaseStart;
      s.entryP = APPROACH_PEAK;
    }
    if (phase === "release") {
      s.phaseStart = phaseStart;
      s.entryP = APPROACH_PEAK;
    }
    return s;
  }

  it("press settles at 1 and holds there (no motion past settle)", () => {
    const s = state(1000);
    const start = advanceState(s, prof, 1005, false);
    expect(start).toBeGreaterThan(0);
    expect(start).toBeLessThan(APPROACH_PEAK); // just starting
    const transitionNow = 1000 + prof.approachMs + prof.jitterMs + 2;
    advanceState(s, prof, transitionNow, false); // approach → press at this tick
    const settled = advanceState(s, prof, transitionNow + prof.pressMs + 5, false);
    expect(settled).toBeCloseTo(1, 6);
    // Held: no more animation is required once press has fully settled.
    expect(needsFrame(s, prof, transitionNow + prof.pressMs + 5, false)).toBe(false);
  });

  it("envelope is monotonic non-decreasing while approaching", () => {
    const s = state(0);
    let prev = -1;
    for (const now of [10, 25, 40, 55, 70, prof.approachMs + 1]) {
      const p = advanceState(s, prof, now, false);
      expect(p).toBeGreaterThanOrEqual(prev);
      prev = p;
    }
  });

  it("advanceState is pure: the same (state, now) pair yields the same envelope", () => {
    const a = advanceState(state(0), prof, 30, false);
    expect(a).toEqual(advanceState(state(0), prof, 30, false));
  });

  it("release drives p back to 0 and back to rest", () => {
    const s = state(2000, "release");
    const mid = advanceState(s, prof, 2000 + prof.releaseMs / 2, false);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
    const end = advanceState(s, prof, 2000 + prof.releaseMs + 1, false);
    expect(end).toBeCloseTo(0, 6);
    expect(s.phase).toBe("rest");
    expect(s.target).toBeNull();
    expect(needsFrame(s, prof, 2000 + prof.releaseMs + 1, false)).toBe(false);
  });

  it("reduced motion snaps straight to the pressed state (p=1) with no travel", () => {
    const s = state(5000);
    const p = advanceState(s, prof, 5000, true);
    expect(p).toBeCloseTo(1, 6);
    // Under reduced motion the approach envelope is already at its peak, not a
    // mid-flight value — nothing ever renders between rest and pressed.
    expect(envelopeP(state(5000), prof, 5001, true)).toBeCloseTo(APPROACH_PEAK, 6);
  });

  it("retargeting continues from the current envelope (no snap-back to 0)", () => {
    const midP = advanceState(state(0), prof, 40, false);
    expect(midP).toBeGreaterThan(0);
    // The animator's setTarget starts a fresh approach seeded with entryP = midP.
    const s2: FingerAnimState = { phase: "approach", target: ZERO_TARGET, phaseStart: 40, entryP: midP };
    const continued = advanceState(s2, prof, 45, false);
    expect(continued).toBeGreaterThanOrEqual(midP);
    const transitionNow = 40 + prof.approachMs + prof.jitterMs + 2;
    advanceState(s2, prof, transitionNow, false); // approach → press at this tick
    const settled = advanceState(s2, prof, transitionNow + prof.pressMs + 5, false);
    expect(settled).toBeCloseTo(1, 6);
  });
});

describe("toTransformAttribute", () => {
  it("renders the SVG transform string (rotate about the moved base, then translate)", () => {
    const geo = fingerGeometry("left", LEFT_GEOMETRY, "left-thumb");
    const prof = FINGER_PROFILES["left-thumb"];
    const attr = toTransformAttribute(geo, prof, null, 0);
    expect(attr).toBe("rotate(-3.00 144.40 168.20) translate(-2.00 0.00)");
  });

  it("bends about the finger's own base even while translating", () => {
    const geo = fingerGeometry("left", LEFT_GEOMETRY, "left-index");
    const prof = FINGER_PROFILES["left-index"];
    const attr = toTransformAttribute(geo, prof, { tx: 5, ty: -3, deg: 4 }, 1);
    expect(attr).toBe("rotate(4.00 153.00 89.40) translate(5.00 -3.00)");
  });
});

describe("profiles and hand parity", () => {
  it("all ten fingers have a motion profile with timings on the right hand side", () => {
    const native = Object.keys(FINGER_PROFILES).sort();
    expect(native.length).toBe(10);
    for (const f of native as FingerId[]) {
      expect(FINGER_PROFILES[f].approachMs).toBeGreaterThan(0);
      expect(fingerHand(f)).toBe(f.startsWith("left") ? "left" : "right");
    }
  });

  it("mirror-finger profiles share identical reach limits and timings", () => {
    for (const f of Object.keys(FINGER_PROFILES) as FingerId[]) {
      if (!f.startsWith("left")) continue;
      const mirror = f.replace("left", "right") as FingerId;
      expect(FINGER_PROFILES[mirror].maxBendDeg).toBe(FINGER_PROFILES[f].maxBendDeg);
      expect(FINGER_PROFILES[mirror].maxForward).toBe(FINGER_PROFILES[f].maxForward);
      expect(FINGER_PROFILES[mirror].maxBackward).toBe(FINGER_PROFILES[f].maxBackward);
      expect(FINGER_PROFILES[mirror].approachMs).toBe(FINGER_PROFILES[f].approachMs);
      expect(FINGER_PROFILES[mirror].releaseMs).toBe(FINGER_PROFILES[f].releaseMs);
    }
  });
});

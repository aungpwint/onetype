import type { FingerId, Hand } from "../../types";

/*
 * Deterministic coordinate mapping for the hand guide.
 *
 * THE HIERARCHY IS ALWAYS: Keyboard -> Hand -> Finger -> Animation.
 *
 *  1. KEYBOARD — the source of truth. Every key resolves to a deterministic
 *     centre (KeyAnchor) in a keyboard-local coordinate space measured in
 *     container pixels, its origin at the keyboard surface's top-left corner
 *     (X: 0 → width, Y: 0 → height). Measured key geometry drives every value
 *     below; viewport pixels are never used for positioning.
 *  2. HAND — each hand is anchored relative to the keyboard's axis (the F↔J
 *     midpoint) using only that hand's asset geometry (viewBox, pitch,
 *     fingertip anchors). The two hands are mirrors of the same artwork, so the
 *     right hand is placed as the exact mirror of the left hand's window about
 *     the axis — which keeps the mirrored palms symmetric and never crossing.
 *  3. FINGER — fingertip anchors live in hand-local SVG user units
 *     (relative to the hand's viewBox origin) and are lifted into keyboard
 *     space by handToKeyboard() (anchor + local × scale).
 *  4. ANIMATION — a press nudge is the vector from the finger's resting
 *     fingertip to the target key centre, clamped to a small travel. It is
 *     recomputed fresh each render from the resting position — never
 *     accumulated — and applied only to the active .hand-highlight.
 *
 * The only free constants live here, in the hand geometry configuration, and
 * are expressed as fractions of the MEASURED home-key pitch (so they scale with
 * the keyboard instead of being viewport magic numbers):
 *   CENTER_GAP — symmetric clearance between the mirrored hands at the axis
 *                (the mirrored thumbs would otherwise touch there).
 *   MAX_PRESS  — how far an active finger may travel toward its target key.
 */

export interface Vec2 {
  x: number;
  y: number;
}

/** Keyboard-local coordinate space (container px, origin at the keyboard top-left). */
export interface KeyboardGeometry extends Vec2 {
  width: number;
  height: number;
}

/** A deterministic key centre in keyboard-local coordinates. */
export interface KeyAnchor extends Vec2 {
  code: string;
  /** Key width/height as fractions of the keyboard width/height (normalized). */
  width: number;
  height: number;
}

/** Hand-local geometry of one asset (SVG user units). */
export interface HandGeometry {
  view: { w: number; h: number; minX: number; minY: number };
  /** Natural index↔pinky fingertip spacing ÷ 3 (one key pitch in SVG units). */
  pitch: number;
  /** Index fingertip, relative to the viewBox origin (hand-local units). */
  index: Vec2;
  /** Fingertip anchors for the fingers this hand owns (hand-local units). */
  tips: Partial<Record<FingerId, Vec2>>;
  /** Solid hand art extent (hand-local units, minX/minY-relative). */
  artBounds: { minX: number; maxX: number };
}

/** A positioned hand: the viewBox window's top-left in keyboard-local px + uniform scale. */
export interface HandPlacement {
  x: number;
  y: number;
  scale: number;
}

export interface HandLayout {
  left: HandPlacement;
  right: HandPlacement;
  /** Keyboard-local X of the F↔J midpoint — the hands' shared symmetry axis. */
  axisX: number;
  /** Keyboard-local Y of the home row (fingertip rest row). */
  homeRowY: number;
  /** Measured home-row pitch (px). */
  pitchPx: number;
  /** Symmetric clearance applied at the axis (px). */
  centerGapPx: number;
}

/** Shared by both assets (left-hand.svg is the exact mirror of right-hand.svg). */
const SHARED = {
  w: 185,
  h: 250,
  minY: 136,
  pitch: 25.6667,
};

export const LEFT_GEOMETRY: HandGeometry = {
  view: { w: SHARED.w, h: SHARED.h, minX: 120, minY: SHARED.minY },
  pitch: SHARED.pitch,
  index: { x: 131.6, y: 10.1 },
  tips: {
    "left-pinky": { x: 54.6, y: 15.9 },
    "left-ring": { x: 80.4, y: 9.9 },
    "left-middle": { x: 108.2, y: 7.1 },
    "left-index": { x: 131.6, y: 10.1 },
    "left-thumb": { x: 172.6, y: 69.2 },
  },
  artBounds: { minX: 6.7, maxX: 172.6 },
};

export const RIGHT_GEOMETRY: HandGeometry = {
  view: { w: SHARED.w, h: SHARED.h, minX: 305, minY: SHARED.minY },
  pitch: SHARED.pitch,
  index: { x: 53.4, y: 10.1 },
  tips: {
    "right-pinky": { x: 130.4, y: 15.9 },
    "right-ring": { x: 104.6, y: 9.9 },
    "right-middle": { x: 76.8, y: 7.1 },
    "right-index": { x: 53.4, y: 10.1 },
    "right-thumb": { x: 12.4, y: 69.2 },
  },
  artBounds: { minX: 12.4, maxX: 178.3 },
};

/** Symmetric thumb clearance, as a fraction of the measured home-key pitch. */
export const CENTER_GAP = 0.25;
/** Max press travel toward the target key, as a fraction of the hand's pitch. */
export const MAX_PRESS = 0.12;

export function handGeometry(hand: Hand): HandGeometry {
  return hand === "left" ? LEFT_GEOMETRY : RIGHT_GEOMETRY;
}

/** Keyboard-local point → container pixel (the single keyboard→screen conversion). */
export function keyboardToPixel(kb: KeyboardGeometry, point: Vec2): Vec2 {
  return { x: kb.x + point.x, y: kb.y + point.y };
}

/** Hand-local point → keyboard-local point (anchor + local × scale). */
export function handToKeyboard(place: HandPlacement, local: Vec2): Vec2 {
  return {
    x: place.x + local.x * place.scale,
    y: place.y + local.y * place.scale,
  };
}

/** Resting fingertip of a finger, in keyboard-local coordinates. */
export function fingerRest(place: HandPlacement, geom: HandGeometry, finger: FingerId): Vec2 {
  return handToKeyboard(place, geom.tips[finger] ?? geom.index);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/** Clamped press nudge (hand-local units) from the resting fingertip toward the target key. */
export function pressDelta(params: {
  geom: HandGeometry;
  rest: Vec2;
  target: Vec2 | null;
  scale: number;
}): { dx: number; dy: number } {
  const { geom, rest, target, scale } = params;
  if (!target) return { dx: 0, dy: 0 };
  const travel = MAX_PRESS * geom.pitch;
  return {
    dx: clamp((target.x - rest.x) / scale, -travel, travel),
    dy: clamp((target.y - rest.y) / scale, -travel, travel),
  };
}

/**
 * Derive both hand placements from the measured key anchors (the keyboard is
 * the source of truth — anchors are keyboard-local by construction). The left
 * hand is anchored on the KeyF centre; the right hand is the exact horizontal
 * mirror of the left hand's window about the keyboard axis.
 */
export function computeHandLayout(
  anchors: ReadonlyMap<string, KeyAnchor>,
): HandLayout | null {
  const a = anchors.get("KeyA");
  const f = anchors.get("KeyF");
  const j = anchors.get("KeyJ");
  const semi = anchors.get("Semicolon");
  if (!a || !f || !j) return null;

  const leftPitchPx = Math.max(1, (f.x - a.x) / 3);
  const rightPitchPx = semi ? Math.max(1, (semi.x - j.x) / 3) : leftPitchPx;

  const axisX = (f.x + j.x) / 2;
  const homeRowY = (f.y + j.y) / 2;

  const leftScale = Math.max(0.1, leftPitchPx / LEFT_GEOMETRY.pitch);
  const rightScale = Math.max(0.1, rightPitchPx / RIGHT_GEOMETRY.pitch);

  const pitchPx = (leftPitchPx + rightPitchPx) / 2;
  const centerGapPx = CENTER_GAP * pitchPx;

  // LEFT: index tip rests on KeyF centre, then pushed outward of the axis by
  // the symmetric clearance. offset = distance from the axis to the window's
  // top-left corner, built only from measured geometry + hand geometry.
  const leftOffset = (axisX - f.x) + LEFT_GEOMETRY.index.x * leftScale + centerGapPx;
  const left: HandPlacement = {
    x: axisX - leftOffset,
    y: homeRowY - LEFT_GEOMETRY.index.y * leftScale,
    scale: leftScale,
  };

  // RIGHT: mirror of the left hand's window about the keyboard axis. Because
  // both hands are the mirrored same artwork, this lands the right index
  // fingertip exactly on KeyJ centre while keeping the mirrored palms
  // symmetric about the axis (they can never cross it).
  const right: HandPlacement = {
    x: 2 * axisX - (left.x + LEFT_GEOMETRY.view.w * leftScale),
    y: homeRowY - RIGHT_GEOMETRY.index.y * rightScale,
    scale: rightScale,
  };

  return { left, right, axisX, homeRowY, pitchPx, centerGapPx };
}

/** Solid hand-art x-extent in keyboard-local coordinates. */
export function handArtExtent(place: HandPlacement, geom: HandGeometry) {
  return {
    left: place.x + geom.artBounds.minX * place.scale,
    right: place.x + geom.artBounds.maxX * place.scale,
  };
}

export interface LayoutDiagnostics {
  keyboardWidthPx: number;
  axisX: number;
  leftAnchor: HandPlacement;
  rightAnchor: HandPlacement;
  leftArt: { left: number; right: number };
  rightArt: { left: number; right: number };
  centerGapPx: number;
  /** rightArt.left − leftArt.right. ≥ 0 ⇒ the hands do not overlap at the axis. */
  thumbClearancePx: number;
}

export function inspectHandLayout(layout: HandLayout, kb: KeyboardGeometry): LayoutDiagnostics {
  const leftArt = handArtExtent(layout.left, LEFT_GEOMETRY);
  const rightArt = handArtExtent(layout.right, RIGHT_GEOMETRY);
  return {
    keyboardWidthPx: kb.width,
    axisX: layout.axisX,
    leftAnchor: layout.left,
    rightAnchor: layout.right,
    leftArt,
    rightArt,
    centerGapPx: layout.centerGapPx,
    thumbClearancePx: rightArt.left - leftArt.right,
  };
}

/**
 * Collision validation (dev only). When the two hands' solid art overlaps at
 * the keyboard axis, report the full set of causes the spec asks to inspect —
 * viewBox, transparent padding, rendered scale, anchor, keyboard width, art
 * extent — instead of blindly increasing spacing.
 */
export function validateHandLayout(layout: HandLayout, kb: KeyboardGeometry): boolean {
  const d = inspectHandLayout(layout, kb);
  const clear = d.thumbClearancePx >= 0;
  if (!clear && typeof console !== "undefined") {
    console.warn(
      "[hand-guide] Hand art overlaps at the keyboard axis. Inspect the coordinate mapping:\n" +
        `  keyboard width ${d.keyboardWidthPx.toFixed(1)}px, axis ${d.axisX.toFixed(1)}\n` +
        `  left  anchor (${d.leftAnchor.x.toFixed(1)}, ${d.leftAnchor.y.toFixed(1)}) scale ${d.leftAnchor.scale.toFixed(3)}\n` +
        `  right anchor (${d.rightAnchor.x.toFixed(1)}, ${d.rightAnchor.y.toFixed(1)}) scale ${d.rightAnchor.scale.toFixed(3)}\n` +
        `  left  art x[${d.leftArt.left.toFixed(1)}, ${d.leftArt.right.toFixed(1)}]\n` +
        `  right art x[${d.rightArt.left.toFixed(1)}, ${d.rightArt.right.toFixed(1)}]\n` +
        `  center clearance ${d.centerGapPx.toFixed(1)}px, thumb clearance ${d.thumbClearancePx.toFixed(1)}px`,
    );
  }
  return clear;
}

/** Fingertip anchors for a hand, keyed by FingerId (hand-local user units). */
export function fingerAnchors(geom: HandGeometry): Set<[FingerId, Vec2]> {
  const out = new Set<[FingerId, Vec2]>();
  for (const id of Object.keys(geom.tips) as FingerId[]) {
    out.add([id, geom.tips[id] as Vec2]);
  }
  return out;
}
import type { FingerId, Hand } from "../../types";

/*
 * Deterministic coordinate mapping for the hand guide.
 *
*  THE HIERARCHY IS ALWAYS: Keyboard -> Hand -> Finger -> Animation.
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
 *  3. FINGER — each finger has a resting fingertip anchor and a proximal pivot
 *     (base). Anchors live in hand-local SVG user units (relative to the hand's
 *     viewBox origin) and are lifted into keyboard space by handToKeyboard() so
 *     the four home-row anchors of each hand sit on the artwork's exact
 *     finger-pitch grid and a resting fingertip lands precisely on the centre
 *     of its home key (A/S/D/F and J/K/L/;).
 *  4. ANIMATION — finger-motion.ts turns the delta between the resting
 *     fingertip and the pressed key centre into a per-finger reach: a small
 *     bend (rotation) about the finger's base plus a clamped axial
 *     extension/retraction, all in absolute SVG user units so there is zero
 *     accumulated drift. The hands stay static; only each finger's highlight
 *     path moves, and only as far as its motion profile allows.
 *
 * The fingertip-region validation band (artBounds) covers the fused fingers at
 * the home-row band, NOT the thumbs: the mirrored thumbs deliberately converge
 * toward the shared space key, so they may overlap the axis while the palms
 * and fingers never cross it.
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
  /**
   * Proximal pivots (MP/CMC joints) for the fingers this hand owns, in
   * hand-local units. Each value sits at the palm end of the finger's
   * highlight path in the asset so finger animation bends around the
   * anatomically correct joint instead of sliding the whole hand.
   */
  bases: Partial<Record<FingerId, Vec2>>;
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
}

/** Shared by both assets (left-hand.svg is the exact mirror of right-hand.svg). */
const SHARED = {
  w: 185,
  h: 250,
  minY: 136,
  pitch: 25.6667,
};

/** Hand-local fingertip band used for axis-collision validation (see module doc). */
const BAND = { x0: 40, x1: 145 };

export const LEFT_GEOMETRY: HandGeometry = {
  view: { w: SHARED.w, h: SHARED.h, minX: 120, minY: SHARED.minY },
  pitch: SHARED.pitch,
  index: { x: 131.6, y: 10.1 },
  tips: {
    "left-pinky": { x: 54.6, y: 15.9 },
    "left-ring": { x: 80.27, y: 9.9 },
    "left-middle": { x: 105.93, y: 7.1 },
    "left-index": { x: 131.6, y: 10.1 },
    "left-thumb": { x: 172.6, y: 69.2 },
  },
  // Pivots sit at the palm end of each finger's highlight path in the asset
  // (left-hand.svg). The right hand mirrors these exactly (bases are tested).
  bases: {
    "left-pinky": { x: 58, y: 88 },
    "left-ring": { x: 72.4, y: 104.5 },
    "left-middle": { x: 107.5, y: 113.9 },
    "left-index": { x: 148, y: 92.4 },
    "left-thumb": { x: 146.4, y: 168.2 },
  },
  artBounds: { minX: BAND.x0, maxX: BAND.x1 },
};

export const RIGHT_GEOMETRY: HandGeometry = {
  view: { w: SHARED.w, h: SHARED.h, minX: 305, minY: SHARED.minY },
  pitch: SHARED.pitch,
  index: { x: 53.4, y: 10.1 },
  tips: {
    "right-pinky": { x: 130.4, y: 15.9 },
    "right-ring": { x: 104.73, y: 9.9 },
    "right-middle": { x: 79.07, y: 7.1 },
    "right-index": { x: 53.4, y: 10.1 },
    "right-thumb": { x: 12.4, y: 69.2 },
  },
  bases: {
    "right-pinky": { x: 127, y: 88 },
    "right-ring": { x: 112.6, y: 104.5 },
    "right-middle": { x: 77.5, y: 113.9 },
    "right-index": { x: 37, y: 92.4 },
    "right-thumb": { x: 38.6, y: 168.2 },
  },
  artBounds: { minX: BAND.x0, maxX: BAND.x1 },
};

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

/**
 * Derive both hand placements from the measured key anchors (the keyboard is
 * the source of truth — anchors are keyboard-local by construction). The left
 * hand is anchored on the KeyF centre; the right hand is the exact horizontal
 * mirror of the left hand's window about the keyboard axis. Because the
 * home-row fingertip anchors sit on the artwork's finger-pitch grid, every
 * fingertip rests exactly on its home key centre.
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

  // LEFT: index fingertip rests exactly on the KeyF centre — no seam: the
  // mirrored thumbs deliberately converge toward the shared space key, while
  // the palms/fingers stay clear of the axis (validated by handArtExtent).
  const leftOffset = (axisX - f.x) + LEFT_GEOMETRY.index.x * leftScale;
  const left: HandPlacement = {
    x: axisX - leftOffset,
    y: homeRowY - LEFT_GEOMETRY.index.y * leftScale,
    scale: leftScale,
  };

  // RIGHT: mirror of the left hand's window about the keyboard axis. Because
  // both hands are the mirrored same artwork, this lands the right index
  // fingertip exactly on the KeyJ centre while keeping the mirrored palms
  // symmetric about the axis.
  const right: HandPlacement = {
    x: 2 * axisX - (left.x + LEFT_GEOMETRY.view.w * leftScale),
    y: homeRowY - RIGHT_GEOMETRY.index.y * rightScale,
    scale: rightScale,
  };

  return { left, right, axisX, homeRowY, pitchPx: (leftPitchPx + rightPitchPx) / 2 };
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
  /** rightArt.left − leftArt.right. ≥ 0 ⇒ the finger bands do not cross the axis. */
  axisClearancePx: number;
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
    axisClearancePx: rightArt.left - leftArt.right,
  };
}

/**
 * Collision validation (dev only). The mirrored thumb tips may converge toward
 * the shared space key, but the palms and finger bands must never cross the
 * keyboard axis. When they do, report the full set of causes the spec asks to
 * inspect — SVG viewBox, transparent padding, rendered scale, hand anchor,
 * keyboard width, art extent — instead of blindly increasing spacing.
 */
export function validateHandLayout(layout: HandLayout, kb: KeyboardGeometry): boolean {
  const d = inspectHandLayout(layout, kb);
  const clear = d.axisClearancePx >= 0;
  if (!clear && typeof console !== "undefined") {
    console.warn(
      "[hand-guide] Hand finger bands overlap at the keyboard axis. Inspect the coordinate mapping:\n" +
        `  keyboard width ${d.keyboardWidthPx.toFixed(1)}px, axis ${d.axisX.toFixed(1)}\n` +
        `  left  anchor (${d.leftAnchor.x.toFixed(1)}, ${d.leftAnchor.y.toFixed(1)}) scale ${d.leftAnchor.scale.toFixed(3)}\n` +
        `  right anchor (${d.rightAnchor.x.toFixed(1)}, ${d.rightAnchor.y.toFixed(1)}) scale ${d.rightAnchor.scale.toFixed(3)}\n` +
        `  left  band x[${d.leftArt.left.toFixed(1)}, ${d.leftArt.right.toFixed(1)}]\n` +
        `  right band x[${d.rightArt.left.toFixed(1)}, ${d.rightArt.right.toFixed(1)}]\n` +
        `  axis clearance ${d.axisClearancePx.toFixed(1)}px`,
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

/** The shared width of both hand assets (both viewBoxes are 185×250). */
export const HAND_WIDTH = SHARED.w;

/**
 * Mirror a hand-local point about the hand asset's vertical centre (the axis
 * both hands mirror about: local x' = 185 − x). THE RIGHT HAND IS THE EXACT
 * MIRROR OF THE LEFT, so every right-hand geometry value can be derived and
 * cross-checked from the left (see the mirror-safety tests).
 */
export function mirrorHandLocalX(point: Vec2): Vec2 {
  return { x: HAND_WIDTH - point.x, y: point.y };
}

/**
 * The animation harness for a single finger: its resting tip (hand-local), its
 * proximal pivot (base, hand-local) and the lever arm between them. All motion
 * is expressed relative to these absolute values — drift-free by construction.
 */
export interface FingerGeometry {
  hand: Hand;
  finger: FingerId;
  /** Resting fingertip in hand-local SVG user units. */
  tip: Vec2;
  /** Proximal joint pivot in hand-local SVG user units. */
  base: Vec2;
  /** Lever arm from the pivot to the fingertip (SVG user units). */
  length: number;
}

/**
 * Animation geometry for one finger. Uses the configured base pivot when
 * available; otherwise falls back to a point one pitch below the fingertip
 * along the hand axis (so every finger always has a usable lever arm).
 */
export function fingerGeometry(hand: Hand, geom: HandGeometry, finger: FingerId): FingerGeometry {
  const tip = geom.tips[finger] ?? geom.index;
  const base = geom.bases[finger] ?? { x: tip.x, y: tip.y + geom.pitch };
  return { hand, finger, tip, base, length: Math.hypot(tip.x - base.x, tip.y - base.y) };
}
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { motion } from "framer-motion";
import { leftHandSvg, rightHandSvg } from "./hand-assets";
import { resolveFinger, fingerOnHand } from "./hand-key-map";
import type { FingerId } from "../../types";

/*
 * HandOverlay renders the SAME pair of hand SVG assets that HandGuide uses
 * (left-hand.svg / right-hand.svg) positioned over the real keyboard. The
 * keyboard is the geometric source of truth: each hand is measured against the
 * DOM geometry (`[data-key]` bounding rects) and placed with a deterministic,
 * derived transform rather than hardcoded pixel offsets.
 *
 * Transform model (per hand):
 *   1. SCALE — derived from the home-row key pitch: the artwork's natural
 *      index<->pinky finger spacing (SVG user units) is mapped onto the
 *      measured A->F / J->; key-center pitch, so one SVG unit equals a known
 *      number of pixels. Uniform (no distortion).
 *   2. ANCHOR — the index fingertip rests exactly on the KeyF (left) / KeyJ
 *      (right) home-key center. All other fingers then fall on their keys
 *      because the artwork's finger spacing is scaled to the real pitch.
 *   3. REACH — when a finger is active, the whole hand translates by the delta
 *      between that finger's rest-tip and the target key's center, so the
 *      highlighted fingertip tracks the exact intended key (spring-animated).
 *      Shift chords reach with the opposite hand's pinky onto the Shift key.
 *
 * Because the source artwork is a single fused hand (palm + fingers + wrist in
 * one shape), a true palm/fingers depth split is not possible; the whole hand
 * is layered above the keys (z-30), which reads naturally for a top-down typing
 * view. The responsible finger(s) are lit via the container's
 * `data-active-finger` attribute (a space-separated list of FingerId),
 * matching HandGuide's visual.
 */

interface HandOverlayProps {
  layout: {
    rows: { code: string; width?: number }[][];
  };
  activeKey?: string | null;
  shiftKey?: string | null;
  isActive?: boolean;
  children?: ReactNode;
}

/** ViewBox geometry of each hand asset (user units). */
interface ViewBox {
  w: number;
  h: number;
  minX: number;
  minY: number;
  /** Natural index<->pinky fingertip spacing ÷ 3 (one key pitch in SVG units). */
  pitch: number;
}

const LEFT_VIEW: ViewBox = { w: 180, h: 250, minX: 115, minY: 140, pitch: 29.9667 };
const RIGHT_VIEW: ViewBox = { w: 185, h: 250, minX: 305, minY: 136, pitch: 25.6667 };

/** Fingertip coordinates (SVG root user units) measured from the artwork. */
const LEFT_TIPS: Record<string, [number, number]> = {
  "left-pinky": [172.0, 154.2],
  "left-ring": [203.2, 146.7],
  "left-middle": [231.2, 153.8],
  "left-index": [261.9, 155.1],
  "left-thumb": [292.6, 205.2],
};
const RIGHT_TIPS: Record<string, [number, number]> = {
  "right-pinky": [435.4, 151.9],
  "right-ring": [409.6, 145.9],
  "right-middle": [381.8, 143.1],
  "right-index": [358.4, 146.1],
  "right-thumb": [317.4, 205.2],
};

const SPRING = { type: "spring" as const, stiffness: 240, damping: 30, mass: 0.9 };

/** A positioned hand: container top-left (x, y) + uniform scale. */
interface HandPlacement {
  x: number;
  y: number;
  scale: number;
}

interface Measured {
  leftBase: HandPlacement; // left hand resting with index tip on KeyF centre
  rightBase: HandPlacement; // right hand resting with index tip on KeyJ centre
  centers: Map<string, { x: number; y: number }>; // key-code -> centre (container-local px)
}

function keyCenterOf(
  rect: DOMRect,
  origin: DOMRect,
): { x: number; y: number } {
  return {
    x: rect.left - origin.left + rect.width / 2,
    y: rect.top - origin.top + rect.height / 2,
  };
}

export function HandOverlay({ layout, activeKey, shiftKey, isActive = true, children }: HandOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState<Measured | null>(null);

  // Active finger(s): the target key's finger plus the shift-chord pinky.
  const activeFingerList = useMemo(() => {
    if (!isActive) return "";
    const fingers = new Set<string>();
    if (shiftKey === "ShiftLeft") fingers.add("left-pinky");
    else if (shiftKey === "ShiftRight") fingers.add("right-pinky");
    const target = resolveFinger(activeKey);
    if (target) fingers.add(target);
    return Array.from(fingers).join(" ");
  }, [isActive, activeKey, shiftKey]);

  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const rects = new Map<string, DOMRect>();
    container.querySelectorAll<HTMLElement>("[data-key]").forEach((el) => {
      const code = el.dataset.key;
      if (code) rects.set(code, el.getBoundingClientRect());
    });
    const a = rects.get("KeyA");
    const f = rects.get("KeyF");
    const j = rects.get("KeyJ");
    const semi = rects.get("Semicolon");
    if (!a || !f || !j || !semi) return;

    const origin = container.getBoundingClientRect();

    // Home-row key-centre pitch (px) → the artwork scale for each hand.
    const leftPitchPx = (keyCenterOf(f, origin).x - keyCenterOf(a, origin).x) / 3;
    const rightPitchPx = (keyCenterOf(semi, origin).x - keyCenterOf(j, origin).x) / 3;
    const leftScale = Math.max(0.1, leftPitchPx / LEFT_VIEW.pitch);
    const rightScale = Math.max(0.1, rightPitchPx / RIGHT_VIEW.pitch);

    // Home row centre Y: where resting fingertips sit vertically.
    const homeY = (keyCenterOf(f, origin).y + keyCenterOf(j, origin).y) / 2;

    const [liX, liY] = LEFT_TIPS["left-index"];
    const [riX, riY] = RIGHT_TIPS["right-index"];

    const leftBase: HandPlacement = {
      x: keyCenterOf(f, origin).x - (liX - LEFT_VIEW.minX) * leftScale,
      y: homeY - (liY - LEFT_VIEW.minY) * leftScale,
      scale: leftScale,
    };
    const rightBase: HandPlacement = {
      x: keyCenterOf(j, origin).x - (riX - RIGHT_VIEW.minX) * rightScale,
      y: homeY - (riY - RIGHT_VIEW.minY) * rightScale,
      scale: rightScale,
    };

    const centers = new Map<string, { x: number; y: number }>();
    rects.forEach((r, code) => centers.set(code, keyCenterOf(r, origin)));

    setMeasured({ leftBase, rightBase, centers });
  }, []);

  useEffect(() => {
    measure();
    const raf = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(raf);
  }, [layout, measure]);

  useEffect(() => {
    const root = containerRef.current?.closest("[data-keyboard-root]");
    if (!root) return;

    let scheduled = false;
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        measure();
      });
    };

    const observer = new ResizeObserver(schedule);
    observer.observe(root);
    window.addEventListener("resize", schedule);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", schedule);
    };
  }, [measure]);

  // Which finger (if any) reaches a target key for each hand.
  const primaryFinger = useMemo(
    () => (isActive ? resolveFinger(activeKey) : null),
    [isActive, activeKey],
  );

  // Translate a hand from its rest base so the given fingertip lands on target.
  const reachHand = (
    view: ViewBox,
    base: HandPlacement,
    tips: Record<string, [number, number]>,
    finger: FingerId,
    target: { x: number; y: number },
  ): HandPlacement => {
    const tip = tips[finger];
    if (!tip) return base;
    const restX = base.x + (tip[0] - view.minX) * base.scale;
    const restY = base.y + (tip[1] - view.minY) * base.scale;
    return {
      x: base.x + (target.x - restX),
      y: base.y + (target.y - restY),
      scale: base.scale,
    };
  };

  const leftHand = useMemo<HandPlacement | null>(() => {
    if (!measured || !isActive) return measured?.leftBase ?? null;
    // Primary letter on the left hand takes priority.
    if (primaryFinger && fingerOnHand(primaryFinger, "left")) {
      const target = measured.centers.get(activeKey ?? "");
      if (target) {
        return reachHand(LEFT_VIEW, measured.leftBase, LEFT_TIPS, primaryFinger, target);
      }
    }
    // Otherwise the left pinky reaches the left Shift.
    if (shiftKey === "ShiftLeft") {
      const target = measured.centers.get("ShiftLeft");
      if (target) return reachHand(LEFT_VIEW, measured.leftBase, LEFT_TIPS, "left-pinky", target);
    }
    return measured.leftBase;
  }, [measured, isActive, primaryFinger, activeKey, shiftKey]);

  const rightHand = useMemo<HandPlacement | null>(() => {
    if (!measured || !isActive) return measured?.rightBase ?? null;
    if (primaryFinger && fingerOnHand(primaryFinger, "right")) {
      const target = measured.centers.get(activeKey ?? "");
      if (target) {
        return reachHand(RIGHT_VIEW, measured.rightBase, RIGHT_TIPS, primaryFinger, target);
      }
    }
    if (shiftKey === "ShiftRight") {
      const target = measured.centers.get("ShiftRight");
      if (target) return reachHand(RIGHT_VIEW, measured.rightBase, RIGHT_TIPS, "right-pinky", target);
    }
    return measured.rightBase;
  }, [measured, isActive, primaryFinger, activeKey, shiftKey]);

  if (!measured || !leftHand || !rightHand) {
    return <div ref={containerRef} className="hand-overlay-container">{children}</div>;
  }

  const containerAttrs: Record<string, unknown> = {};
  if (activeFingerList) containerAttrs["data-active-finger"] = activeFingerList;

  return (
    <div ref={containerRef} className="hand-overlay-container" {...containerAttrs}>
      {/* Keyboard layer (z-10) */}
      <div className="hand-overlay-keyboard">{children}</div>

      {/* Front layer: the two hand assets above the keys (z-30). */}
      <motion.div
        className="hand-overlay-hand hand-overlay-left"
        style={{ width: LEFT_VIEW.w, height: LEFT_VIEW.h, transformOrigin: "0 0" }}
        initial={false}
        animate={{ x: leftHand.x, y: leftHand.y, scale: leftHand.scale }}
        transition={SPRING}
        aria-hidden
        dangerouslySetInnerHTML={{ __html: leftHandSvg }}
      />
      <motion.div
        className="hand-overlay-hand hand-overlay-right"
        style={{ width: RIGHT_VIEW.w, height: RIGHT_VIEW.h, transformOrigin: "0 0" }}
        initial={false}
        animate={{ x: rightHand.x, y: rightHand.y, scale: rightHand.scale }}
        transition={SPRING}
        aria-hidden
        dangerouslySetInnerHTML={{ __html: rightHandSvg }}
      />
    </div>
  );
}

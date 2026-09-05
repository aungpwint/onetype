import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { leftHandSvg, rightHandSvg } from "./hand-assets";
import { fingerHand, resolveFinger } from "./hand-key-map";
import {
  LEFT_GEOMETRY,
  RIGHT_GEOMETRY,
  computeHandLayout,
  fingerAnchors,
  fingerGeometry,
  handArtExtent,
  handToKeyboard,
  inspectHandLayout,
  keyboardToPixel,
  validateHandLayout,
  type KeyAnchor,
  type KeyboardGeometry,
  type HandLayout,
  type HandPlacement,
} from "./hand-geometry";
import {
  FINGER_PROFILES,
  FingerAnimator,
  fingertipInKeyboard,
  targetForKey,
  type FingerTarget,
} from "./finger-motion";
import type { FingerId, Hand } from "@/types";

/*
 * HandOverlay renders the pair of hand SVG assets (left-hand.svg /
 * right-hand.svg) over the real keyboard. All positioning runs through the
 * deterministic coordinate hierarchy defined in hand-geometry.ts:
 *
 *   Keyboard ──► Hand ──► Finger ──► Animation
 *
 * 1. KEYBOARD — the keyboard is the source of truth. The overlay measures the
 *    `[data-keyboard-root]` surface and every `[data-key]` rect, expressing them
 *    as KeyAnchors in a keyboard-local coordinate space (X: 0 → width,
 *    Y: 0 → height). No viewport pixels are used for positioning.
 * 2. HAND — computeHandLayout() derives both hand placements relative to the
 *    keyboard axis (F↔J midpoint) from hand geometry: the left hand anchors its
 *    index fingertip on KeyF centre, the right hand mirrors the left window.
 * 3. FINGER — fingertip anchors are hand-local SVG units in the assets, lifted
 *    into keyboard space by handToKeyboard() (see hand-geometry.ts), so every
 *    fingertip rests on its home key centre.
 * 4. ANIMATION — pressing a key bends that finger's .hand-finger group around
 *    its base pivot (FingerAnimator in finger-motion.ts, one rAF loop, absolute
 *    SVG-unit targets). The palm blob stays perfectly static; the active set is
 *    additionally shipped to CSS as `data-active-finger` on this container for
 *    the colour/highlight cue, and reduced-motion users get the colour cue only.
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

/** Dev-only coordinate debug layer, enabled with `?handdebug` on the URL. */
function isDebugEnabled(): boolean {
  return (
    import.meta.env.DEV &&
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("handdebug")
  );
}

const HANDS: { hand: Hand; geom: typeof LEFT_GEOMETRY; placementKey: "left" | "right" }[] = [
  { hand: "left", geom: LEFT_GEOMETRY, placementKey: "left" },
  { hand: "right", geom: RIGHT_GEOMETRY, placementKey: "right" },
];

export function HandOverlay({ layout, activeKey, shiftKey, isActive = true, children }: HandOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [geometry, setGeometry] = useState<{
    kb: KeyboardGeometry;
    anchors: Map<string, KeyAnchor>;
  } | null>(null);

  const debug = useMemo(() => isDebugEnabled(), []);

  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const rootEl = container.closest("[data-keyboard-root]");
    const cRect = container.getBoundingClientRect();
    const root = rootEl?.getBoundingClientRect() ?? cRect;

    const kb: KeyboardGeometry = {
      x: root.left - cRect.left,
      y: root.top - cRect.top,
      width: root.width,
      height: root.height,
    };

    const anchors = new Map<string, KeyAnchor>();
    container.querySelectorAll<HTMLElement>("[data-key]").forEach((el) => {
      const code = el.dataset.key;
      if (!code) return;
      const r = el.getBoundingClientRect();
      anchors.set(code, {
        code,
        x: r.left - cRect.left - kb.x + r.width / 2,
        y: r.top - cRect.top - kb.y + r.height / 2,
        width: r.width / kb.width,
        height: r.height / kb.height,
      });
    });

    setGeometry({ kb, anchors });
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

  const handLayout = useMemo<HandLayout | null>(
    () => (geometry ? computeHandLayout(geometry.anchors) : null),
    [geometry],
  );

  /**
   * The finger animator lives only while the hand SVGs are mounted. It is
   * created after render (so the injected .hand-finger groups exist) and
   * destroyed when the hands unmount — keyed on presence, not on the layout
   * object, so re-measures never restart an in-flight animation.
   */
  const animatorRef = useRef<FingerAnimator | null>(null);
  const handsMounted = handLayout !== null;
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !handsMounted) {
      animatorRef.current?.destroy();
      animatorRef.current = null;
      return;
    }
    const animator = new FingerAnimator(container);
    animatorRef.current = animator;
    return () => {
      animator.destroy();
      if (animatorRef.current === animator) animatorRef.current = null;
    };
  }, [handsMounted]);

  // Drive the targets from the current key state. Fingers absent from the map
  // are released by the animator; present ones are reached/retargeted.
  useEffect(() => {
    const animator = animatorRef.current;
    if (!animator || !handLayout) return;

    const targets = new Map<FingerId, FingerTarget | null>();

    const reachFinger = (finger: FingerId | null, code: string) => {
      if (!finger) return;
      const anchor = geometry?.anchors.get(code);
      if (!anchor) return;
      const hand = fingerHand(finger);
      const place = handLayout[hand === "left" ? "left" : "right"];
      const geom = hand === "left" ? LEFT_GEOMETRY : RIGHT_GEOMETRY;
      const target = targetForKey(finger, place, geom, FINGER_PROFILES[finger], {
        x: anchor.x,
        y: anchor.y,
      });
      if (target) targets.set(finger, target);
    };

    if (isActive) {
      if (activeKey) reachFinger(resolveFinger(activeKey), activeKey);
      if (shiftKey === "ShiftLeft") reachFinger("left-pinky", shiftKey);
      else if (shiftKey === "ShiftRight") reachFinger("right-pinky", shiftKey);
    }

    animator.setTargets(targets);
  }, [isActive, activeKey, shiftKey, handLayout, geometry]);

  // Dev-only live anatomy markers: connect the animator's per-frame sample to
  // the HandDebugLayer circles so CURRENT follows the real envelope (no React
  // re-render per frame — the loop writes SVG attributes directly).
  useEffect(() => {
    const animator = animatorRef.current;
    const scope = containerRef.current;
    if (!animator || !scope || !debug || !handLayout) return;

    const boxes = HANDS.flatMap((h) => {
      const place = handLayout[h.placementKey];
      return Array.from(fingerAnchors(h.geom)).map(([finger]) => {
        const geo = fingerGeometry(h.hand, h.geom, finger);
        const rest = handToKeyboard(place, geo.tip);
        const baseLocal = h.geom.bases[finger] ?? geo.base;
        const base = handToKeyboard(place, baseLocal);
        return { finger, place, geo, rest, base };
      });
    });

    animator.onSample = () => {
      for (const b of boxes) {
        const p = animator.currentP(b.finger);
        const t = animator.currentTarget(b.finger);
        const tip = fingertipInKeyboard(b.place, b.geo, FINGER_PROFILES[b.finger], t, p);
        const cur = scope.querySelector(`#dbg-cur-${b.finger}`);
        if (cur) {
          cur.setAttribute("cx", tip.x.toFixed(1));
          cur.setAttribute("cy", tip.y.toFixed(1));
        }
        const vec = scope.querySelector(`#dbg-vec-${b.finger}`);
        if (vec) {
          vec.setAttribute("x1", b.base.x.toFixed(1));
          vec.setAttribute("y1", b.base.y.toFixed(1));
          vec.setAttribute("x2", tip.x.toFixed(1));
          vec.setAttribute("y2", tip.y.toFixed(1));
        }
      }
    };
    return () => {
      animator.onSample = null;
    };
  }, [debug, handLayout]);

  // Active finger(s): the target key's finger plus the shift-chord pinky.
  const activeFingers = useMemo<Set<FingerId>>(() => {
    const fingers = new Set<FingerId>();
    if (!isActive) return fingers;
    if (shiftKey === "ShiftLeft") fingers.add("left-pinky");
    else if (shiftKey === "ShiftRight") fingers.add("right-pinky");
    const target = resolveFinger(activeKey);
    if (target) fingers.add(target);
    return fingers;
  }, [isActive, activeKey, shiftKey]);

  // Collision validation (dev only, logs the geometry to inspect).
  useEffect(() => {
    if (import.meta.env.DEV && handLayout && geometry) {
      validateHandLayout(handLayout, geometry.kb);
    }
  }, [handLayout, geometry]);

  if (!handLayout) {
    return <div ref={containerRef} className="hand-overlay-container">{children}</div>;
  }

  const containerAttrs: Record<string, unknown> = {};
  if (activeFingers.size > 0) {
    containerAttrs["data-active-finger"] = Array.from(activeFingers).join(" ");
  }

  const leftPos = keyboardToPixel(geometry!.kb, handLayout.left);
  const rightPos = keyboardToPixel(geometry!.kb, handLayout.right);

  return (
    <div
      ref={containerRef}
      className="hand-overlay-container"
      {...containerAttrs}
    >
      {/* Keyboard layer (z-10) */}
      <div className="hand-overlay-keyboard">{children}</div>

      {/* Front layer: the two static hand assets above the keys (z-30). */}
      <div
        className="hand-overlay-hand hand-overlay-left"
        style={{
          width: LEFT_GEOMETRY.view.w,
          height: LEFT_GEOMETRY.view.h,
          transform: `translate(${leftPos.x}px, ${leftPos.y}px) scale(${handLayout.left.scale})`,
          transformOrigin: "0 0",
        }}
        aria-hidden
        dangerouslySetInnerHTML={{ __html: leftHandSvg }}
      />
      <div
        className="hand-overlay-hand hand-overlay-right"
        style={{
          width: RIGHT_GEOMETRY.view.w,
          height: RIGHT_GEOMETRY.view.h,
          transform: `translate(${rightPos.x}px, ${rightPos.y}px) scale(${handLayout.right.scale})`,
          transformOrigin: "0 0",
        }}
        aria-hidden
        dangerouslySetInnerHTML={{ __html: rightHandSvg }}
      />

      {debug && (
        <HandDebugLayer
          kb={geometry!.kb}
          layout={handLayout}
          anchors={geometry!.anchors}
        />
      )}
    </div>
  );
}

interface HandDebugLayerProps {
  kb: KeyboardGeometry;
  layout: HandLayout;
  anchors: ReadonlyMap<string, KeyAnchor>;
}

/**
 * Dev-only visual verification of the coordinate mapping (see hand-geometry.ts).
 * Renders keyboard bounds, the hand axis, key centres, hand anchors, hand
 * window + solid-art boxes and every finger anchor — all in keyboard-local
 * coordinates. Only produced when `import.meta.env.DEV` and `?handdebug` is set;
 * stripped from production builds.
 */
function HandDebugLayer({ kb, layout, anchors }: HandDebugLayerProps) {
  const diagnostics = inspectHandLayout(layout, kb);
  const d: HandPlacement[] = HANDS.map((h) => layout[h.placementKey]);

  const keyMarkers = Array.from(anchors.values());
  const fingerMarkers = HANDS.flatMap((h) => {
    const place = layout[h.placementKey];
    return Array.from(fingerAnchors(h.geom)).map(([finger]) => {
      const geo = fingerGeometry(h.hand, h.geom, finger);
      const rest = handToKeyboard(place, geo.tip);
      const baseLocal = h.geom.bases[finger] ?? geo.base;
      const base = handToKeyboard(place, baseLocal);
      return {
        finger,
        rest,
        base,
        prof: FINGER_PROFILES[finger],
        place,
        geo,
      };
    });
  });

  const windowBoxes = HANDS.map((h) => {
    const place = layout[h.placementKey];
    return {
      key: h.hand,
      x: place.x,
      y: place.y,
      w: h.geom.view.w * place.scale,
      hh: h.geom.view.h * place.scale,
    };
  });

  const artBoxes = HANDS.map((h) => {
    const ext = handArtExtent(layout[h.placementKey], h.geom);
    const place = layout[h.placementKey];
    return {
      key: h.hand,
      x: ext.left,
      y: place.y,
      w: ext.right - ext.left,
      hh: h.geom.view.h * place.scale,
    };
  });

  return (
    <svg
      className="hand-debug"
      style={{ position: "absolute", left: kb.x, top: kb.y, zIndex: 50, pointerEvents: "none" }}
      width={kb.width}
      height={kb.height}
      viewBox={`0 0 ${kb.width} ${kb.height}`}
      aria-hidden
    >
      <g fontFamily="ui-monospace, monospace" fontSize={10} fill="#d34">
        {/* Keyboard bounds */}
        <rect
          x={0.5}
          y={0.5}
          width={kb.width - 1}
          height={kb.height - 1}
          fill="none"
          stroke="#d34"
          strokeWidth={1}
          strokeDasharray="4 3"
        />
        <text x={4} y={12}>keyboard {kb.width.toFixed(0)}×{kb.height.toFixed(0)}</text>

        {/* Hand axis */}
        <line
          x1={layout.axisX}
          y1={0}
          x2={layout.axisX}
          y2={kb.height}
          stroke="#d34"
          strokeWidth={1}
          strokeDasharray="2 3"
        />
        <text x={layout.axisX + 3} y={12}>axis {layout.axisX.toFixed(0)}</text>

        {/* Key centres */}
        {keyMarkers.map((k) => (
          <circle key={k.code} cx={k.x} cy={k.y} r={2} fill="#4d8" opacity={0.9} />
        ))}

        {/* Hand anchors (+), windows and solid-art boxes */}
        {windowBoxes.map((b) => (
          <rect key={`win-${b.key}`} x={b.x} y={b.y} width={b.w} height={b.hh} fill="none" stroke="#48f" strokeWidth={1} />
        ))}
        {artBoxes.map((b) => (
          <rect key={`art-${b.key}`} x={b.x} y={b.y} width={b.w} height={b.hh} fill="none" stroke="#f80" strokeWidth={1} />
        ))}
        {d.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={3} fill="none" stroke="#48f" strokeWidth={1.5} />
            <line x1={p.x - 5} y1={p.y} x2={p.x + 5} y2={p.y} stroke="#48f" strokeWidth={1} />
            <line x1={p.x} y1={p.y - 5} x2={p.x} y2={p.y + 5} stroke="#48f" strokeWidth={1} />
          </g>
        ))}

        {/* Finger anatomy: base pivot (square), rest tip (dot + label), live
            current tip (filled dot) and base→current vector — the last two are
            driven per-frame by the animator's onSample hook. */}
        {fingerMarkers.map((m) => (
          <g key={m.finger}>
            <rect x={m.base.x - 1.5} y={m.base.y - 1.5} width={3} height={3} fill="none" stroke="#f80" strokeWidth={1} />
            <circle cx={m.rest.x} cy={m.rest.y} r={2} fill="#d34" opacity={0.9} />
            <text x={m.rest.x + 3} y={m.rest.y - 2}>{m.finger}</text>
            <line id={`dbg-vec-${m.finger}`} x1={m.base.x} y1={m.base.y} x2={m.rest.x} y2={m.rest.y} stroke="#f80" strokeWidth={0.75} strokeDasharray="2 2" opacity={0.6} />
            <circle id={`dbg-cur-${m.finger}`} cx={m.rest.x} cy={m.rest.y} r={2.5} fill="#0ff" opacity={0.95} />
          </g>
        ))}

        {diagnostics.axisClearancePx < 0 && (
          <text x={4} y={kb.height - 6} fill="#d34">
            OVERLAP: axis clearance {diagnostics.axisClearancePx.toFixed(1)}px — inspect the
            mapping (diagnostics logged to console)
          </text>
        )}
      </g>
    </svg>
  );
}
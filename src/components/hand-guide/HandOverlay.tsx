import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { leftHandSvg, rightHandSvg } from "./hand-assets";
import { resolveFinger, fingerHand } from "./hand-key-map";
import {
  LEFT_GEOMETRY,
  RIGHT_GEOMETRY,
  computeHandLayout,
  fingerAnchors,
  fingerRest,
  handArtExtent,
  handGeometry,
  inspectHandLayout,
  keyboardToPixel,
  pressDelta,
  validateHandLayout,
  type KeyAnchor,
  type KeyboardGeometry,
  type HandLayout,
  type HandPlacement,
} from "./hand-geometry";
import type { FingerId, Hand } from "../../types";

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
 *    into keyboard space by handToKeyboard() (see hand-geometry.ts).
 * 4. ANIMATION — the hands stay static; pressing feedback is a tiny, clamped
 *    nudge of the active `.hand-highlight` toward its target key. Because every
 *    finger is key-anchored by construction, the nudge is small (see MAX_PRESS)
 *    and is recomputed every render from the rest position, so it never
 *    accumulates. The press transform ships to CSS as a `--press-<finger>`
 *    custom property on this container (falling back to the resting transform
 *    when no nudge is computed).
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

  // Per-finger press nudges: Keyboard → Hand → Finger → Animation.
  // The nudge is fresh each render (rest fingertip → target key centre),
  // clamped to MAX_PRESS, and applied only to the active highlight via a CSS
  // custom property on this container.
  const pressVars = useMemo<CSSProperties>(() => {
    const vars: Record<string, string> = {};
    if (!handLayout || !geometry) return {};
    for (const finger of activeFingers) {
      const hand = fingerHand(finger);
      const geom = handGeometry(hand);
      const place = handLayout[hand];
      const rest = fingerRest(place, geom, finger);
      const isShiftPinky =
        (finger === "left-pinky" && shiftKey === "ShiftLeft") ||
        (finger === "right-pinky" && shiftKey === "ShiftRight");
      const target = geometry.anchors.get(
        isShiftPinky ? (hand === "left" ? "ShiftLeft" : "ShiftRight") : activeKey ?? "",
      );
      const { dx, dy } = pressDelta({ geom, rest, target: target ?? null, scale: place.scale });
      vars[`--press-${finger}`] = `translate(${dx}px, ${dy}px)`;
    }
    return vars as CSSProperties;
  }, [handLayout, geometry, activeFingers, activeKey, shiftKey]);

  // Collision / overlap validation (dev only, logs the geometry to inspect).
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
      style={pressVars}
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
    return Array.from(fingerAnchors(h.geom)).map(([finger, anchor]) => {
      const kbPoint = {
        x: place.x + anchor.x * place.scale,
        y: place.y + anchor.y * place.scale,
      };
      return { finger, ...kbPoint };
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

        {/* Finger anchors */}
        {fingerMarkers.map((m) => (
          <g key={m.finger}>
            <circle cx={m.x} cy={m.y} r={2} fill="#d34" opacity={0.9} />
            <text x={m.x + 3} y={m.y - 2}>{m.finger}</text>
          </g>
        ))}

        {diagnostics.thumbClearancePx < 0 && (
          <text x={4} y={kb.height - 6} fill="#d34">
            OVERLAP: thumb clearance {diagnostics.thumbClearancePx.toFixed(1)}px — inspect the mapping
            (diagnostics logged to console)
          </text>
        )}
      </g>
    </svg>
  );
}
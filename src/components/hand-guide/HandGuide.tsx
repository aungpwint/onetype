import { useMemo } from "react";
import type { FingerId } from "../../types";
import { leftHandSvg, rightHandSvg } from "./hand-assets";
import { resolveFinger } from "./hand-key-map";

interface HandGuideProps {
  activeKey?: string | null;
  shiftKey?: string | null;
  feedbackFinger?: { finger: FingerId; state: "correct" | "error" } | null;
  interactive?: boolean;
  ariaHidden?: boolean;
}

/**
 * Two-handed typing hand guide (bird's-eye typing-club-hands style).
 *
 * Renders the shared `left-hand.svg` / `right-hand.svg` assets (the SAME assets
 * `HandOverlay` uses) so the reference panel always shows the identical pair of
 * hands as the on-keyboard overlay. The responsible finger(s) — the target key's
 * finger plus, when a Shift chord is required, the opposite-hand pinky — are lit
 * via a CSS toggle driven by the container's `data-active-finger` attribute.
 */
export function HandGuide({
  activeKey,
  shiftKey,
  feedbackFinger,
  interactive = true,
  ariaHidden = false,
}: HandGuideProps) {
  const activeFingerList = useMemo(() => {
    if (!interactive) return "";
    const fingers = new Set<string>();

    // The pinky used for a Shift chord highlights first (it owns the modifier).
    if (shiftKey === "ShiftLeft") fingers.add("left-pinky");
    else if (shiftKey === "ShiftRight") fingers.add("right-pinky");

    const target = resolveFinger(activeKey);
    if (target) fingers.add(target);

    return Array.from(fingers).join(" ");
  }, [interactive, activeKey, shiftKey]);

  const feedback = feedbackFinger ? (feedbackFinger.state === "correct" ? "correct" : "incorrect") : null;

  const classes = ["hand-guide", "typing-club-hands"];
  if (feedback) classes.push(`hg-${feedback}`);

  const attrs: Record<string, unknown> = {};
  if (activeFingerList) attrs["data-active-finger"] = activeFingerList;

  return (
    <div
      className={classes.join(" ")}
      aria-hidden={ariaHidden || undefined}
      aria-label={ariaHidden ? undefined : "Hand guide"}
      {...attrs}
    >
      <div
        className="hand-guide-hand"
        aria-hidden
        dangerouslySetInnerHTML={{ __html: leftHandSvg }}
      />
      <div
        className="hand-guide-hand"
        aria-hidden
        dangerouslySetInnerHTML={{ __html: rightHandSvg }}
      />
    </div>
  );
}

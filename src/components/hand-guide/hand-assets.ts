import leftHandRaw from "./left-hand.svg?raw";
import rightHandRaw from "./right-hand.svg?raw";

/**
 * Shared, standalone SVG assets for the two typing hands. Both `HandGuide` and
 * `HandOverlay` render these SAME assets so the reference panel and the on-keyboard
 * overlay always show an identical pair of hands. The artwork is extracted
 * verbatim from `hands.svg` (neutral resting posture) so the visual identity of
 * the typing-club hands is preserved exactly.
 */
export const leftHandSvg = leftHandRaw;
export const rightHandSvg = rightHandRaw;

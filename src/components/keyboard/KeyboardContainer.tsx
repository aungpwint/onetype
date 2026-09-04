import { useMemo, type ReactNode } from "react";
import type { KeyboardLayout } from "../../core/keyboard-layout/layout";
import { useTypingStore } from "../../stores/typing-store";
import { useUiStore } from "../../stores/ui-store";
import { VirtualKeyboard } from "./VirtualKeyboard";
import { HandOverlay } from "../hand-guide/HandOverlay";
import { resolveTarget } from "../../core/target-model";
import { LessonProgress } from "./LessonProgress";

/**
 * Parent wrapper that arranges the Lesson Progress header bar and the virtual
 * key grid, with the programmatic hand overlay shown around the keyboard.
 */
export function KeyboardContainer({ layout }: { layout: KeyboardLayout }) {
  const handGuide = useUiStore((s) => s.handGuideVisible);

  return (
    <div className="select-none">
      {/* ── Lesson Progress header bar ── */}
      <LessonProgress />

      {/* ── Hand-guide + keyboard stack ── */}
      <div className="relative">
        {handGuide ? (
          <IntegratedHandGuide layout={layout}>
            <VirtualKeyboard layout={layout} />
          </IntegratedHandGuide>
        ) : (
          <VirtualKeyboard layout={layout} />
        )}
      </div>
    </div>
  );
}

/**
 * Drives the programmatic hand overlay: fingers dynamically target the active
 * key using real keyboard geometry, with the old typing-club SVG as a fallback.
 */
function IntegratedHandGuide({ layout, children }: { layout: KeyboardLayout; children: ReactNode }) {
  const tick = useTypingStore((s) => s.tick);
  void tick;
  const status = useTypingStore((s) => s.status);
  const engine = useTypingStore((s) => s.engine);
  const target = resolveTarget(engine, engine?.layout ?? null);
  const inPlay = status === "ready" || status === "running";

  const activeKey = useMemo(
    () => (inPlay ? (target.keyCode ?? null) : null),
    [inPlay, target.keyCode],
  );

  const shiftKey = useMemo(() => {
    if (!inPlay || !target.requiresShift) return null;
    return target.shiftHand === "left" ? "ShiftLeft" : target.shiftHand === "right" ? "ShiftRight" : null;
  }, [inPlay, target.requiresShift, target.shiftHand]);

  return (
    <HandOverlay
      layout={layout}
      activeKey={activeKey}
      shiftKey={shiftKey}
      isActive={inPlay}
    >
      {children}
    </HandOverlay>
  );
}
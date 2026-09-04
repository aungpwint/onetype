import { useMemo } from "react";
import type { KeyboardLayout } from "../../core/keyboard-layout/layout";
import { useTypingStore } from "../../stores/typing-store";
import { useUiStore } from "../../stores/ui-store";
import { VirtualKeyboard } from "./VirtualKeyboard";
import { HandGuide } from "../hand-guide/HandGuide";
import { resolveFingerMapping, fingerShort } from "../../utils/fingerMapper";
import { resolveTarget, resolveLastKey } from "../../core/target-model";
import { fingerForCode } from "../../core/finger-mapping/finger-map";

/**
 * Parent wrapper that arranges the Lesson Progress header bar and the virtual
 * key grid, with the whole-hand-per-gesture typing guide (matching the
 * reference Typing Club style) shown above the keyboard.
 */
export function KeyboardContainer({ layout }: { layout: KeyboardLayout }) {
  const handGuide = useUiStore((s) => s.handGuideVisible);

  return (
    <div className="select-none">
      {/* ── Lesson Progress header bar ── */}
      <LessonProgress />

      {/* ── Hand-guide + keyboard stack ── */}
      <div className="relative">
        {handGuide && <IntegratedHandGuide />}
        <VirtualKeyboard layout={layout} />
      </div>
    </div>
  );
}

/**
 * Drives the whole-hand-per-gesture typing guide (the reference "typing-club"
 * asset): the hand that owns the current target key is swapped from its neutral
 * group to the gesture that highlights the responsible finger, and a just-pressed
 * key flashes correct/incorrect.
 */
function IntegratedHandGuide() {
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

  const feedbackFinger = useMemo(() => {
    const last = resolveLastKey(engine);
    if (!last.keyCode) return null;
    return {
      finger: fingerForCode(last.keyCode),
      state: last.correct ? ("correct" as const) : ("error" as const),
    };
  }, [engine]);

  return (
    <HandGuide
      activeKey={activeKey}
      shiftKey={shiftKey}
      feedbackFinger={feedbackFinger}
      interactive={inPlay}
    />
  );
}

// ─── Lesson Progress Header ──────────────────────────────────────────────────

function LessonProgress() {
  const tick = useTypingStore((s) => s.tick);
  void tick;

  const status = useTypingStore((s) => s.status);
  const engine = useTypingStore((s) => s.engine);
  const inPlay = status === "ready" || status === "running";
  if (!inPlay || !engine) return null;

  const unit = engine.expectedUnit;
  if (!unit) return null;

  const total = engine.sequence.units.length;
  const current = unit.index;
  const progress = total > 0 ? Math.round((current / total) * 100) : 0;

  const mapping = resolveFingerMapping(unit.keyCode, unit.modifier === "shift");

  return (
    <div className="mb-3 flex items-center gap-4">
      {/* Progress bar */}
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-linear-to-r from-accent to-accent-strong transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Active finger chip */}
      {mapping.primary ? (
        <span className="shrink-0 rounded-full bg-brass/10 px-2.5 py-0.5 font-mono text-[0.625rem] font-semibold tracking-wider text-brass uppercase ring-1 ring-brass/25">
          {fingerShort(mapping.primary)}
          {mapping.shift ? ` + ${fingerShort(mapping.shift)}` : ""}
        </span>
      ) : null}

      <span className="shrink-0 font-mono text-[0.6875rem] tabular-nums text-muted-foreground">
        {current + 1}/{total}
      </span>
    </div>
  );
}

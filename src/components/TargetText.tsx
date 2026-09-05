import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { useTypingStore } from "@/stores/typing-store";
import { containsMyanmar } from "@/core/unicode/myanmar";
import { graphemeUnitRuns } from "@/core/typing-engine/sequence";

const CARET_ANCHOR = 0.45;
const CONTENT_INSET = 24;

export function TargetText() {
  const tick = useTypingStore((s) => s.tick);
  const session = useTypingStore((s) => s.session);
  const engine = useTypingStore((s) => s.engine);
  const wrongFlash = useTypingStore((s) => s.wrongFlash);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const caretRef = useRef<HTMLSpanElement | null>(null);
  const offsetRef = useRef(0);

  const unitIndex = engine?.unitIndex ?? 0;
  const sequence = engine?.sequence;
  const phases = session?.resolved.phases ?? [];

  const activePhase = useMemo(() => {
    if (phases.length === 0) return null;
    const index = phases.findIndex(
      (p) => unitIndex >= p.startUnit && unitIndex < p.endUnit,
    );

    return phases[index === -1 ? phases.length - 1 : index];
  }, [phases, unitIndex]);

  const activePhaseKey = activePhase
    ? `${activePhase.label}-${activePhase.startUnit}`
    : null;

  const hasMyanmar = activePhase
    ? containsMyanmar(activePhase.text)
    : sequence
      ? containsMyanmar(sequence.text)
      : false;

  const graphemes = useMemo(() => {
    const runs = sequence ? graphemeUnitRuns(sequence) : [];
    if (!activePhase) return runs;
    return runs.filter(
      (g) =>
        g.startUnit >= activePhase.startUnit &&
        g.endUnit <= activePhase.endUnit,
    );
  }, [sequence, activePhase]);

  const motionOffset = useMotionValue(0);
  const springOffset = useSpring(motionOffset, {
    stiffness: 500,
    damping: 45,
    mass: 0.35,
  });

  const sessionKey = session
    ? `${session.kind}-${session.lessonId ?? session.test?.id ?? ""}-${session.attempt}`
    : null;

  const prevSessionKey = useRef<string | null>(null);

  useEffect(() => {
    if (sessionKey && sessionKey !== prevSessionKey.current) {
      prevSessionKey.current = sessionKey;
      offsetRef.current = 0;
      motionOffset.set(0);
    }
  }, [sessionKey, motionOffset]);

  const prevPhaseKey = useRef<string | null>(null);

  useEffect(() => {
    if (activePhaseKey && activePhaseKey !== prevPhaseKey.current) {
      prevPhaseKey.current = activePhaseKey;
      offsetRef.current = 0;
      motionOffset.set(0);
    }
  }, [activePhaseKey, motionOffset]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const viewport = viewportRef.current;
      const caret = caretRef.current;
      if (!viewport || !caret) return;

      const caretRect = caret.getBoundingClientRect();
      if (caretRect.width === 0) return;

      const viewportRect = viewport.getBoundingClientRect();
      const caretCenter =
        caretRect.left + caretRect.width / 2 - viewportRect.left;
      const targetCenter = viewportRect.width * CARET_ANCHOR;
      const delta = caretCenter - targetCenter;

      if (Math.abs(delta) < 0.5) return;

      let nextOffset = offsetRef.current - delta;

      const content = contentRef.current;
      if (content) {
        const contentWidth = content.scrollWidth;
        const viewportWidth = viewportRect.width;
        const maxOffset = Math.max(0, (viewportWidth - contentWidth) / 2);
        const minOffset = Math.min(
          maxOffset,
          viewportWidth - contentWidth - CONTENT_INSET,
        );
        nextOffset = Math.min(maxOffset, Math.max(minOffset, nextOffset));
      }

      if (Math.abs(nextOffset - offsetRef.current) < 0.5) return;

      offsetRef.current = nextOffset;
      motionOffset.set(nextOffset);
    });
    return () => cancelAnimationFrame(raf);
  }, [unitIndex, tick, motionOffset]);

  const onCaretRef = useCallback((el: HTMLSpanElement | null) => {
    caretRef.current = el;
  }, []);

  if (!session || !engine) return null;

  const flashAt = wrongFlash?.unitIndex ?? -1;

  return (
    <motion.div
      className="mx-auto w-full max-w-4xl"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <div className="tt-container">
        <div ref={viewportRef} className="tt-viewport">
          <motion.div
            ref={contentRef}
            className="tt-content"
            style={{ x: springOffset }}
          >
            <motion.p
              key={activePhaseKey ?? "all"}
              className={`${hasMyanmar ? "font-myanmar" : "heavy"} mx-auto whitespace-nowrap text-4xl leading-tight tracking-normal md:text-5xl`}
              style={{ wordSpacing: "0.16em" }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              {graphemes.map((g) => {
                const isCurrent =
                  unitIndex >= g.startUnit && unitIndex < g.endUnit;
                const isCompleted = g.endUnit <= unitIndex;
                return (
                  <Char
                    key={g.index}
                    text={g.text}
                    startUnit={g.startUnit}
                    endUnit={g.endUnit}
                    completed={isCompleted}
                    current={isCurrent}
                    flash={flashAt >= g.startUnit && flashAt < g.endUnit}
                    onCaret={isCurrent ? onCaretRef : undefined}
                  />
                );
              })}
            </motion.p>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

const Char = memo(function Char({
  text,
  startUnit,
  endUnit,
  completed,
  current,
  flash,
  onCaret,
}: {
  text: string;
  startUnit: number;
  endUnit: number;
  completed: boolean;
  current: boolean;
  flash: boolean;
  onCaret?: (el: HTMLSpanElement | null) => void;
}) {
  const engine = useTypingStore.getState().engine;
  let status: "correct" | "incorrect" | "current" | "pending" = "pending";
  if (current) {
    status = "current";
  } else if (completed) {
    let incorrect = false;
    for (let u = startUnit; u < endUnit; u++) {
      if (engine?.unitOutcomeAt(u) === "incorrect") {
        incorrect = true;
        break;
      }
    }
    status = incorrect ? "incorrect" : "correct";
  }

  if (status === "current") {
    return (
      <span
        ref={onCaret}
        className={`tt-char tt-char-now ${flash ? "tt-char-flash" : "tt-char-focus"}`}
      >
        <span className="char-pop">{text}</span>
        <span className="tt-caret" aria-hidden />
      </span>
    );
  }

  const cls =
    status === "correct"
      ? "tt-char tt-char-ok"
      : status === "incorrect"
        ? "tt-char tt-char-miss"
        : "tt-char tt-char-typed";

  return <span className={cls}>{text}</span>;
});

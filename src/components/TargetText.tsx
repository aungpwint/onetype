import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useTypingStore } from "../stores/typing-store";

export function TargetText() {
  const tick = useTypingStore((s) => s.tick);
  const { session, engine } = useTypingStore.getState();

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const caretRef = useRef<HTMLSpanElement | null>(null);
  const unitIndex = engine?.unitIndex ?? 0;

  useEffect(() => {
    const caret = caretRef.current;
    const scroller = scrollRef.current;
    if (!caret || !scroller) return;
    const sc = scroller.getBoundingClientRect();
    const cc = caret.getBoundingClientRect();
    if (cc.width === 0) return;
    const targetLeft = scroller.scrollLeft + (cc.left - sc.left) - (sc.width - cc.width) / 2;
    scroller.scrollTo({ left: Math.max(0, targetLeft), behavior: "smooth" });
  }, [unitIndex, tick]);

  if (!session || !engine) return null;
  const units = engine.sequence.units;
  const visibleUnits = units.slice(unitIndex);

  return (
    <motion.div
      className="tt-container"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <div ref={scrollRef} className="scrollbar-none overflow-x-auto">
        <p
          className="heavy mx-auto w-max whitespace-nowrap text-4xl leading-normal tracking-normal md:text-5xl"
          style={{ wordSpacing: "0.2em" }}
        >
          {visibleUnits.map((unit) => (
            <Char
              key={unit.index}
              text={unit.text}
              index={unit.index}
              onCaret={(el) => {
                if (unit.index === unitIndex) caretRef.current = el;
              }}
            />
          ))}
        </p>
      </div>
    </motion.div>
  );
}

function Char({
  text,
  index,
  onCaret,
}: {
  text: string;
  index: number;
  onCaret: (el: HTMLSpanElement | null) => void;
}) {
  const { engine, wrongFlash } = useTypingStore.getState();
  const currentUnitIndex = engine?.unitIndex ?? 0;
  const status =
    index < currentUnitIndex ? (engine?.unitOutcomeAt(index) ?? "pending") : index === currentUnitIndex ? "current" : "pending";
  const flash = wrongFlash?.unitIndex === index;

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
}
import type { CSSProperties } from "react";
import { useTypingStore } from "../stores/typing-store";

export function TargetText() {
  const tick = useTypingStore((s) => s.tick);
  void tick;
  const { session, engine } = useTypingStore.getState();

  if (!session || !engine) return null;

  const unitIndex = engine.unitIndex;
  const wrongFlash = useTypingStore.getState().wrongFlash;
  const phases = session.resolved.phases;
  const units = engine.sequence.units;

  return (
    <div className="space-y-4">
      {phases.map((phase) => {
        const slice = units.slice(phase.startUnit, phase.endUnit);
        const isCurrentPhase = unitIndex >= phase.startUnit && unitIndex < phase.endUnit;
        return (
          <section key={phase.label} className={`rounded-lg border ${isCurrentPhase ? "border-line-strong" : "border-line"}`}>
            <div className={`flex items-baseline justify-between border-b px-3 py-1.5 ${isCurrentPhase ? "border-line-strong" : "border-line"}`}>
              <h3 className="font-mono text-xs text-ink-faint">
                {phase.label}
              </h3>
              <p className="ms text-xs text-ink-soft">{phase.instruction}</p>
            </div>
            <div
              className={`flex flex-wrap items-end gap-x-1.5 gap-y-2 px-3 py-4 leading-loose ${
                isCurrentPhase ? "" : "opacity-50"
              }`}
              aria-label="Practice text"
            >
              {slice.map((unit, offset) => {
                const index = phase.startUnit + offset;
                const status =
                  index < unitIndex ? engine.unitOutcomeAt(index) : index === unitIndex ? "current" : "pending";
                const isSpace = unit.text === " ";
                const flash = wrongFlash?.unitIndex === index;

                let cls = "inline-block rounded px-0.5 text-lg ms";
                let extra: CSSProperties | undefined;

                if (status === "correct") cls += " text-success";
                else if (status === "incorrect") cls += " text-alert line-through decoration-2";
                else if (status === "current") cls += " " + (flash ? "flash-wrong" : "");
                else cls += " text-ink-faint/60";

                if (status === "current") {
                  extra = {
                    background: "color-mix(in srgb, var(--brass) 24%, transparent)",
                    boxShadow: "0 2px 0 var(--brass-strong)",
                  };
                }

                return (
                  <span
                    key={index}
                    className={cls}
                    style={extra}
                    data-unit={index}
                    data-status={status === "pending" ? "pending" : status}
                  >
                    {isSpace ? "\u00b7" : unit.text}
                  </span>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
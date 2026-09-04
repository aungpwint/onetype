import { useTypingStore } from "../../stores/typing-store";
import { resolveFingerMapping, fingerShort } from "../../utils/fingerMapper";

export function LessonProgress() {
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

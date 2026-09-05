import { useTypingStore } from "@/stores/typing-store";
import { resolveFingerMapping, fingerShort } from "@/utils/fingerMapper";

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
    <div className="flex w-full items-center gap-3">
      <div
        className="h-1 flex-1 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
        aria-label="Lesson progress"
      >
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {mapping.primary ? (
        <span
          className="shrink-0 rounded-full bg-accent/10 px-2 py-px font-mono text-[0.625rem] font-semibold tracking-wider text-accent uppercase"
          title={
            mapping.shift
              ? `${fingerShort(mapping.shift)} + ${fingerShort(mapping.primary)}`
              : fingerShort(mapping.primary)
          }
        >
          {fingerShort(mapping.primary)}
          {mapping.shift ? ` + ${fingerShort(mapping.shift)}` : ""}
        </span>
      ) : null}

      <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
        {current + 1}/{total}
      </span>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useTypingStore } from "../stores/typing-store";
import { formatDuration } from "../lib/format";

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success" | "destructive" | "muted";
}) {
  const color =
    tone === "success"
      ? "text-success"
      : tone === "destructive"
        ? "text-destructive"
        : "text-foreground";
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className={`tnum text-lg font-semibold leading-none md:text-xl ${color}`}>{value}</span>
      <span className="text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

export function StatsBar() {
  // Re-render on every keystroke (tick) so WPM/accuracy update immediately,
  // plus a light interval that ticks the clock only while running.
  const tick = useTypingStore((s) => s.tick);
  const status = useTypingStore((s) => s.status);
  void tick;
  const [, force] = useState(0);

  const running = status === "running";

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => force((n) => n + 1), 250);
    return () => window.clearInterval(id);
  }, [running]);

  const stats = useTypingStore.getState().getLiveStats();
  const durationSeconds = useTypingStore.getState().session?.durationSeconds ?? null;
  const engine = useTypingStore.getState().engine;
  const remaining = durationSeconds !== null && engine ? Math.max(0, durationSeconds - engine.elapsedSeconds()) : null;

  const wpm = Math.round(stats.wpm);
  const progress = stats.totalUnits > 0 ? Math.round((stats.unitIndex / stats.totalUnits) * 100) : 0;

  return (
    <div className="flex w-full flex-col items-center">
      <div className="flex items-baseline justify-center gap-3">
        <span className="tnum text-6xl font-semibold leading-none tracking-tight text-foreground sm:text-7xl">
          {wpm}
        </span>
        <span className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">WPM</span>
      </div>

      <div className="mt-3 flex items-center gap-5">
        <Metric label="Accuracy" value={`${stats.accuracy.toFixed(1)}%`} />
        <span className="h-4 w-px bg-line-strong/60" aria-hidden />
        <Metric
          label={durationSeconds !== null ? "Time" : "Progress"}
          value={
            durationSeconds !== null && remaining !== null
              ? formatDuration(remaining * 1000)
              : `${progress}%`
          }
        />
        <span className="h-4 w-px bg-line-strong/60" aria-hidden />
        <Metric
          label="Errors"
          value={String(stats.incorrectCount)}
          tone={stats.incorrectCount > 0 ? "destructive" : "muted"}
        />
      </div>
    </div>
  );
}
import { useEffect, useState } from "react";
import { useTypingStore } from "../stores/typing-store";
import { formatDuration } from "../lib/format";

function CompactStat({
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
    <span className="inline-flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`tnum font-medium ${color}`}>{value}</span>
    </span>
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
    <div className="flex flex-col gap-1.5">
      <div className="flex items-end justify-center gap-2">
        <span className="tnum text-5xl font-semibold leading-none tracking-tight text-foreground">
          {wpm}
        </span>
        <span className="mb-0.5 text-sm font-medium text-muted-foreground">WPM</span>
      </div>

      <div className="mx-auto flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-sm">
        <CompactStat label="Accuracy" value={`${stats.accuracy.toFixed(1)}%`} />
        <CompactStat
          label={durationSeconds !== null ? "Time" : "Progress"}
          value={
            durationSeconds !== null && remaining !== null
              ? formatDuration(remaining * 1000)
              : `${progress}%`
          }
        />
        <CompactStat
          label="Errors"
          value={String(stats.incorrectCount)}
          tone={stats.incorrectCount > 0 ? "destructive" : "muted"}
        />
      </div>
    </div>
  );
}
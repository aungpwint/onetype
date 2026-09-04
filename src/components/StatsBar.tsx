import { useEffect, useState } from "react";
import { Gauge, Timer, Target, AlignLeft, Pause } from "lucide-react";
import { useTypingStore } from "../stores/typing-store";
import { formatDuration } from "../lib/format";
import { cn } from "../lib/utils";

function StatItem({
  icon,
  label,
  value,
  emphasize,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border bg-card px-4 py-2.5 shadow-sm transition-colors",
        emphasize ? "border-brass" : "border-border",
      )}
      title={label}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="eyebrow block leading-none">{label}</span>
        <span className="tnum mt-1 block font-display text-lg leading-none md:text-xl">{value}</span>
      </span>
    </div>
  );
}

export function StatsBar() {
  const tick = useTypingStore((s) => s.tick);
  void tick;
  const [, force] = useState(0);
  const status = useTypingStore((s) => s.status);

  useEffect(() => {
    const id = window.setInterval(() => force((n) => n + 1), 250);
    return () => window.clearInterval(id);
  }, []);

  const stats = useTypingStore.getState().getLiveStats();
  const durationSeconds = useTypingStore.getState().session?.durationSeconds ?? null;
  const engine = useTypingStore.getState().engine;
  const remaining = durationSeconds !== null && engine ? Math.max(0, durationSeconds - engine.elapsedSeconds()) : null;

  const isPaused = status === "paused";

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatItem icon={<Gauge className="size-4" />} label="WPM" value={String(Math.round(stats.wpm))} />
      <StatItem icon={<AlignLeft className="size-4" />} label="CPM" value={String(Math.round(stats.cpm))} />
      <StatItem icon={<Target className="size-4" />} label="Accuracy" value={`${stats.accuracy.toFixed(1)}%`} />
      <StatItem
        icon={isPaused ? <Pause className="size-4" /> : <Timer className="size-4" />}
        label={durationSeconds !== null ? "Time" : "Progress"}
        value={
          durationSeconds !== null && remaining !== null
            ? formatDuration(remaining * 1000)
            : `${stats.unitIndex}/${stats.totalUnits}`
        }
        emphasize={isPaused}
      />
    </div>
  );
}

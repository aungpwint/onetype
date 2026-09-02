import { useEffect, useState } from "react";
import { useTypingStore } from "../stores/typing-store";
import { formatDuration } from "../lib/format";

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
    <div className="grid grid-cols-4 gap-3">
      <div className="card px-4 py-2.5">
        <p className="eyebrow">WPM</p>
        <p className="tnum mt-0.5 font-display text-2xl">{Math.round(stats.wpm)}</p>
      </div>
      <div className="card px-4 py-2.5">
        <p className="eyebrow">CPM</p>
        <p className="tnum mt-0.5 font-display text-2xl">{Math.round(stats.cpm)}</p>
      </div>
      <div className="card px-4 py-2.5">
        <p className="eyebrow">Accuracy</p>
        <p className="tnum mt-0.5 font-display text-2xl">{stats.accuracy.toFixed(1)}%</p>
      </div>
      <div
        className={`card px-4 py-2.5 ${isPaused ? "border-brass" : ""}`}
        title={durationSeconds !== null ? "Time remaining" : "Text progress"}
      >
        <p className="eyebrow">{durationSeconds !== null ? "Time" : "Progress"}</p>
        <p className="tnum mt-0.5 font-display text-2xl">
          {durationSeconds !== null && remaining !== null ? formatDuration(remaining * 1000) : `${stats.unitIndex}/${stats.totalUnits}`}
        </p>
      </div>
    </div>
  );
}
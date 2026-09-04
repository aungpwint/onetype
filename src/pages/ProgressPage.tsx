import { useEffect, useState } from "react";
import { TrendingUp, Target, Gauge, Clock, TrendingDown, Minus, Fingerprint } from "lucide-react";
import { useStudentStore } from "../stores/student-store";
import * as backend from "../services/backend";
import type { StudentDetail, TypingSession } from "../services/types";
import { Stat, Spinner } from "../components/ui";
import { formatDateTime } from "../lib/format";
import { summarizePerformance } from "../core/analytics";
import type { SessionPoint } from "../core/analytics";

type Range = "week" | "month" | "all";

function inRange(s: TypingSession, range: Range): boolean {
  if (range === "all") return true;
  const now = Date.now();
  const ms = range === "week" ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
  return s.startedAt >= now - ms;
}

function WpmBars({ values }: { values: number[] }) {
  const w = 480;
  const h = 110;
  const pad = 4;
  const max = Math.max(1, ...values);
  const n = values.length;
  const barW = n > 0 ? (w - pad * (n + 1)) / n : w;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="WPM over recent sessions">
      {values.map((value, i) => {
        const bh = Math.max(2, (value / max) * (h - 14));
        const x = pad + i * (barW + pad);
        return (
          <g key={i}>
            <rect x={x} y={h - bh} width={barW} height={bh} rx={2} fill="var(--accent)" />
            <text x={x + barW / 2} y={h - bh - 3} textAnchor="middle" fontSize="8" fill="var(--ink-faint)" fontFamily="ui-monospace, monospace">
              {Math.round(value)}
            </text>
          </g>
        );
      })}
      {values.length === 0 ? (
        <text x={w / 2} y={h / 2} textAnchor="middle" fontSize="12" fill="var(--ink-faint)">
          No completed sessions yet
        </text>
      ) : null}
      <line x1={0} y1={h - 0.5} x2={w} y2={h - 0.5} stroke="var(--line-strong)" />
    </svg>
  );
}

function AccChart({ values }: { values: number[] }) {
  const w = 480;
  const h = 90;
  const points = values.map((v, i) => {
    const x = values.length === 1 ? 0 : (i / (values.length - 1)) * w;
    const y = h - (v / 100) * (h - 16);
    return `${x},${y}`;
  });
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Accuracy over recent sessions">
      <line x1={0} y1={h - 0.5} x2={w} y2={h - 0.5} stroke="var(--line-strong)" />
      {points.length > 1 ? (
        <polyline points={points.join(" ")} fill="none" stroke="var(--brass)" strokeWidth={2} />
      ) : points.length === 1 ? (
        <circle cx={points[0].split(",")[0]} cy={points[0].split(",")[1]} r={3} fill="var(--brass)" />
      ) : null}
    </svg>
  );
}

function formatTrend(slope: number): string {
  return `${slope >= 0 ? "+" : ""}${slope.toFixed(2)}`;
}

function TrendRow({
  label,
  slope,
  valid,
  unit,
}: {
  label: string;
  slope: number;
  valid: boolean;
  unit: string;
}) {
  const up = slope > 0.0001;
  const down = slope < -0.0001;
  const cls = valid ? (up ? "text-success" : down ? "text-destructive" : "text-muted-foreground") : "text-muted-foreground";
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`tnum ${cls}`}>
        {valid ? (
          <>
            {up ? <TrendingUp className="mr-1 inline size-3.5" /> : down ? <TrendingDown className="mr-1 inline size-3.5" /> : <Minus className="mr-1 inline size-3.5" />}
            {formatTrend(slope)} {unit}/per session
          </>
        ) : (
          "need 2+ sessions"
        )}
      </span>
    </div>
  );
}

export default function ProgressPage() {
  const active = useStudentStore((s) => s.active);
  const [detail, setDetail] = useState<StudentDetail | null>(null);
  const [range, setRange] = useState<Range>("all");

  useEffect(() => {
    if (!active) return;
    void (async () => {
      setDetail(await backend.studentDetail(active.id));
    })();
  }, [active]);

  if (!active) return null;
  if (!detail)
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <Spinner label="Tallying the marks…" />
      </div>
    );

  const sessions = detail.recentSessions.filter((s) => s.correctCount > 0 && inRange(s, range));
  const wpmSeries = sessions.map((s) => s.wpm).slice(0, 24);
  const accSeries = sessions.map((s) => s.accuracy).slice(0, 24);
  const rangeSessions = sessions.length;
  const rangeMinutes = sessions.reduce((sum, s) => sum + s.durationMs, 0) / 60000;
  const rangeWpm = rangeSessions ? sessions.reduce((sum, s) => sum + s.wpm, 0) / rangeSessions : 0;
  const rangeBest = rangeSessions ? Math.max(...sessions.map((s) => s.wpm)) : 0;

  const points: SessionPoint[] = sessions.map((s) => ({
    startedAt: s.startedAt,
    wpm: s.wpm,
    accuracy: s.accuracy,
    correctCount: s.correctCount,
    errorCount: s.errorCount,
  }));
  const summary = summarizePerformance(points);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <header>
        <p className="eyebrow">For {active.displayName}</p>
        <h1 className="mt-1 font-display text-3xl tracking-tight">Progress</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything is derived from your saved typing sessions — accuracy, speed, and the keys that need attention.
        </p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid w-full grid-cols-2 gap-3 lg:w-auto lg:grid-cols-4">
          <Stat icon={<Target className="size-4" />} label="Avg accuracy" value={`${summary.pooledAccuracy.toFixed(1)}%`} />
          <Stat icon={<Gauge className="size-4" />} label="Avg WPM" value={rangeSessions ? Math.round(rangeWpm) : "—"} />
          <Stat icon={<Clock className="size-4" />} label="Minutes practiced" value={`${rangeMinutes.toFixed(0)}`} />
          <Stat icon={<TrendingUp className="size-4" />} label="Best WPM" value={rangeSessions ? Math.round(rangeBest) : "—"} />
        </div>
        <div className="flex overflow-hidden rounded-md border border-border bg-background">
          {(["week", "month", "all"] as Range[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 text-xs capitalize transition-colors ${range === r ? "bg-accent font-medium text-accent-ink" : "text-muted-foreground hover:bg-muted"}`}
            >
              {r === "week" ? "This week" : r === "month" ? "This month" : "All time"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="font-display text-lg">Speed, last sessions</h2>
          <div className="mt-3">
            <WpmBars values={wpmSeries} />
          </div>
        </div>
        <div className="card p-5">
          <h2 className="font-display text-lg">Accuracy, last sessions</h2>
          <div className="mt-3">
            <AccChart values={accSeries} />
          </div>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg">Trend &amp; consistency</h2>
          <span className="text-xs text-muted-foreground">{rangeSessions} session{rangeSessions === 1 ? "" : "s"} in range</span>
        </div>
        <div className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-3">
          <div className="space-y-2">
            <p className="eyebrow">Accuracy trend</p>
            <TrendRow label="direction" slope={summary.accuracyTrend.slope} valid={summary.accuracyTrend.valid} unit="pp" />
          </div>
          <div className="space-y-2">
            <p className="eyebrow">Speed trend</p>
            <TrendRow label="direction" slope={summary.wpmTrend.slope} valid={summary.wpmTrend.valid} unit="wpm" />
          </div>
          <div className="space-y-2">
            <p className="eyebrow">Consistency</p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">WPM spread</span>
              <span className={summary.wpmVariability === 0 ? "tnum text-muted-foreground" : summary.wpmVariability <= 0.2 ? "tnum text-success" : summary.wpmVariability <= 0.35 ? "tnum text-brass" : "tnum text-destructive"}>
                {summary.wpmVariability === 0 ? "—" : `${(summary.wpmVariability * 100).toFixed(0)}%`}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {summary.wpmVariability === 0 ? "Unavailable yet." : summary.wpmVariability <= 0.2 ? "Steady pace" : summary.wpmVariability <= 0.35 ? "Some drift" : "Highly varied"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <h2 className="font-display text-lg">Curriculum levels</h2>
          <ul className="mt-4 space-y-3">
            {detail.lessonCounts.map((lc) => (
              <li key={lc.level}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="capitalize text-muted-foreground">{lc.level}</span>
                  <span className="tnum text-xs text-muted-foreground">
                    {lc.completed} / {lc.total}
                  </span>
                </div>
                <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${(lc.completed / Math.max(1, lc.total)) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
          {detail.testResults.length > 0 ? (
            <div className="mt-5 border-t border-border pt-4">
              <h3 className="text-sm font-medium text-muted-foreground">Timed tests bests</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {Array.from(
                  detail.testResults
                    .reduce<Map<string, typeof detail.testResults[number]>>((map, t) => {
                      const prev = map.get(t.testId);
                      if (!prev || t.wpm > prev.wpm) map.set(t.testId, t);
                      return map;
                    }, new Map())
                    .values(),
                ).map((t) => (
                  <span key={t.id} className="chip">
                    <span className="tnum">{t.testId}</span>
                    <span className="tnum text-success">{Math.round(t.wpm)} wpm</span>
                    <span className="tnum">{t.accuracy.toFixed(0)}%</span>
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <h2 className="flex items-center gap-2 font-display text-lg">
              <Fingerprint className="size-4 text-muted-foreground" />
              Weak keys
            </h2>
            <ul className="mt-3 space-y-2">
              {detail.weakKeys.slice(0, 6).map((k) => (
                <li key={k.key} className="flex items-center justify-between text-sm">
                  <span className="ms rounded border border-border bg-muted px-2 py-0.5">{k.key}</span>
                  <span className="tnum text-muted-foreground">
                    {k.attempts} tries · {k.accuracy.toFixed(0)}%
                  </span>
                </li>
              ))}
              {detail.weakKeys.length === 0 ? <li className="text-sm text-muted-foreground">No data yet.</li> : null}
            </ul>
          </div>
          <div className="card p-5">
            <h2 className="flex items-center gap-2 font-display text-lg">
              <Fingerprint className="size-4 text-muted-foreground" />
              Weak fingers
            </h2>
            <ul className="mt-3 space-y-2">
              {detail.weakFingers.slice(0, 6).map((k) => (
                <li key={k.finger} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{k.finger}</span>
                  <span className="tnum text-muted-foreground">
                    {k.attempts} tries · {k.accuracy.toFixed(0)}%
                  </span>
                </li>
              ))}
              {detail.weakFingers.length === 0 ? <li className="text-sm text-muted-foreground">No data yet.</li> : null}
            </ul>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <h2 className="border-b border-border px-5 py-3 font-display text-lg">Recent sessions</h2>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-5 py-2 font-normal">When</th>
              <th className="px-5 py-2 font-normal">Lesson</th>
              <th className="px-5 py-2 text-right font-normal">WPM</th>
              <th className="px-5 py-2 text-right font-normal">Acc</th>
              <th className="px-5 py-2 text-right font-normal">Errors</th>
            </tr>
          </thead>
          <tbody>
            {sessions.slice(0, 15).map((s) => (
              <tr key={s.id} className="border-t border-border hover:bg-muted/40">
                <td className="px-5 py-2 text-muted-foreground">{formatDateTime(s.startedAt)}</td>
                <td className="ms px-5 py-2">{s.lessonId?.replace(/^lesson-(en|my)-/, "") ?? "timed test"}</td>
                <td className="tnum px-5 py-2 text-right">{Math.round(s.wpm)}</td>
                <td className="tnum px-5 py-2 text-right">{s.accuracy.toFixed(0)}%</td>
                <td className="tnum px-5 py-2 text-right text-muted-foreground">{s.errorCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
import { useEffect, useState } from "react";
import { useStudentStore } from "../stores/student-store";
import * as backend from "../services/backend";
import type { StudentDetail, TypingSession } from "../services/types";
import { Stat, Spinner } from "../components/ui";
import { formatDateTime } from "../lib/format";

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
  const rangeAcc = rangeSessions ? sessions.reduce((sum, s) => sum + s.accuracy, 0) / rangeSessions : 0;
  const rangeBest = rangeSessions ? Math.max(...sessions.map((s) => s.wpm)) : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <header>
        <p className="eyebrow">For {active.displayName}</p>
        <h1 className="mt-1 font-display text-3xl">Progress</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Everything is derived from your saved typing sessions — accuracy, speed, and the keys that need attention.
        </p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Avg accuracy" value={`${rangeAcc.toFixed(1)}%`} />
          <Stat label="Avg WPM" value={rangeSessions ? Math.round(rangeWpm) : "—"} />
          <Stat label="Minutes practiced" value={`${rangeMinutes.toFixed(0)}`} />
          <Stat label="Best WPM" value={rangeSessions ? Math.round(rangeBest) : "—"} />
        </div>
        <div className="flex overflow-hidden rounded-lg border border-line">
          {(["week", "month", "all"] as Range[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 text-xs capitalize transition-colors ${range === r ? "bg-brass text-[color:var(--paper)]" : "bg-paper text-ink-soft hover:bg-paper-2"}`}
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

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <h2 className="font-display text-lg">Curriculum levels</h2>
          <ul className="mt-4 space-y-3">
            {detail.lessonCounts.map((lc) => (
              <li key={lc.level}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="capitalize text-ink-soft">{lc.level}</span>
                  <span className="tnum text-xs text-ink-faint">
                    {lc.completed} / {lc.total}
                  </span>
                </div>
                <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-paper-2">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${(lc.completed / Math.max(1, lc.total)) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
          {detail.testResults.length > 0 ? (
            <div className="mt-5 border-t border-line pt-4">
              <h3 className="text-sm font-medium text-ink-soft">Timed tests bests</h3>
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
            <h2 className="font-display text-lg">Weak keys</h2>
            <ul className="mt-3 space-y-2">
              {detail.weakKeys.slice(0, 6).map((k) => (
                <li key={k.key} className="flex items-center justify-between text-sm">
                  <span className="ms rounded border border-line bg-paper-2 px-2 py-0.5">{k.key}</span>
                  <span className="tnum text-ink-faint">
                    {k.attempts} tries · {k.accuracy.toFixed(0)}%
                  </span>
                </li>
              ))}
              {detail.weakKeys.length === 0 ? <li className="text-sm text-ink-faint">No data yet.</li> : null}
            </ul>
          </div>
          <div className="card p-5">
            <h2 className="font-display text-lg">Weak fingers</h2>
            <ul className="mt-3 space-y-2">
              {detail.weakFingers.slice(0, 6).map((k) => (
                <li key={k.finger} className="flex items-center justify-between text-sm">
                  <span className="text-ink-soft">{k.finger}</span>
                  <span className="tnum text-ink-faint">
                    {k.attempts} tries · {k.accuracy.toFixed(0)}%
                  </span>
                </li>
              ))}
              {detail.weakFingers.length === 0 ? <li className="text-sm text-ink-faint">No data yet.</li> : null}
            </ul>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <h2 className="border-b border-line px-5 py-3 font-display text-lg">Recent sessions</h2>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-ink-faint">
              <th className="px-5 py-2 font-normal">When</th>
              <th className="px-5 py-2 font-normal">Lesson</th>
              <th className="px-5 py-2 font-normal text-right">WPM</th>
              <th className="px-5 py-2 font-normal text-right">Acc</th>
              <th className="px-5 py-2 font-normal text-right">Errors</th>
            </tr>
          </thead>
          <tbody>
            {sessions.slice(0, 15).map((s) => (
              <tr key={s.id} className="border-t border-line">
                <td className="px-5 py-2 text-ink-soft">{formatDateTime(s.startedAt)}</td>
                <td className="ms px-5 py-2">{s.lessonId?.replace(/^lesson-(en|my)-/, "") ?? "timed test"}</td>
                <td className="tnum px-5 py-2 text-right">{Math.round(s.wpm)}</td>
                <td className="tnum px-5 py-2 text-right">{s.accuracy.toFixed(0)}%</td>
                <td className="tnum px-5 py-2 text-right text-ink-soft">{s.errorCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Flame, Trophy, Timer, Target, Gauge, BookOpen, BarChart3 } from "lucide-react";
import { useStudentStore } from "../stores/student-store";
import { useLessonStore } from "../stores/lesson-store";
import { useSettingsStore } from "../stores/settings-store";
import { useProgressionStore } from "../stores/progression-store";
import * as backend from "../services/backend";
import type { TypingSession, TypingTest } from "../services/types";
import { ACHIEVEMENT_CATALOG } from "../data/achievements";
import { Spinner, Stat } from "../components/ui";
import { Button } from "../components/ui/button";
import { formatDuration } from "../lib/format";

function hourGreeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Late night practice";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Night practice";
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

export default function Dashboard() {
  const active = useStudentStore((s) => s.active);
  const progress = useLessonStore((s) => s.progress);
  const progressStudentId = useLessonStore((s) => s.progressStudentId);
  const loadProgress = useLessonStore((s) => s.loadProgress);
  const lessonsByLevel = useLessonStore((s) => s.lessonsByLevel);
  const defaultLang = useSettingsStore((s) => s.get("app.language"));
  const streak = useProgressionStore((s) => s.streak);
  const unlocked = useProgressionStore((s) => s.unlocked);
  const summary = useProgressionStore((s) => s.summary);
  const loadProgression = useProgressionStore((s) => s.load);

  const [sessions, setSessions] = useState<TypingSession[] | null>(null);
  const [tests, setTests] = useState<TypingTest[]>([]);
  const [testResults, setTestResults] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    if (!active) return;
    void loadProgress(active.id);
    void loadProgression(active.id);
    void (async () => {
      setSessions(await backend.listTypingSessions(active.id, 30));
    })();
    void (async () => {
      const [all, results] = await Promise.all([backend.listTypingTests(), backend.listTestResults(active.id)]);
      setTests(all);
      const best = new Map<string, number>();
      for (const r of results) {
        const prev = best.get(r.testId) ?? -1;
        if (r.wpm > prev) best.set(r.testId, r.wpm);
      }
      setTestResults(best);
    })();
  }, [active, loadProgress, loadProgression]);

  const stats = useMemo(() => {
    const rows = sessions ?? [];
    const withKeys = rows.filter((s) => s.correctCount > 0);
    const avgWpm = withKeys.length ? withKeys.reduce((sum, s) => sum + s.wpm, 0) / withKeys.length : 0;
    const avgAcc = withKeys.length ? withKeys.reduce((sum, s) => sum + s.accuracy, 0) / withKeys.length : 0;
    const completed = progress ? Object.values(progress).filter((p) => p.completed).length : 0;
    const passedTests = testResults.size;
    const bestWpm = withKeys.length ? Math.max(...withKeys.map((s) => s.wpm)) : 0;
    return { avgWpm, avgAcc, completed, passedTests, totalSessions: rows.length, bestWpm };
  }, [sessions, progress, testResults]);

  const languageStats = useMemo(() => {
    const rows = (sessions ?? []).filter((s) => s.correctCount > 0);
    const byLang: Record<string, { sessions: number; wpmSum: number; minutes: number }> = {};
    for (const s of rows) {
      const lang = s.lessonId?.startsWith("lesson-my-") ? "myanmar" : s.lessonId?.startsWith("lesson-en-") ? "english" : "mixed";
      const cur = (byLang[lang] ??= { sessions: 0, wpmSum: 0, minutes: 0 });
      cur.sessions += 1;
      cur.wpmSum += s.wpm;
      cur.minutes += s.durationMs / 60000;
    }
    return Object.entries(byLang).map(([lang, v]) => ({
      lang,
      sessions: v.sessions,
      avgWpm: v.sessions ? Math.round(v.wpmSum / v.sessions) : 0,
      minutes: Math.round(v.minutes),
    }));
  }, [sessions]);

  const unlockedById = useMemo(() => new Set(unlocked.map((u) => u.achievementId)), [unlocked]);

  const nextLesson = useMemo(() => {
    if (!progress) return null;
    for (const level of ["beginner", "intermediate", "advanced"] as const) {
      const ordered = lessonsByLevel[level]
        .filter((l) => l.language === (defaultLang === "myanmar" ? "myanmar" : "english"))
        .sort((a, b) => a.number - b.number);
      const first = ordered.find((l) => !progress[l.id]?.completed);
      if (first) return first;
    }
    return null;
  }, [progress, lessonsByLevel, defaultLang]);

  if (!active) return null;
  const progressLoaded = progressStudentId === active.id && (progress ?? false);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{hourGreeting()}</p>
          <h1 className="mt-1 font-display text-3xl tracking-tight">
            {active.displayName} <span className="ms text-muted-foreground">မင်္ဂလာပါ</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Keep your hands on home row — <span className="kbd">F</span> and <span className="kbd">J</span> are your anchor nubs.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/progress">
            View full progress
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={<Gauge className="size-4" />} label="Avg WPM" value={stats.avgWpm ? Math.round(stats.avgWpm) : "—"} />
        <Stat icon={<Target className="size-4" />} label="Avg accuracy" value={stats.avgAcc ? `${stats.avgAcc.toFixed(1)}%` : "—"} />
        <Stat icon={<BookOpen className="size-4" />} label="Lessons passed" value={progressLoaded ? stats.completed : "…"} />
        <Stat icon={<Timer className="size-4" />} label="Tests passed" value={tests.length ? stats.passedTests : "…"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Link to={nextLesson ? `/lesson/${nextLesson.id}` : "/learn"} className="card group p-5 transition-colors hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <p className="eyebrow">Continue learning</p>
          <div className="mt-3 flex items-center justify-between">
            <span className="ms font-display text-xl leading-tight">{nextLesson ? nextLesson.title : "Curriculum finished"}</span>
            <ArrowRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {nextLesson ? `Level ${nextLesson.level} · line ${nextLesson.number}` : "Every line passed. Try a timed test."}
          </p>
        </Link>

        <div className="card p-5">
          <p className="flex items-center gap-1.5 eyebrow">
            <Flame className="size-3.5 text-brass" />
            Streak
          </p>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="tnum font-display text-4xl">{streak?.current ?? "•"}</span>
            <span className="text-sm text-muted-foreground">days{streak?.current === 1 ? "" : "s"}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {streak && streak.longest > 0 ? `Longest streak: ${streak.longest} days` : "Type daily to build a streak."}
          </p>
        </div>

        <div className="card p-5">
          <p className="flex items-center gap-1.5 eyebrow">
            <Trophy className="size-3.5 text-brass" />
            Personal bests
          </p>
          <dl className="mt-3 space-y-1.5 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Fastest WPM</dt><dd className="tnum">{stats.bestWpm ? Math.round(stats.bestWpm) : "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Typing time</dt><dd className="tnum">{summary ? formatDuration(summary.totalMinutes * 60000) : "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Sessions</dt><dd className="tnum">{summary?.sessions ?? "—"}</dd></div>
          </dl>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <h2 className="font-display text-lg">Speed, recent sessions</h2>
            <Link to="/progress" className="text-sm font-medium text-accent hover:underline">
              Chart
              <ArrowRight className="ml-1 inline size-3.5" />
            </Link>
          </div>
          <div className="p-5">
            <WpmBars values={(sessions ?? []).filter((s) => s.correctCount > 0).map((s) => s.wpm).slice(0, 24)} />
          </div>
        </div>

        <div className="card p-5">
          <h2 className="font-display text-lg">Achievements</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(ACHIEVEMENT_CATALOG).map(([id, def]) => {
              const earned = unlockedById.has(id);
              return (
                <span
                  key={id}
                  title={earned ? `${def.title} — ${def.description}` : `Locked — ${def.description}`}
                  className={`flex h-10 w-10 items-center justify-center rounded-lg border text-lg transition-all ${earned ? "border-transparent" : "opacity-35 grayscale"}`}
                  style={earned ? { background: `${def.color}22`, borderColor: `${def.color}66` } : undefined}
                >
                  <span aria-hidden>{def.icon}</span>
                  <span className="sr-only">{earned ? `${def.title} unlocked` : def.title}</span>
                </span>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <p className="eyebrow">Level progress</p>
          <ul className="mt-3 space-y-2">
            {(["beginner", "intermediate", "advanced"] as const).map((level) => {
              const list = lessonsByLevel[level];
              const langList = list.filter((l) => l.language === "myanmar" && l.level === level);
              const done = langList.filter((l) => progress?.[l.id]?.completed).length;
              const total = langList.length;
              return (
                <li key={level} className="flex items-center gap-3 text-sm">
                  <span className="w-28 shrink-0 capitalize text-muted-foreground">{level}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
                  </div>
                  <span className="tnum w-10 text-right text-xs text-muted-foreground">
                    {done}/{total}
                  </span>
                </li>
              );
            })}
          </ul>

          <div className="mt-5 border-t border-border pt-4">
            <p className="eyebrow">By language</p>
            <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {languageStats.length === 0 ? (
                <li className="text-sm text-muted-foreground">No completed sessions yet.</li>
              ) : (
                languageStats.map((l) => (
                  <li key={l.lang} className="flex items-center justify-between text-sm">
                    <span className="capitalize text-muted-foreground">{l.lang === "mixed" ? "Mixed" : l.lang === "myanmar" ? "Myanmar" : "English"}</span>
                    <span className="tnum text-muted-foreground">{l.sessions} runs · {l.avgWpm} wpm</span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>

        <div className="card p-5">
          <p className="flex items-center gap-1.5 eyebrow">
            <Timer className="size-3.5" />
            Timed tests
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {tests.map((test) => (
              <Link key={test.id} to={`/test/${test.id}`} className="chip transition-colors hover:border-border hover:text-foreground">
                <span className="tnum">{test.code}</span>
                <span className="text-muted-foreground">·</span>
                {testResults.get(test.id) ? <span className="tnum text-success">{Math.round(testResults.get(test.id)!)} wpm</span> : "new"}
              </Link>
            ))}
          </div>
          {tests.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No timed tests seeded yet.</p> : null}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="flex items-center gap-2 font-display text-lg">
            <BarChart3 className="size-4 text-muted-foreground" />
            Recent sessions
          </h2>
          <Link to="/progress" className="text-sm font-medium text-accent hover:underline">
            Chart
            <ArrowRight className="ml-1 inline size-3.5" />
          </Link>
        </div>
        {sessions ? (
          sessions.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">
              Nothing typed yet — <Link to="/learn" className="font-medium text-accent hover:underline">open a lesson</Link>.
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-2 font-normal">When</th>
                  <th className="px-5 py-2 font-normal">Lesson</th>
                  <th className="px-5 py-2 text-right font-normal">WPM</th>
                  <th className="px-5 py-2 text-right font-normal">Acc</th>
                  <th className="hidden px-5 py-2 text-right font-normal sm:table-cell">Time</th>
                </tr>
              </thead>
              <tbody>
                {sessions.slice(0, 12).map((s) => (
                  <tr key={s.id} className="border-t border-border transition-colors hover:bg-muted/40">
                    <td className="px-5 py-2 text-muted-foreground">{new Date(s.startedAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</td>
                    <td className="ms px-5 py-2">{s.lessonId?.replace(/^lesson-(en|my)-/, "") ?? "timed test"}</td>
                    <td className="tnum px-5 py-2 text-right">{Math.round(s.wpm)}</td>
                    <td className="tnum px-5 py-2 text-right">{s.accuracy.toFixed(0)}%</td>
                    <td className="tnum hidden px-5 py-2 text-right text-muted-foreground sm:table-cell">{formatDuration(s.durationMs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : (
          <Spinner />
        )}
      </div>
    </div>
  );
}

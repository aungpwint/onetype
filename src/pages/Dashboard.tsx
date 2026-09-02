import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStudentStore } from "../stores/student-store";
import { useLessonStore } from "../stores/lesson-store";
import { useSettingsStore } from "../stores/settings-store";
import * as backend from "../services/backend";
import type { TypingSession, TypingTest } from "../services/types";
import { Stat, Spinner } from "../components/ui";
import { formatDuration } from "../lib/format";

function hourGreeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Late night practice";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Night practice";
}

export default function Dashboard() {
  const active = useStudentStore((s) => s.active);
  const progress = useLessonStore((s) => s.progress);
  const progressStudentId = useLessonStore((s) => s.progressStudentId);
  const loadProgress = useLessonStore((s) => s.loadProgress);
  const lessonsByLevel = useLessonStore((s) => s.lessonsByLevel);
  const defaultLang = useSettingsStore((s) => s.get("app.language"));

  const [sessions, setSessions] = useState<TypingSession[] | null>(null);
  const [tests, setTests] = useState<TypingTest[]>([]);
  const [testResults, setTestResults] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    if (!active) return;
    void loadProgress(active.id);
    void (async () => {
      setSessions(await backend.listTypingSessions(active.id, 12));
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
  }, [active, loadProgress]);

  const stats = useMemo(() => {
    const rows = sessions ?? [];
    const withKeys = rows.filter((s) => s.correctCount > 0);
    const avgWpm = withKeys.length ? withKeys.reduce((sum, s) => sum + s.wpm, 0) / withKeys.length : 0;
    const avgAcc = withKeys.length ? withKeys.reduce((sum, s) => sum + s.accuracy, 0) / withKeys.length : 0;
    const completed = progress ? Object.values(progress).filter((p) => p.completed).length : 0;
    const passedTests = testResults.size;
    return { avgWpm, avgAcc, completed, passedTests, totalSessions: rows.length };
  }, [sessions, progress, testResults]);

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
          <h1 className="mt-1 font-display text-3xl">
            {active.displayName} <span className="ms text-ink-faint">မင်္ဂလာပါ</span>
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Keep your hands on home row — <span className="kbd">F</span> and <span className="kbd">J</span> are your anchor nubs.
          </p>
        </div>
        <Link to="/progress" className="btn btn-ghost">
          View full progress →
        </Link>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Avg WPM" value={stats.avgWpm ? Math.round(stats.avgWpm) : "—"} />
        <Stat label="Avg accuracy" value={stats.avgAcc ? `${stats.avgAcc.toFixed(1)}%` : "—"} />
        <Stat label="Lessons passed" value={progressLoaded ? stats.completed : "…"} />
        <Stat label="Tests passed" value={tests.length ? stats.passedTests : "…"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Link to={nextLesson ? `/lesson/${nextLesson.id}` : "/learn"} className="card p-5 transition-colors hover:border-line-strong">
          <p className="eyebrow">Continue learning</p>
          <div className="mt-3 flex items-center justify-between">
            <span className="ms font-display text-xl leading-tight">{nextLesson ? nextLesson.title : "Curriculum finished"}</span>
            <span className="text-xl" aria-hidden>→</span>
          </div>
          <p className="mt-1 text-sm text-ink-soft">{nextLesson ? `Level ${nextLesson.level} · line ${nextLesson.number}` : "Every line passed. Try a timed test."}</p>
        </Link>

        <div className="card p-5">
          <p className="eyebrow">Level progress</p>
          <ul className="mt-3 space-y-2">
            {(["beginner", "intermediate", "advanced"] as const).map((level) => {
              const list = lessonsByLevel[level];
              const langList = list.filter((l) => l.language === "myanmar" && l.level === level);
              const done = langList.filter((l) => progress?.[l.id]?.completed).length;
              const total = langList.length;
              return (
                <li key={level} className="flex items-center gap-3 text-sm">
                  <span className="w-28 shrink-0 capitalize text-ink-soft">{level}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-paper-2">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
                  </div>
                  <span className="tnum w-10 text-right text-xs text-ink-faint">
                    {done}/{total}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="card p-5">
          <p className="eyebrow">Timed tests</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {tests.map((test) => (
              <Link key={test.id} to={`/test/${test.id}`} className="chip hover:border-line-strong hover:text-ink">
                <span className="tnum">{test.code}</span>
                <span className="text-ink-faint">·</span>
                {testResults.get(test.id) ? <span className="tnum text-success">{Math.round(testResults.get(test.id)!)} wpm</span> : "new"}
              </Link>
            ))}
          </div>
          {tests.length === 0 ? <p className="mt-3 text-sm text-ink-faint">No timed tests seeded yet.</p> : null}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="font-display text-lg">Recent sessions</h2>
          <Link to="/progress" className="text-sm text-accent hover:underline">
            Chart →
          </Link>
        </div>
        {sessions ? (
          sessions.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-ink-faint">
              Nothing typed yet — <Link to="/learn" className="text-accent hover:underline">open a lesson</Link>.
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-ink-faint">
                  <th className="px-5 py-2 font-normal">When</th>
                  <th className="px-5 py-2 font-normal">Lesson</th>
                  <th className="px-5 py-2 font-normal text-right">WPM</th>
                  <th className="px-5 py-2 font-normal text-right">Acc</th>
                  <th className="hidden px-5 py-2 font-normal text-right sm:table-cell">Time</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id} className="border-t border-line">
                    <td className="px-5 py-2 text-ink-soft">{new Date(s.startedAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</td>
                    <td className="ms px-5 py-2">{s.lessonId?.replace(/^lesson-(en|my)-/, "") ?? "timed test"}</td>
                    <td className="tnum px-5 py-2 text-right">{Math.round(s.wpm)}</td>
                    <td className="tnum px-5 py-2 text-right">{s.accuracy.toFixed(0)}%</td>
                    <td className="tnum hidden px-5 py-2 text-right text-ink-soft sm:table-cell">{formatDuration(s.durationMs)}</td>
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
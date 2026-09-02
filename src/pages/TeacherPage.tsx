import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import * as backend from "../services/backend";
import type { StudentDetail, TeacherOverview } from "../services/types";
import { Stat, Spinner } from "../components/ui";
import { formatDateTime } from "../lib/format";

export default function TeacherPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const [overview, setOverview] = useState<TeacherOverview | null>(null);
  const [detail, setDetail] = useState<StudentDetail | null>(null);

  useEffect(() => {
    void (async () => {
      setOverview(await backend.teacherOverview());
    })();
  }, []);

  useEffect(() => {
    if (!studentId) {
      return;
    }
    void (async () => {
      setDetail(await backend.studentDetail(studentId));
    })();
  }, [studentId]);

  if (!overview)
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <Spinner label="Opening the teacher's desk…" />
      </div>
    );

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <header>
        <p className="eyebrow">Teacher's desk</p>
        <h1 className="mt-1 font-display text-3xl">Overview</h1>
        <p className="mt-1 text-sm text-ink-soft">
          A roll of every learner on this machine. Accuracy and WPM are rolling averages across their saved sessions.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Learners" value={overview.studentCount} />
        <Stat label="Total minutes" value={overview.totalMinutes.toFixed(0)} />
        <Stat label="Avg accuracy" value={`${overview.avgAccuracy.toFixed(1)}%`} />
        <Stat label="Avg WPM" value={overview.avgWpm ? Math.round(overview.avgWpm) : "—"} />
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-ink-faint">
              <th className="px-5 py-2 font-normal">Learner</th>
              <th className="px-5 py-2 font-normal">At</th>
              <th className="px-5 py-2 font-normal text-right">WPM</th>
              <th className="px-5 py-2 font-normal text-right">Acc</th>
              <th className="px-5 py-2 font-normal text-right">Min</th>
              <th className="px-5 py-2 font-normal text-right">Progress</th>
              <th className="px-5 py-2 font-normal text-right">Last</th>
            </tr>
          </thead>
          <tbody>
            {overview.students.map((s) => (
              <tr key={s.student.id} className="border-t border-line">
                <td className="px-5 py-2.5">
                  <a className="text-ink hover:underline" href={`#/teacher/${s.student.id}`}>
                    {s.student.displayName}
                  </a>
                  <span className="ms block text-xs text-ink-faint">{s.student.studentCode}</span>
                </td>
                <td className="px-5 py-2.5 capitalize text-ink-soft">{s.level ?? "—"}</td>
                <td className="tnum px-5 py-2.5 text-right">{Math.round(s.wpm)}</td>
                <td className="tnum px-5 py-2.5 text-right">{s.accuracy.toFixed(0)}%</td>
                <td className="tnum px-5 py-2.5 text-right">{s.totalMinutes.toFixed(0)}</td>
                <td className="px-5 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-28 overflow-hidden rounded-full bg-paper-2">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${s.progress * 100}%` }} />
                    </div>
                    <span className="tnum text-xs text-ink-faint">{Math.round(s.progress * 100)}%</span>
                  </div>
                </td>
                <td className="px-5 py-2.5 text-right text-ink-faint">
                  {s.lastPracticedAt ? formatDateTime(s.lastPracticedAt) : "—"}
                </td>
              </tr>
            ))}
            {overview.students.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-sm text-ink-faint">
                  No learners yet — add one from the Learners page.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {detail ? (
        <div className="card p-5">
          <h2 className="font-display text-lg">
            Detail — {detail.student.displayName}{" "}
            <span className="ms text-sm font-normal text-ink-faint">{detail.student.studentCode}</span>
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Avg WPM" value={Math.round(detail.overallWpm)} />
            <Stat label="Avg accuracy" value={`${detail.overallAccuracy.toFixed(1)}%`} />
            <Stat label="Minutes" value={detail.totalMinutes.toFixed(0)} />
            <Stat label="Sessions" value={detail.totalSessions} />
          </div>
          <div className="mt-4 whitespace-pre-line text-sm text-ink-soft">
            {detail.lessonCounts.map((lc) => `${lc.level}: ${lc.completed}/${lc.total}`).join("\n")}
          </div>
        </div>
      ) : (
        <p className="text-center text-xs text-ink-faint">Select a learner above to see their detail.</p>
      )}
    </div>
  );
}
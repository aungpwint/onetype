import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { GraduationCap, Users, Clock, Target, Gauge } from "lucide-react";
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
        <h1 className="mt-1 font-display text-3xl tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A roll of every learner on this machine. Accuracy and WPM are rolling averages across their saved sessions.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={<Users className="size-4" />} label="Learners" value={overview.studentCount} />
        <Stat icon={<Clock className="size-4" />} label="Total minutes" value={overview.totalMinutes.toFixed(0)} />
        <Stat icon={<Target className="size-4" />} label="Avg accuracy" value={`${overview.avgAccuracy.toFixed(1)}%`} />
        <Stat icon={<Gauge className="size-4" />} label="Avg WPM" value={overview.avgWpm ? Math.round(overview.avgWpm) : "—"} />
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-5 py-2 font-normal">Learner</th>
              <th className="px-5 py-2 font-normal">At</th>
              <th className="px-5 py-2 text-right font-normal">WPM</th>
              <th className="px-5 py-2 text-right font-normal">Acc</th>
              <th className="px-5 py-2 text-right font-normal">Min</th>
              <th className="px-5 py-2 text-right font-normal">Progress</th>
              <th className="px-5 py-2 text-right font-normal">Last</th>
            </tr>
          </thead>
          <tbody>
            {overview.students.map((s) => (
              <tr key={s.student.id} className="border-t border-border transition-colors hover:bg-muted/40">
                <td className="px-5 py-2.5">
                  <a className="font-medium text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded" href={`#/teacher/${s.student.id}`}>
                    {s.student.displayName}
                  </a>
                  <span className="ms block text-xs text-muted-foreground">{s.student.studentCode}</span>
                </td>
                <td className="px-5 py-2.5 capitalize text-muted-foreground">{s.level ?? "—"}</td>
                <td className="tnum px-5 py-2.5 text-right">{Math.round(s.wpm)}</td>
                <td className="tnum px-5 py-2.5 text-right">{s.accuracy.toFixed(0)}%</td>
                <td className="tnum px-5 py-2.5 text-right">{s.totalMinutes.toFixed(0)}</td>
                <td className="px-5 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-28 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${s.progress * 100}%` }} />
                    </div>
                    <span className="tnum text-xs text-muted-foreground">{Math.round(s.progress * 100)}%</span>
                  </div>
                </td>
                <td className="px-5 py-2.5 text-right text-muted-foreground">
                  {s.lastPracticedAt ? formatDateTime(s.lastPracticedAt) : "—"}
                </td>
              </tr>
            ))}
            {overview.students.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-sm text-muted-foreground">
                  No learners yet — add one from the Learners page.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {detail ? (
        <div className="card p-5">
          <h2 className="font-display text-xl">
            Detail — {detail.student.displayName}{" "}
            <span className="ms text-sm font-normal text-muted-foreground">{detail.student.studentCode}</span>
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat icon={<Gauge className="size-4" />} label="Avg WPM" value={Math.round(detail.overallWpm)} />
            <Stat icon={<Target className="size-4" />} label="Avg accuracy" value={`${detail.overallAccuracy.toFixed(1)}%`} />
            <Stat icon={<Clock className="size-4" />} label="Minutes" value={detail.totalMinutes.toFixed(0)} />
            <Stat icon={<GraduationCap className="size-4" />} label="Sessions" value={detail.totalSessions} />
          </div>
          <div className="mt-4 space-y-1.5 text-sm text-muted-foreground">
            {detail.lessonCounts.map((lc) => (
              <div key={lc.level} className="flex items-center gap-2">
                <span className="w-32 capitalize">{lc.level}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${(lc.completed / Math.max(1, lc.total)) * 100}%` }} />
                </div>
                <span className="tnum text-xs">
                  {lc.completed}/{lc.total}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-center text-xs text-muted-foreground">Select a learner above to see their detail.</p>
      )}
    </div>
  );
}
import { useNavigate } from "react-router-dom";
import {
  Gauge,
  Target,
  AlignLeft,
  ArrowRight,
  RotateCcw,
  ArrowLeft,
  Trophy,
  CheckCircle2,
} from "lucide-react";
import { useTypingStore, buildAdaptiveDrill } from "../stores/typing-store";
import { useLessonStore } from "../stores/lesson-store";
import { ACHIEVEMENT_CATALOG } from "../data/achievements";
import { Modal } from "./ui";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { formatDuration } from "../lib/format";
import type { MasteryDelta, MasteryLevel } from "../core/mastery";

const MASTERY_COPY: Record<MasteryLevel, string> = {
  "not-started": "new",
  attempted: "attempted",
  passed: "passed",
  mastered: "mastered",
};

function MasteryNotice({ delta }: { delta: MasteryDelta }) {
  const { before, after, improved } = delta;
  return (
    <div className="mt-4 rounded-xl border border-brass/40 bg-brass/10 p-3">
      <p className="eyebrow">Mastery</p>
      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
        <span className="tnum text-muted-foreground">{MASTERY_COPY[before]}</span>
        <ArrowRight className="size-4 text-muted-foreground" />
        <span className={`tnum font-medium ${after === "mastered" ? "text-brass" : "text-foreground"}`}>
          {MASTERY_COPY[after]}
        </span>
        {improved ? (
          <Badge variant="success">
            <CheckCircle2 className="size-3" />
            improved
          </Badge>
        ) : null}
      </div>
      {after === "mastered" ? (
        <p className="mt-1 text-xs text-muted-foreground">This lesson is mastered. Nice consistency!</p>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">Reach the accuracy margin on consecutive passes to master this lesson.</p>
      )}
    </div>
  );
}

export function ResultDialog() {
  const navigate = useNavigate();
  const result = useTypingStore((s) => s.result);
  const session = useTypingStore((s) => s.session);
  const clear = useTypingStore((s) => s.clear);
  const beginLesson = useTypingStore((s) => s.beginLesson);
  const beginTest = useTypingStore((s) => s.beginTest);
  const beginDrill = useTypingStore((s) => s.beginDrill);
  const lessonsByLevel = useLessonStore((s) => s.lessonsByLevel);

  if (!result || !session) return null;

  const newly = result.newlyUnlocked ?? [];
  const achieved = newly.map((id) => ACHIEVEMENT_CATALOG[id]).filter(Boolean);

  const metrics = result.metrics;
  const isLesson = session.kind === "lesson";
  const isDrill = session.kind === "drill";
  // Drills are practice without a pass/fail gate, so they always show as complete.
  const target = isLesson
    ? session.resolved.completion
    : isDrill
      ? { minAccuracy: 0, minWpm: null as number | null }
      : { minAccuracy: session.test!.minAccuracy, minWpm: session.test!.minWpm };

  let nextLessonId: string | null = null;
  if (isLesson && result.passed) {
    const lesson = session.resolved;
    const sameLevel = lessonsByLevel[lesson.level];
    const next = sameLevel.find((l) => l.number === lesson.number + 1 && l.language === lesson.language);
    nextLessonId = next?.id ?? null;
  }

  const close = () => {
    clear();
  };

  const retry = () => {
    if (session.kind === "lesson") {
      const id = session.lessonId!;
      const mode = session.mode;
      clear();
      void beginLesson(id, mode);
    } else if (session.kind === "drill") {
      clear();
      void buildAdaptiveDrill().then((drill) => {
        if (drill) void beginDrill(drill);
      });
    } else {
      const test = session.test!;
      clear();
      void beginTest(test);
    }
  };

  const beforeNavigate = (to: string) => () => {
    clear();
    navigate(to);
  };

  return (
    <Modal open onClose={close}>
      <div className="flex items-start justify-between pr-10">
        <div>
          <p className="eyebrow">
            {isDrill
              ? `Adaptive drill · ${session.resolved.focusKeys?.join("") ?? "weak keys"} · attempt ${result.attempt}`
              : isLesson
                ? `Exercise · ${session.resolved.title}`
                : `Test · ${session.test!.code}`} · attempt{" "}
            {result.attempt}
          </p>
          <h2 className="mt-1 font-display text-2xl">
            {isDrill ? "Drill complete" : result.passed ? (isLesson ? "Lesson passed" : "Test passed") : "Round finished — not yet passed"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {isDrill
              ? "Loosened up those weak spots. Practice keeps the finger memory sharp."
              : result.passed
                ? isLesson
                  ? "Well typed. Move to the next line."
                  : "You beat the target. Keep the form."
                : `Target was ${target.minAccuracy}% accuracy${target.minWpm !== null ? ` and ${target.minWpm} WPM` : ""}. One more round.`}
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <Metric icon={<Gauge className="size-4" />} label="WPM" value={String(Math.round(metrics.grossWpm))} />
        <Metric icon={<Target className="size-4" />} label="Accuracy" value={`${metrics.accuracy.toFixed(1)}%`} />
        <Metric icon={<AlignLeft className="size-4" />} label="CPM" value={String(Math.round(metrics.cpm))} />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
        <div className="flex justify-between"><dt className="text-muted-foreground">Errors</dt><dd className="tnum">{metrics.incorrectAttempts}</dd></div>
        <div className="flex justify-between"><dt className="text-muted-foreground">Backspaces</dt><dd className="tnum">{metrics.backspaceCount}</dd></div>
        <div className="flex justify-between"><dt className="text-muted-foreground">Characters typed</dt><dd className="tnum">{metrics.correctAttempts}</dd></div>
        <div className="flex justify-between"><dt className="text-muted-foreground">Time</dt><dd className="tnum">{formatDuration(metrics.elapsedSeconds * 1000)}</dd></div>
        {!isDrill ? (
          <div className="flex justify-between"><dt className="text-muted-foreground">Target</dt><dd className="tnum">{target.minAccuracy}% acc{target.minWpm !== null ? ` · ${target.minWpm} wpm` : ""}</dd></div>
        ) : null}
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Pass</dt>
          <dd className={`tnum ${result.passed ? "text-success" : "text-destructive"}`}>{result.passed ? "passed" : "not yet"}</dd>
        </div>
      </dl>

      {isLesson && result.masteryDelta ? <MasteryNotice delta={result.masteryDelta} /> : null}

      {result.saveError ? (
        <div className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm" role="alert">
          <span className="font-medium">Couldn't save this round.</span>{" "}
          <span className="text-muted-foreground">{result.saveError}</span>
        </div>
      ) : null}

      {achieved.length > 0 ? (
        <div className="mt-4 rounded-xl border border-brass/40 bg-brass/10 p-3">
          <p className="flex items-center gap-1.5 eyebrow">
            <Trophy className="size-3.5 text-brass" />
            Achievement unlocked
          </p>
          <ul className="mt-2 space-y-1.5">
            {achieved.map((a) => (
              <li key={a.id} className="flex items-center gap-2 text-sm">
                <span aria-hidden className="text-base">{a.icon}</span>
                <span className="font-medium">{a.title}</span>
                <span className="text-xs text-muted-foreground">{a.description}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={beforeNavigate(isDrill ? "/drill" : isLesson ? "/learn" : "/tests")}>
          <ArrowLeft className="size-4" />
          Back to list
        </Button>
        {nextLessonId ? (
          <Button variant="brass" onClick={beforeNavigate(`/lesson/${nextLessonId}`)}>
            Next lesson
            <ArrowRight className="size-4" />
          </Button>
        ) : null}
        <Button onClick={retry}>
          <RotateCcw className="size-4" />
          Type again
        </Button>
      </div>
    </Modal>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-muted/50 p-3 text-center">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-background text-muted-foreground shadow-sm">
        {icon}
      </span>
      <p className="eyebrow">{label}</p>
      <p className="tnum font-display text-2xl md:text-3xl">{value}</p>
    </div>
  );
}
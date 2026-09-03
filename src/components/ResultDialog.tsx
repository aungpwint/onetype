import { useNavigate } from "react-router-dom";
import { useTypingStore, buildAdaptiveDrill } from "../stores/typing-store";
import { useLessonStore } from "../stores/lesson-store";
import { ACHIEVEMENT_CATALOG } from "../data/achievements";
import { Modal } from "./ui";
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
    <div className="mt-4 rounded-lg border border-brass/40 bg-brass/10 p-3">
      <p className="eyebrow">Mastery</p>
      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
        <span className="tnum text-ink-soft">{MASTERY_COPY[before]}</span>
        <span aria-hidden>→</span>
        <span className={`tnum font-medium ${after === "mastered" ? "text-brass" : "text-ink"}`}>{MASTERY_COPY[after]}</span>
        {improved ? (
          <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">improved</span>
        ) : null}
      </div>
      {after === "mastered" ? (
        <p className="mt-1 text-xs text-ink-soft">This lesson is mastered. Nice consistency!</p>
      ) : (
        <p className="mt-1 text-xs text-ink-soft">Reach the accuracy margin on consecutive passes to master this lesson.</p>
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
      <div className="flex items-start justify-between">
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
          <p className="mt-1 text-sm text-ink-soft">
            {isDrill
              ? "Loosened up those weak spots. Practice keeps the finger memory sharp."
              : result.passed
                ? isLesson
                  ? "Well typed. Move to the next line."
                  : "You beat the target. Keep the form."
                : `Target was ${target.minAccuracy}% accuracy${target.minWpm !== null ? ` and ${target.minWpm} WPM` : ""}. One more round.`}
          </p>
        </div>
        <button type="button" className="btn btn-ghost px-2! py-1! text-xs" onClick={close}>
          Esc
        </button>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-line bg-paper-2 p-3 text-center">
          <p className="eyebrow">WPM</p>
          <p className="tnum mt-1 font-display text-3xl">{Math.round(metrics.grossWpm)}</p>
        </div>
        <div className="rounded-lg border border-line bg-paper-2 p-3 text-center">
          <p className="eyebrow">Accuracy</p>
          <p className="tnum mt-1 font-display text-3xl">{metrics.accuracy.toFixed(1)}%</p>
        </div>
        <div className="rounded-lg border border-line bg-paper-2 p-3 text-center">
          <p className="eyebrow">CPM</p>
          <p className="tnum mt-1 font-display text-3xl">{Math.round(metrics.cpm)}</p>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
        <div className="flex justify-between"><dt className="text-ink-faint">Errors</dt><dd className="tnum">{metrics.incorrectAttempts}</dd></div>
        <div className="flex justify-between"><dt className="text-ink-faint">Backspaces</dt><dd className="tnum">{metrics.backspaceCount}</dd></div>
        <div className="flex justify-between"><dt className="text-ink-faint">Characters typed</dt><dd className="tnum">{metrics.correctAttempts}</dd></div>
        <div className="flex justify-between"><dt className="text-ink-faint">Time</dt><dd className="tnum">{formatDuration(metrics.elapsedSeconds * 1000)}</dd></div>
        {!isDrill ? (
          <div className="flex justify-between"><dt className="text-ink-faint">Target</dt><dd className="tnum">{target.minAccuracy}% acc{target.minWpm !== null ? ` · ${target.minWpm} wpm` : ""}</dd></div>
        ) : null}
        <div className="flex justify-between"><dt className="text-ink-faint">Pass</dt><dd className="tnum" style={{ color: result.passed ? "var(--success)" : "var(--alert)" }}>{result.passed ? "passed" : "not yet"}</dd></div>
      </dl>

      {isLesson && result.masteryDelta ? <MasteryNotice delta={result.masteryDelta} /> : null}

      {result.saveError ? (
        <div className="mt-4 rounded-lg border border-alert/40 bg-alert/10 p-3 text-sm" role="alert">
          <span className="font-medium">Couldn't save this round.</span>{" "}
          <span className="text-ink-soft">{result.saveError}</span>
        </div>
      ) : null}

      {achieved.length > 0 ? (
        <div className="mt-4 rounded-lg border border-brass/40 bg-brass/10 p-3">
          <p className="eyebrow">Achievement unlocked</p>
          <ul className="mt-2 space-y-1.5">
            {achieved.map((a) => (
              <li key={a.id} className="flex items-center gap-2 text-sm">
                <span aria-hidden>{a.icon}</span>
                <span className="font-medium">{a.title}</span>
                <span className="text-xs text-ink-soft">{a.description}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <button type="button" className="btn btn-ghost" onClick={beforeNavigate(isDrill ? "/drill" : isLesson ? "/learn" : "/tests")}>
          Back to list
        </button>
        {nextLessonId ? (
          <button type="button" className="btn btn-brass" onClick={beforeNavigate(`/lesson/${nextLessonId}`)}>
            Next lesson →
          </button>
        ) : null}
        <button type="button" className="btn btn-primary" onClick={retry}>
          Type again
        </button>
      </div>
    </Modal>
  );
}
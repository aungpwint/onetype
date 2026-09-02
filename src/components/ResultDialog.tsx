import { useNavigate } from "react-router-dom";
import { useTypingStore } from "../stores/typing-store";
import { useLessonStore } from "../stores/lesson-store";
import { Modal } from "./ui";
import { formatDuration } from "../lib/format";

export function ResultDialog() {
  const navigate = useNavigate();
  const result = useTypingStore((s) => s.result);
  const session = useTypingStore((s) => s.session);
  const clear = useTypingStore((s) => s.clear);
  const beginLesson = useTypingStore((s) => s.beginLesson);
  const beginTest = useTypingStore((s) => s.beginTest);
  const lessonsByLevel = useLessonStore((s) => s.lessonsByLevel);

  if (!result || !session) return null;

  const metrics = result.metrics;
  const isLesson = session.kind === "lesson";
  const target = isLesson ? session.resolved.completion : { minAccuracy: session.test!.minAccuracy, minWpm: session.test!.minWpm };

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
            {isLesson ? `Exercise · ${session.resolved.title}` : `Test · ${session.test!.code}`} · attempt{" "}
            {result.attempt}
          </p>
          <h2 className="mt-1 font-display text-2xl">
            {result.passed ? (isLesson ? "Lesson passed" : "Test passed") : "Round finished — not yet passed"}
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            {result.passed
              ? isLesson
                ? "Well typed. Move to the next line."
                : "You beat the target. Keep the form."
              : `Target was ${target.minAccuracy}% accuracy${target.minWpm !== null ? ` and ${target.minWpm} WPM` : ""}. One more round.`}
          </p>
        </div>
        <button type="button" className="btn btn-ghost !px-2 !py-1 text-xs" onClick={close}>
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
        <div className="flex justify-between"><dt className="text-ink-faint">Target</dt><dd className="tnum">{target.minAccuracy}% acc{target.minWpm !== null ? ` · ${target.minWpm} wpm` : ""}</dd></div>
        <div className="flex justify-between"><dt className="text-ink-faint">Pass</dt><dd className="tnum" style={{ color: result.passed ? "var(--success)" : "var(--alert)" }}>{result.passed ? "passed" : "not yet"}</dd></div>
      </dl>

      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <button type="button" className="btn btn-ghost" onClick={beforeNavigate(isLesson ? "/learn" : "/tests")}>
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
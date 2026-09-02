import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import * as backend from "../services/backend";
import { useTypingStore } from "../stores/typing-store";
import { useUiStore } from "../stores/ui-store";
import { useSettingsStore } from "../stores/settings-store";
import { VirtualKeyboard } from "../components/VirtualKeyboard";
import { HandGuide } from "../components/HandGuide";
import { TargetText } from "../components/TargetText";
import { StatsBar } from "../components/StatsBar";
import { ResultDialog } from "../components/ResultDialog";
import { Spinner, Modal } from "../components/ui";
import type { TypingMode } from "../types";

function Session({ durationSeconds, sourceName }: { durationSeconds: number | null; sourceName: string }) {
  const status = useTypingStore((s) => s.status);
  const engine = useTypingStore(() => useTypingStore.getState().engine);
  const error = useTypingStore((s) => s.error);
  const start = useTypingStore((s) => s.start);
  const togglePause = useTypingStore((s) => s.togglePause);
  const abandon = useTypingStore((s) => s.abandon);
  const handGuide = useUiStore((s) => s.handGuideVisible);
  const confirmExit = useSettingsStore((s) => s.get("practice.confirmExit"));
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Note: pausing/resuming is deliberately handled by Escape (see the global
  // keyboard-shortcuts hook). A "P" shortcut is not used because P is a normal
  // typing key in both English and Myanmar layouts and would pause mid-session.
  const layout = engine ? engine.layout : null;

  const requestExit = () => {
    if (confirmExit !== "off") setConfirmOpen(true);
    else abandon();
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">{durationSeconds !== null ? "Timed practice" : "Lesson"}</p>
          <h1 className="ms mt-1 font-display text-2xl">{sourceName}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="btn btn-ghost" onClick={requestExit}>
            ✕ Exit
          </button>
          <button type="button" className="btn btn-primary" onClick={status === "running" ? togglePause : status === "paused" ? togglePause : start}>
            {status === "paused" ? "Resume" : status === "running" ? "Pause" : durationSeconds === null ? "Start (first key also starts)" : "Start"}
          </button>
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-alert/40 bg-alert/10 px-3 py-2 text-sm text-alert" role="alert">
          {error}
        </p>
      ) : null}

      {!layout || !engine ? (
        <Spinner label="Loading the keys…" />
      ) : (
        <>
          <StatsBar />
          <div className="rounded-xl border border-line bg-paper p-4">
            <TargetText />
          </div>
          <div className="grid gap-6" style={{ gridTemplateColumns: handGuide ? "minmax(0,1fr) 300px" : "minmax(0,1fr)" }}>
            <div className="rounded-xl border border-line bg-paper p-3">
              <VirtualKeyboard layout={layout} />
            </div>
            {handGuide ? (
              <aside className="rounded-xl border border-line bg-paper p-3 flex flex-col items-center justify-center">
                <p className="eyebrow mb-2">Hand guide</p>
                <HandGuide />
              </aside>
            ) : null}
          </div>
        </>
      )}
      <ResultDialog />

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <h2 className="font-display text-lg">Leave this round?</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Nothing so far in this attempt will be saved. You can pick it up again any time from the lessons list.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={() => setConfirmOpen(false)}>
            Keep typing
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => {
              setConfirmOpen(false);
              abandon();
            }}
          >
            Leave the round
          </button>
        </div>
      </Modal>
    </div>
  );
}

export function LessonPage() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const status = useTypingStore((s) => s.status);
  const sessionKind = useTypingStore((s) => s.session?.kind);
  const beginLesson = useTypingStore((s) => s.beginLesson);
  const startedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!lessonId) return;
    if (status === "idle" && startedFor.current !== lessonId) {
      startedFor.current = lessonId;
      void beginLesson(lessonId, (localStorage.getItem("onetype:lesson-mode") as TypingMode | null) ?? "guided");
    }
  }, [lessonId, status, sessionKind, beginLesson]);

  const session = useTypingStore((s) => s.session);
  if (status === "idle" || sessionKind !== "lesson" || !session) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <Spinner label="Preparing the lesson…" />
      </div>
    );
  }

  return <Session durationSeconds={null} sourceName={`${session.resolved.title}`} />;
}

export function TestPage() {
  const { testId } = useParams<{ testId: string }>();
  const status = useTypingStore((s) => s.status);
  const sessionKind = useTypingStore((s) => s.session?.kind);
  const beginTest = useTypingStore((s) => s.beginTest);
  const startedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!testId) return;
    if (status === "idle" && startedFor.current !== testId) {
      startedFor.current = testId;
      void (async () => {
        const tests = await backend.listTypingTests();
        const test = tests.find((t) => t.id === testId);
        if (test) void beginTest(test);
      })();
    }
  }, [testId, status, sessionKind, beginTest]);

  const session = useTypingStore((s) => s.session);
  if (status === "idle" || sessionKind !== "test" || !session?.test) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <Spinner label="Rolling out the paper…" />
      </div>
    );
  }

  return <Session durationSeconds={session.test.durationSeconds} sourceName={session.test.name} />;
}
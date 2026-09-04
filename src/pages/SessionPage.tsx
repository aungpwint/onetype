import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, Pause, Play, AlertCircle } from "lucide-react";
import * as backend from "../services/backend";
import { useTypingStore, buildAdaptiveDrill } from "../stores/typing-store";
import { useSettingsStore } from "../stores/settings-store";
import { KeyboardContainer } from "../components/keyboard/KeyboardContainer";
import { TargetText } from "../components/TargetText";
import { StatsBar } from "../components/StatsBar";
import { ResultDialog } from "../components/ResultDialog";
import { Spinner, Modal } from "../components/ui";
import { Button } from "../components/ui/button";
import type { TypingMode } from "../types";

// ─── Session surface ─────────────────────────────────────────────────────────

function Session({
  durationSeconds,
  sourceName,
  eyebrow,
}: {
  durationSeconds: number | null;
  sourceName: string;
  eyebrow?: string;
}) {
  const status = useTypingStore((s) => s.status);
  const engine = useTypingStore((s) => s.engine);
  const error = useTypingStore((s) => s.error);
  const start = useTypingStore((s) => s.start);
  const togglePause = useTypingStore((s) => s.togglePause);
  const abandon = useTypingStore((s) => s.abandon);
  const confirmExit = useSettingsStore((s) => s.get("practice.confirmExit"));
  const [confirmOpen, setConfirmOpen] = useState(false);

  const layout = engine?.layout ?? null;

  const requestExit = () => {
    if (confirmExit !== "off") setConfirmOpen(true);
    else abandon();
  };

  // Note: pausing/resuming is deliberately handled by Escape (see the global
  // keyboard-shortcuts hook). A "P" shortcut is not used because P is a normal
  // typing key in both English and Myanmar layouts and would pause mid-session.
  const isPaused = status === "paused";
  const toggleLabel = isPaused ? "Resume" : status === "running" ? "Pause" : durationSeconds === null ? "Start (first key also starts)" : "Start";
  const toggleAction = status === "running" || status === "paused" ? togglePause : start;

  return (
    <motion.div
      className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">{eyebrow ?? (durationSeconds !== null ? "Timed practice" : "Lesson")}</p>
          <h1 className="ms mt-1 font-display text-2xl">{sourceName}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={requestExit}>
            <LogOut className="size-4" />
            Exit
          </Button>
          <Button onClick={toggleAction}>
            {isPaused ? <Play className="size-4" /> : status === "running" ? <Pause className="size-4" /> : null}
            {toggleLabel}
          </Button>
        </div>
      </div>

      {error ? (
        <p
          className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </p>
      ) : null}

      {!layout || !engine ? (
        <Spinner label="Loading the keys…" />
      ) : (
        <div className="flex flex-col gap-6">
          <StatsBar />
          <TargetText />
          <motion.div
            className="rounded-2xl border border-border bg-card p-3 shadow-sm"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <KeyboardContainer layout={layout} />
          </motion.div>
        </div>
      )}

      <ResultDialog />

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <h2 className="font-display text-lg">Leave this round?</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Nothing so far in this attempt will be saved. You can pick it up again any time from the lessons list.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setConfirmOpen(false)}>
            Keep typing
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              setConfirmOpen(false);
              abandon();
            }}
          >
            Leave the round
          </Button>
        </div>
      </Modal>
    </motion.div>
  );
}

// ─── Session loading gate (crossfades spinner ↔ surface) ────────────────────

function SessionGate({ ready, loadingLabel, children }: { ready: boolean; loadingLabel: string; children: ReactNode }) {
  return (
    <AnimatePresence mode="wait">
      {ready ? (
        <motion.div key="session" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          {children}
        </motion.div>
      ) : (
        <motion.div
          key="loading"
          className="flex min-h-0 flex-1 items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <Spinner label={loadingLabel} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Shared "begin this session once" bootstrapping ─────────────────────────

function useBeginSession(id: string | undefined, load: () => Promise<void>) {
  const status = useTypingStore((s) => s.status);
  const sessionKind = useTypingStore((s) => s.session?.kind);
  const startedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!id) return;
    if (status === "idle" && startedFor.current !== id) {
      startedFor.current = id;
      void load();
    }
  }, [id, status, sessionKind, load]);
}

// ─── Pages ───────────────────────────────────────────────────────────────────

export function LessonPage() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const session = useTypingStore((s) => s.session);
  const beginLesson = useTypingStore((s) => s.beginLesson);

  const load = useCallback(() => {
    const mode = (localStorage.getItem("onetype:lesson-mode") as TypingMode | null) ?? "guided";
    return lessonId ? beginLesson(lessonId, mode) : Promise.resolve();
  }, [lessonId, beginLesson]);

  useBeginSession(lessonId, load);

  return (
    <SessionGate ready={session?.kind === "lesson"} loadingLabel="Preparing the lesson…">
      {session?.kind === "lesson" ? <Session durationSeconds={null} sourceName={session.resolved.title} /> : null}
    </SessionGate>
  );
}

export function TestPage() {
  const { testId } = useParams<{ testId: string }>();
  const session = useTypingStore((s) => s.session);
  const beginTest = useTypingStore((s) => s.beginTest);

  const load = useCallback(async () => {
    if (!testId) return;
    const tests = await backend.listTypingTests();
    const test = tests.find((t) => t.id === testId);
    if (test) await beginTest(test);
  }, [testId, beginTest]);

  useBeginSession(testId, load);

  return (
    <SessionGate ready={session?.kind === "test" && !!session?.test} loadingLabel="Rolling out the paper…">
      {session?.kind === "test" && session.test ? (
        <Session durationSeconds={session.test.durationSeconds} sourceName={session.test.name} />
      ) : null}
    </SessionGate>
  );
}

export function DrillPage() {
  const session = useTypingStore((s) => s.session);
  const beginDrill = useTypingStore((s) => s.beginDrill);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const drill = await buildAdaptiveDrill();
      if (drill) await beginDrill(drill);
      else setError("Not enough typing data yet to spot weaknesses. Finish a few lessons first.");
    } catch {
      setError("Could not prepare an adaptive drill right now.");
    }
  }, [beginDrill]);

  useBeginSession("drill", load);

  if (error && session?.kind !== "drill") {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-10">
        <p className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </p>
      </div>
    );
  }

  return (
    <SessionGate ready={session?.kind === "drill"} loadingLabel="Preparing the drill…">
      {session?.kind === "drill" && session.drill ? (
        <Session
          durationSeconds={null}
          sourceName={session.resolved.title}
          eyebrow="Adaptive drill"
        />
      ) : null}
    </SessionGate>
  );
}

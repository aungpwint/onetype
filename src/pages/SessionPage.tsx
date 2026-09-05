import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, ArrowLeft, LayoutDashboard } from "lucide-react";
import * as backend from "@/services/backend";
import { useTypingStore, buildAdaptiveDrill } from "@/stores/typing-store";
import { useSettingsStore } from "@/stores/settings-store";
import { KeyboardContainer } from "@/components/keyboard/KeyboardContainer";
import { TargetText } from "@/components/TargetText";
import { StatsBar } from "@/components/StatsBar";
import { SessionHeader } from "@/components/session/SessionHeader";
import { ExerciseWorkspace } from "@/components/session/ExerciseWorkspace";
import { ResultDialog } from "@/components/ResultDialog";
import { Spinner, Modal, EmptyState } from "@/components/ui";
import { Button } from "@/components/ui/button";
import type { TypingMode } from "@/types";

function Session({
  durationSeconds,
  sourceName,
  eyebrow,
  onExit,
}: {
  durationSeconds: number | null;
  sourceName: string;
  eyebrow?: string;
  onExit?: () => void;
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
    else {
      abandon();
      onExit?.();
    }
  };

  const toggleAction =
    status === "running" || status === "paused" ? togglePause : start;

  return (
    <motion.div
      className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <SessionHeader
        eyebrow={
          eyebrow ?? (durationSeconds !== null ? "Timed practice" : "Lesson")
        }
        title={sourceName}
        status={status}
        durationSeconds={durationSeconds}
        onToggle={toggleAction}
        onExit={requestExit}
      />

      {error ? (
        <p
          className="mx-5 mt-3 flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive sm:mx-8"
          role="alert"
        >
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </p>
      ) : null}

      {!layout || !engine ? (
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <Spinner label="Loading the keys…" />
        </div>
      ) : (
        <div className="flex min-h-0 w-full flex-1 flex-col items-center overflow-hidden px-5 py-4 sm:px-8">
          <div className="flex w-full max-w-4xl flex-1 flex-col items-center justify-center gap-4 lg:gap-5">
            <StatsBar />
            <TargetText />
            <KeyboardContainer layout={layout} />
          </div>
        </div>
      )}

      <ResultDialog />

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        ariaLabel="Leave this round?"
      >
        <h2 className="font-display text-lg">Leave this round?</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Nothing so far in this attempt will be saved. You can pick it up again
          any time from the lessons list.
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
              onExit?.();
            }}
          >
            Leave the round
          </Button>
        </div>
      </Modal>
    </motion.div>
  );
}

function SessionGate({
  ready,
  loadingLabel,
  children,
}: {
  ready: boolean;
  loadingLabel: string;
  children: ReactNode;
}) {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const restored = { html: html.style.overflowY, body: body.style.overflowY };
    html.style.overflowY = "hidden";
    body.style.overflowY = "hidden";
    return () => {
      html.style.overflowY = restored.html;
      body.style.overflowY = restored.body;
    };
  }, []);

  return (
    <AnimatePresence mode="wait">
      {ready ? (
        <motion.div
          key="session"
          className="flex h-full min-h-0 flex-1 flex-col overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {children}
        </motion.div>
      ) : (
        <motion.div
          key="loading"
          className="flex h-full min-h-0 flex-1 items-center justify-center"
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

export function LessonPage() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const session = useTypingStore((s) => s.session);
  const beginLesson = useTypingStore((s) => s.beginLesson);

  const load = useCallback(() => {
    const mode =
      (localStorage.getItem("onetype:lesson-mode") as TypingMode | null) ??
      "guided";
    return lessonId ? beginLesson(lessonId, mode) : Promise.resolve();
  }, [lessonId, beginLesson]);

  useBeginSession(lessonId, load);

  return (
    <SessionGate
      ready={session?.kind === "lesson"}
      loadingLabel="Loading lesson text, keyboard and attempt…"
    >
      {session?.kind === "lesson" ? (
        <ExerciseWorkspace onExit={() => navigate("/learn")} />
      ) : null}
    </SessionGate>
  );
}

export function TestPage() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
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
    <SessionGate
      ready={session?.kind === "test" && !!session?.test}
      loadingLabel="Preparing test text, keyboard and attempt…"
    >
      {session?.kind === "test" && session.test ? (
        <Session
          durationSeconds={session.test.durationSeconds}
          sourceName={session.test.name}
          onExit={() => navigate("/tests")}
        />
      ) : null}
    </SessionGate>
  );
}

export function DrillPage() {
  const navigate = useNavigate();
  const session = useTypingStore((s) => s.session);
  const beginDrill = useTypingStore((s) => s.beginDrill);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const drill = await buildAdaptiveDrill();
      if (drill) await beginDrill(drill);
      else
        setError(
          "Not enough typing data yet to spot weaknesses. Finish a few lessons first.",
        );
    } catch {
      setError("Could not prepare an adaptive drill right now.");
    }
  }, [beginDrill]);

  useBeginSession("drill", load);

  if (error && session?.kind !== "drill") {
    return (
      <div className="flex h-full min-h-0 w-full flex-1 items-center justify-center px-6">
        <EmptyState icon={<AlertCircle className="size-8" />} title="Never mind the keys for now">
          <p className="text-destructive">{error}</p>
          <div className="mt-5 flex justify-center gap-2">
            <Button variant="outline" onClick={() => navigate("/learn")}>
              <ArrowLeft className="size-4" />
              Back to lessons
            </Button>
            <Button onClick={() => navigate("/")}>
              <LayoutDashboard className="size-4" />
              Dashboard
            </Button>
          </div>
        </EmptyState>
      </div>
    );
  }

  return (
    <SessionGate
      ready={session?.kind === "drill"}
      loadingLabel="Building drill from your weak keys…"
    >
      {session?.kind === "drill" && session.drill ? (
        <Session
          durationSeconds={null}
          sourceName={session.resolved.title}
          eyebrow="Adaptive drill"
          onExit={() => navigate("/")}
        />
      ) : null}
    </SessionGate>
  );
}

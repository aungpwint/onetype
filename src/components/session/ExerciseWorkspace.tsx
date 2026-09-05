import { useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  Hand,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useTypingStore } from "../../stores/typing-store";
import { useUiStore } from "../../stores/ui-store";
import { useSettingsStore } from "../../stores/settings-store";
import { containsMyanmar } from "../../core/unicode/myanmar";
import { KeyboardContainer } from "../keyboard/KeyboardContainer";
import { TargetText } from "../TargetText";
import { ResultDialog } from "../ResultDialog";
import { Modal } from "../ui";
import { Button } from "../ui/button";

const LEVEL_LABEL: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

/**
 * Lesson exercise workspace mirroring the reference trainer layout: a compact
 * single-band header (Back, brand, "Beginner • N", round + character progress,
 * WPM, accuracy, session tools), the centered exercise line, a Tab-to-start
 * gate, the keyboard with hands, and the footer hints. Test and drill sessions
 * keep the classic Session presentation.
 */
export function ExerciseWorkspace({ onExit }: { onExit?: () => void }) {
  const status = useTypingStore((s) => s.status);
  const tick = useTypingStore((s) => s.tick);
  void tick;
  const session = useTypingStore((s) => s.session);
  const engine = useTypingStore((s) => s.engine);
  const error = useTypingStore((s) => s.error);
  const togglePause = useTypingStore((s) => s.togglePause);
  const abandon = useTypingStore((s) => s.abandon);
  const handGuideVisible = useUiStore((s) => s.handGuideVisible);
  const soundEnabled = useUiStore((s) => s.soundEnabled);
  const toggleHandGuide = useUiStore((s) => s.toggleHandGuide);
  const setSoundEnabled = useUiStore((s) => s.setSoundEnabled);
  const confirmExit = useSettingsStore((s) => s.get("practice.confirmExit"));
  const [confirmOpen, setConfirmOpen] = useState(false);

  const resolved = session?.resolved;
  const layout = engine?.layout ?? null;

  const requestExit = () => {
    if (confirmExit !== "off") setConfirmOpen(true);
    else {
      abandon();
      onExit?.();
    }
  };

  if (!session || !resolved) return null;

  const level = LEVEL_LABEL[resolved.level] ?? resolved.level;
  const label = `${level} • ${resolved.number}`;
  const title = resolved.title;
  const hasMyanmar = containsMyanmar(title);

  const stats = useTypingStore.getState().getLiveStats();
  const isPaused = status === "paused";

  return (
    <motion.div
      className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <header className="shrink-0 border-b border-line/70 bg-background/60 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Button variant="ghost" size="sm" onClick={requestExit} className="-ml-2 shrink-0" aria-label="Back to lessons">
              <ArrowLeft className="size-4" />
              <span>Back</span>
            </Button>
            <span className="h-5 w-px shrink-0 bg-line/70" aria-hidden />
            <div className="hidden min-w-0 items-center gap-2 md:flex">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent font-mono text-sm font-bold text-accent-ink shadow-sm">
                Ot
              </span>
              <span className="font-display text-sm leading-none">
                OneType
              </span>
              <span className="h-5 w-px bg-line/70" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="eyebrow">{label}</p>
              <h1
                className={`mt-0.5 truncate font-display text-sm font-semibold leading-tight text-foreground sm:text-base ${hasMyanmar ? "ms" : ""}`}
              >
                {title}
              </h1>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3 sm:gap-4">
            <RoundProgress />
            <HeaderMetric
              value={String(Math.round(stats.wpm))}
              label="WPM"
            />
            <HeaderMetric
              value={`${Math.round(stats.accuracy)}%`}
              label="Accuracy"
            />
            <span className="mx-1 hidden h-5 w-px bg-line/70 sm:block" aria-hidden />
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon-sm"
                aria-label={handGuideVisible ? "Hide hand guide" : "Show hand guide"}
                aria-pressed={handGuideVisible}
                title={handGuideVisible ? "Hide hand guide" : "Show hand guide"}
                className={handGuideVisible ? "border-primary bg-primary/10 text-primary hover:border-primary hover:bg-primary/15 hover:text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}
                onClick={toggleHandGuide}
              >
                <Hand className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label={soundEnabled ? "Mute sounds" : "Enable sounds"}
                aria-pressed={soundEnabled}
                title={soundEnabled ? "Mute sounds" : "Enable sounds"}
                className={soundEnabled ? "border-primary bg-primary/10 text-primary hover:border-primary hover:bg-primary/15 hover:text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}
                onClick={() => setSoundEnabled(!soundEnabled)}
              >
                {soundEnabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={togglePause}
                disabled={status !== "running" && status !== "paused"}
                aria-label={isPaused ? "Resume" : "Pause"}
                title={isPaused ? "Resume" : "Pause"}
              >
                {isPaused ? <Play className="size-4" /> : <Pause className="size-4" />}
              </Button>
            </div>
          </div>
        </div>
      </header>

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
          <p className="text-sm text-muted-foreground">Loading the keys…</p>
        </div>
      ) : (
        <div className="flex min-h-0 w-full flex-1 flex-col items-center overflow-hidden px-4 py-5 sm:px-8">
          <div className="flex w-full max-w-4xl flex-1 flex-col items-center justify-center gap-4 lg:gap-5">
            <TargetText />
            {status === "ready" ? <TabStartHint /> : null}
            <KeyboardContainer layout={layout} hideReadyMessage />
            <ExerciseFooter />
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

function HeaderMetric({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className="tnum text-sm font-semibold leading-none text-foreground md:text-base">
        {value}
      </span>
      <span className="text-[0.625rem] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

function RoundProgress() {
  const tick = useTypingStore((s) => s.tick);
  void tick;
  const engine = useTypingStore((s) => s.engine);
  const phases = useTypingStore((s) => s.session?.resolved.phases);

  const total = engine?.sequence.units.length ?? 0;
  let round = 1;
  const rounds = phases && phases.length > 0 ? phases.length : 1;
  let current = engine ? engine.unitIndex + 1 : 1;
  let chapter = total;

  if (phases && phases.length > 0 && engine) {
    const idx = Math.min(engine.unitIndex + 1, total);
    const within =
      phases.find((p) => idx > p.startUnit && idx <= p.endUnit) ??
      phases[phases.length - 1];
    round = phases.indexOf(within) + 1;
    current = idx - within.startUnit;
    chapter = within.endUnit - within.startUnit;
  }

  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className="tnum text-sm font-semibold leading-none text-foreground md:text-base">
        {current} / {chapter}
      </span>
      <span className="text-[0.625rem] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        Round {round}/{rounds}
      </span>
    </div>
  );
}

function TabStartHint() {
  return (
    <div className="flex items-center justify-center gap-2.5" aria-live="polite">
      <span className="rounded-lg border border-line bg-card px-2.5 py-1 font-mono text-[0.6875rem] font-bold uppercase tracking-[0.15em] text-foreground shadow-sm">
        Tab
      </span>
      <span className="text-xs font-medium text-muted-foreground">
        Press Tab to start
      </span>
    </div>
  );
}

function ExerciseFooter() {
  return (
    <div className="flex flex-col items-center gap-1 pb-1">
      <p className="font-mono text-[0.6875rem] tracking-wide text-muted-foreground">
        Click to focus · Backspace to fix
      </p>
      <p className="max-w-xl text-center text-xs text-muted-foreground/80">
        The keyboard helps you type more accurately with your fingers and keys.
      </p>
    </div>
  );
}
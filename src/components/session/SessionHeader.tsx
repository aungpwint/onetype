import { Pause, Play, LogOut, Hand, Volume2, VolumeX } from "lucide-react";
import { useTypingStore } from "@/stores/typing-store";
import { useUiStore } from "@/stores/ui-store";
import { containsMyanmar } from "@/core/unicode/myanmar";
import { LessonProgress } from "@/components/keyboard/LessonProgress";
import { Button } from "@/components/ui/button";

type SessionStatus = ReturnType<typeof useTypingStore.getState>["status"];

interface SessionHeaderProps {
  eyebrow: string;
  title: string;
  status: SessionStatus;
  /** null for untimed sessions (lessons/drills), seconds for timed tests. */
  durationSeconds: number | null;
  onToggle: () => void;
  onExit: () => void;
}

/** Helper mirroring the original session's toggle-label logic. */
function toggleLabel(status: SessionStatus, durationSeconds: number | null): string {
  if (status === "paused") return "Resume";
  if (status === "running") return "Pause";
  return durationSeconds === null ? "First key starts" : "Start";
}

/**
 * Compact lesson header: the lesson label + title own the left side, while the
 * session tools (hand guide, sound), Exit and Pause/Resume actions live on the
 * right. The lesson progress strip sits along the header's bottom edge so it is
 * clearly visible above the typing sequence without cluttering the workspace.
 * No application-level chrome is shown here — this is the whole header for the
 * focused typing workspace.
 */
export function SessionHeader({ eyebrow, title, status, durationSeconds, onToggle, onExit }: SessionHeaderProps) {
  const isPaused = status === "paused";
  const handGuideVisible = useUiStore((s) => s.handGuideVisible);
  const soundEnabled = useUiStore((s) => s.soundEnabled);
  const toggleHandGuide = useUiStore((s) => s.toggleHandGuide);
  const setSoundEnabled = useUiStore((s) => s.setSoundEnabled);
  const toggleSound = () => setSoundEnabled(!soundEnabled);

  const toolActive = "border-primary bg-primary/10 text-primary hover:border-primary hover:bg-primary/15 hover:text-primary";
  const toolIdle = "border-transparent text-muted-foreground hover:text-foreground";

  return (
    <header className="shrink-0 border-b border-line/70 bg-background/60 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-4 px-5 py-3 sm:px-8">
        <div className="min-w-0">
          <p className="eyebrow">{eyebrow}</p>
          <h1
            className={`mt-0.5 truncate font-display text-lg font-semibold leading-tight tracking-tight text-foreground sm:text-xl ${containsMyanmar(title) ? "ms" : ""}`}
          >
            {title}
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={handGuideVisible ? "Hide hand guide" : "Show hand guide"}
            aria-pressed={handGuideVisible}
            title={handGuideVisible ? "Hide hand guide" : "Show hand guide"}
            className={handGuideVisible ? toolActive : toolIdle}
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
            className={soundEnabled ? toolActive : toolIdle}
            onClick={toggleSound}
          >
            {soundEnabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
          </Button>
          <span className="mx-1 h-5 w-px bg-line/70" aria-hidden />
          <Button variant="outline" size="sm" onClick={onExit}>
            <LogOut className="size-4" />
            <span>Exit</span>
          </Button>
          <Button size="sm" variant="default" onClick={onToggle} aria-live="polite">
            {isPaused ? <Play className="size-4" /> : status === "running" ? <Pause className="size-4" /> : null}
            {toggleLabel(status, durationSeconds)}
          </Button>
        </div>
      </div>
      {(status === "ready" || status === "running") && (
        <div className="border-t border-line/60 px-5 pb-2.5 pt-2 sm:px-8">
          <LessonProgress />
        </div>
      )}
    </header>
  );
}
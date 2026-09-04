import { Link } from "react-router-dom";
import { ArrowRight, Clock, Crosshair, Gauge } from "lucide-react";
import type { LessonData } from "../data/curriculum/types";
import type { MasteryLevel } from "../core/mastery";
import type { LessonProgress } from "../services/types";
import { Badge } from "./ui/badge";
import { cn } from "../lib/utils";

interface LessonCardProps {
  lesson: LessonData;
  mastery: MasteryLevel;
  progress?: LessonProgress | null;
}

const MASTERY_LABEL: Record<MasteryLevel, { text: string; variant: "secondary" | "success" | "warning" }> = {
  "not-started": { text: "new", variant: "secondary" },
  attempted: { text: "attempted", variant: "secondary" },
  passed: { text: "passed", variant: "success" },
  mastered: { text: "mastered", variant: "warning" },
};

const DIFFICULTY_DOTS: Record<LessonData["difficulty"], number> = {
  basic: 1,
  easy: 2,
  medium: 3,
  hard: 4,
};

function MasteryBadge({ level }: { level: MasteryLevel }) {
  const m = MASTERY_LABEL[level];
  return <Badge variant={m.variant}>{m.text}</Badge>;
}

/**
 * A curriculum lesson rendered as a typewriter-flavoured index card: a tab-like
 * lesson-number plate, a display-serif title, focus keys drawn as keycaps
 * (echoing the on-screen keyboard), and a quiet meta footer. The top accent band
 * and the mastery seal signal where the lesson sits in the learner's progress.
 */
export function LessonCard({ lesson, mastery, progress }: LessonCardProps) {
  const passed = mastery === "passed" || mastery === "mastered";
  const attempted = mastery === "attempted";
  const showAccuracy = attempted && progress && progress.attempts > 0;

  const bandClass = passed ? "bg-success" : attempted ? "bg-brass" : "bg-line-strong";

  return (
    <Link
      to={`/lesson/${lesson.id}`}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-line bg-card transition-all duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[0_10px_30px_-12px_rgba(23,51,49,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {/* Top accent band — encodes lesson state */}
      <span aria-hidden className={cn("h-1 w-full", bandClass)} />

      <div className="flex grow flex-col gap-3 p-4 lg:p-5">
        {/* Lesson number plate + mastery seal */}
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded border border-line bg-paper-2/60 px-2 py-0.5 font-mono text-[0.6875rem] font-semibold tracking-wider tabular-nums text-ink-soft">
            <span className="text-ink-faint">L</span>
            <span>{String(lesson.number).padStart(2, "0")}</span>
          </span>
          {passed ? (
            <MasteryBadge level={mastery} />
          ) : showAccuracy ? (
            <span className="tnum text-xs font-semibold text-ink-soft">{Math.round(progress.bestAccuracy)}%</span>
          ) : (
            <MasteryBadge level={mastery} />
          )}
        </div>

        {/* Title */}
        <div className="min-w-0">
          <h3 className="font-display text-xl leading-tight text-ink">{lesson.title}</h3>
          <p className="ms mt-0.5 truncate text-xs text-ink-faint">{lesson.titleMy}</p>
        </div>

        {/* Focus keys as keycaps */}
        {lesson.focusKeys && lesson.focusKeys.length > 0 ? (
          <div className="flex flex-wrap gap-1" aria-label="Focus keys">
            {lesson.focusKeys.slice(0, 6).map((key) => (
              <span
                key={key}
                className="inline-flex min-w-[1.375rem] items-center justify-center rounded-[0.3125rem] border border-line-strong bg-linear-to-b from-key-top to-key-base px-1.5 py-0.5 font-mono text-xs tabular-nums text-ink shadow-[0_1px_0_var(--line-strong)]"
              >
                {key}
              </span>
            ))}
          </div>
        ) : null}

        {/* Meta footer */}
        <div className="mt-auto flex items-center gap-3 pt-1 text-xs text-ink-faint">
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" />
            {lesson.estimatedMinutes} min
          </span>
          <span className="inline-flex items-center gap-1">
            <Crosshair className="size-3.5" />
            {lesson.completion.minAccuracy}% acc
            {lesson.completion.minWpm !== null ? (
              <span className="inline-flex items-center gap-1">
                <i className="pointer-events-none">·</i>
                {lesson.completion.minWpm} wpm
              </span>
            ) : null}
          </span>
          <span className="ml-auto inline-flex items-center gap-1" title="Difficulty">
            <Gauge className="size-3.5" />
            <span className="tracking-tight">
              {"●".repeat(DIFFICULTY_DOTS[lesson.difficulty])}
              <span className="opacity-25">{"●".repeat(4 - DIFFICULTY_DOTS[lesson.difficulty])}</span>
            </span>
          </span>
        </div>
      </div>

      {/* Hover arrow */}
      <span
        aria-hidden
        className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint opacity-0 transition-opacity duration-150 group-hover:opacity-100"
      >
        <ArrowRight className="size-4" />
      </span>
    </Link>
  );
}

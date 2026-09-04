import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { Level } from "../types";
import { useLessonStore } from "../stores/lesson-store";
import { useStudentStore } from "../stores/student-store";
import { useSettingsStore } from "../stores/settings-store";
import { Spinner } from "../components/ui";
import { LanguageToggle } from "../components/LanguageToggle";
import { LessonCard } from "../components/LessonCard";
import { computeMasteryForLessons } from "../core/mastery";
import type { ExerciseResult } from "../services/types";
import * as backend from "../services/backend";

const LEVEL_ORDER: Level[] = ["beginner", "intermediate", "advanced"];

const LEVEL_COPY: Record<Level, { en: string; ms: string }> = {
  beginner: { en: "Beginner — home row & its neighbours", ms: "အခြေခံ" },
  intermediate: { en: "Intermediate — words and phrases", ms: "အလယ်အလတ်" },
  advanced: { en: "Advanced — full sentences", ms: "အဆင့်မြင့်" },
};

export default function Learn() {
  const { level: levelParam } = useParams<{ level: string }>();
  const lessonsByLevel = useLessonStore((s) => s.lessonsByLevel);
  const progress = useLessonStore((s) => s.progress);
  const progressStudentId = useLessonStore((s) => s.progressStudentId);
  const loadProgress = useLessonStore((s) => s.loadProgress);
  const active = useStudentStore((s) => s.active);
  const storedLang = useSettingsStore((s) => s.get("app.language"));

  // Derived from the persisted app.language setting so the toggle and the
  // curriculum list stay in sync and survive a reload.
  const lang = storedLang === "myanmar" ? "myanmar" : "english";

  const [level, setLevel] = useState<Level>(() => (LEVEL_ORDER as string[]).includes(levelParam ?? "") ? (levelParam as Level) : "beginner");
  const [exerciseResults, setExerciseResults] = useState<ExerciseResult[]>([]);

  useEffect(() => {
    if (active) void loadProgress(active.id);
  }, [active, loadProgress]);

  useEffect(() => {
    if (active) {
      void (async () => {
        setExerciseResults(await backend.listExerciseResults(active.id));
      })();
    }
  }, [active]);

  const masteryByLesson = useMemo(() => {
    const minAcc: Record<string, { minAccuracy: number }> = {};
    for (const lvl of LEVEL_ORDER) {
      for (const lesson of lessonsByLevel[lvl]) {
        if (lesson.language === (lang === "myanmar" ? "myanmar" : "english")) {
          minAcc[lesson.id] = { minAccuracy: lesson.completion.minAccuracy };
        }
      }
    }
    return computeMasteryForLessons(exerciseResults, minAcc);
  }, [exerciseResults, lessonsByLevel, lang]);

  const list = useMemo(() => {
    return lessonsByLevel[level]
      .filter((l) => l.language === (lang === "myanmar" ? "myanmar" : "english"))
      .sort((a, b) => a.number - b.number);
  }, [lessonsByLevel, level, lang]);

  const progressReady = progressStudentId === active?.id;
  const doneCount = list.filter((l) => progress?.[l.id]?.completed).length;

  return (
    <div className="app-page">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Curriculum · {LEVEL_COPY[level].ms}</p>
          <h1 className="mt-1 font-display text-3xl tracking-tight">Learn</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{LEVEL_COPY[level].en}</p>
        </div>
        <LanguageToggle />
      </header>

      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Level">
        {LEVEL_ORDER.map((l) => {
          const count = lessonsByLevel[l].filter((x) => x.language === (lang === "myanmar" ? "myanmar" : "english")).length;
          const done = lessonsByLevel[l].filter((x) => x.language === (lang === "myanmar" ? "myanmar" : "english") && progress?.[x.id]?.completed).length;
          return (
            <Link
              key={l}
              to={`/learn/${l}`}
              onClick={() => setLevel(l)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                level === l ? "border-brass bg-muted" : "border-border text-muted-foreground hover:text-foreground"
              }`}
              role="tab"
              aria-selected={level === l}
            >
              <span className="capitalize">{l}</span>
              {progressReady ? (
                <span className="tnum ml-2 text-xs text-muted-foreground">
                  {done}/{count}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>

      {progressReady ? (
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="ms shrink-0">ဤအဆင့်တွင်</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-accent" style={{ width: `${list.length ? (doneCount / list.length) * 100 : 0}%` }} />
          </div>
          <span className="tnum text-muted-foreground">
            {doneCount}/{list.length}
          </span>
        </div>
      ) : (
        <Spinner label="Loading progress…" />
      )}

      <div className={list.length ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3" : ""}>
        {list.map((lesson) => (
          <LessonCard
            key={lesson.id}
            lesson={lesson}
            mastery={masteryByLesson.get(lesson.id) ?? "not-started"}
            progress={progress?.[lesson.id]}
          />
        ))}
      </div>
      {list.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">No lessons here yet.</p>
      ) : null}
    </div>
  );
}
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, Clock } from "lucide-react";
import type { Level } from "../types";
import { useLessonStore } from "../stores/lesson-store";
import { useStudentStore } from "../stores/student-store";
import { useSettingsStore } from "../stores/settings-store";
import { Spinner } from "../components/ui";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import { computeMasteryForLessons } from "../core/mastery";
import type { MasteryLevel } from "../core/mastery";
import type { ExerciseResult } from "../services/types";
import * as backend from "../services/backend";

const LEVEL_ORDER: Level[] = ["beginner", "intermediate", "advanced"];

const LEVEL_COPY: Record<Level, { en: string; ms: string }> = {
  beginner: { en: "Beginner — home row & its neighbours", ms: "အခြေခံ" },
  intermediate: { en: "Intermediate — words and phrases", ms: "အလယ်အလတ်" },
  advanced: { en: "Advanced — full sentences", ms: "အဆင့်မြင့်" },
};

function LanguageToggle({ lang, setLang }: { lang: "myanmar" | "english"; setLang: (l: "myanmar" | "english") => void }) {
  return (
    <Tabs value={lang} onValueChange={(v) => setLang(v as "myanmar" | "english")}>
      <TabsList className="bg-muted">
        <TabsTrigger value="myanmar">
          <span className="ms">မြန်မာ</span>
        </TabsTrigger>
        <TabsTrigger value="english">English</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

const MASTERY_LABEL: Record<MasteryLevel, { text: string; variant: "secondary" | "success" | "warning" }> = {
  "not-started": { text: "new", variant: "secondary" },
  attempted: { text: "attempted", variant: "secondary" },
  passed: { text: "passed", variant: "success" },
  mastered: { text: "mastered", variant: "warning" },
};

function MasteryBadge({ level }: { level: MasteryLevel }) {
  const m = MASTERY_LABEL[level];
  return <Badge variant={m.variant}>{m.text}</Badge>;
}

export default function Learn() {
  const { level: levelParam } = useParams<{ level: string }>();
  const lessonsByLevel = useLessonStore((s) => s.lessonsByLevel);
  const progress = useLessonStore((s) => s.progress);
  const progressStudentId = useLessonStore((s) => s.progressStudentId);
  const loadProgress = useLessonStore((s) => s.loadProgress);
  const active = useStudentStore((s) => s.active);
  const defaultLang = useSettingsStore((s) => s.get("app.language"));

  const [lang, setLang] = useState<"myanmar" | "english">(defaultLang === "myanmar" ? "myanmar" : "english");
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
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Curriculum · {LEVEL_COPY[level].ms}</p>
          <h1 className="mt-1 font-display text-3xl tracking-tight">Learn</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{LEVEL_COPY[level].en}</p>
        </div>
        <LanguageToggle lang={lang} setLang={setLang} />
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
        {list.map((lesson) => {
          const p = progress?.[lesson.id];
          const mastery = masteryByLesson.get(lesson.id) ?? "not-started";
          const passed = mastery === "passed" || mastery === "mastered";
          return (
            <Link
              key={lesson.id}
              to={`/lesson/${lesson.id}`}
              className={`card group relative p-4 transition-all duration-150 hover:-translate-y-0.5 hover:border-border hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${passed ? "border-success/40" : ""}`}
            >
              <div className="flex items-center justify-between">
                <span className="eyebrow">L. {lesson.number}</span>
                {passed ? (
                  <MasteryBadge level={mastery} />
                ) : mastery === "attempted" ? (
                  <span className="tnum text-xs text-muted-foreground">{Math.round(p && p.attempts > 0 ? p.bestAccuracy : 0)}%</span>
                ) : (
                  <MasteryBadge level={mastery} />
                )}
              </div>
              <h3 className="ms mt-2 font-display text-xl leading-tight">{lesson.title}</h3>
              <p className="ms mt-0.5 text-xs text-muted-foreground">{lesson.titleMy}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {lesson.focusKeys && lesson.focusKeys.length > 0 ? (
                  <span className="ms rounded border border-border bg-muted px-1.5 py-0.5 text-xs">
                    {lesson.focusKeys.slice(0, 6).join(" ")}
                  </span>
                ) : null}
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="size-3" />
                  {lesson.estimatedMinutes} min
                </span>
                <span className="text-xs text-muted-foreground">
                  {lesson.completion.minAccuracy}% acc{lesson.completion.minWpm !== null ? ` · ${lesson.completion.minWpm} wpm` : ""}
                </span>
              </div>
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden>
                <ArrowRight className="size-5" />
              </span>
            </Link>
          );
        })}
      </div>
      {list.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">No lessons here yet.</p>
      ) : null}
    </div>
  );
}
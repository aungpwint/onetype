import type { TypingTest } from "../../services/types";
import { getLayoutOrThrow } from "../keyboard-layout/registry";
import { resolveLesson } from "../../data/curriculum/generator";
import type { LessonData } from "../../data/curriculum/types";
import { myanmarAdvancedLessons } from "../../data/lessons/myanmar-advanced";
import { myanmarIntermediateLessons } from "../../data/lessons/myanmar-intermediate";
import { englishAdvancedLessons } from "../../data/lessons/english-advanced";
import type { ResolvedLesson } from "../../data/curriculum/generator";
import type { Difficulty, Language } from "../../types";

const MYANMAR_POOL = [
  ...myanmarAdvancedLessons.reduce<string[]>((acc, l) => acc.concat(l.phases.map((p) => p.text)), []),
  ...myanmarIntermediateLessons.reduce<string[]>((acc, l) => acc.concat(l.phases.map((p) => p.text)), []),
];

const ENGLISH_POOL = englishAdvancedLessons.reduce<string[]>((acc, l) => acc.concat(l.phases.map((p) => p.text)), []);

export function buildTestMaterial(test: TypingTest): ResolvedLesson {
  const layout = getLayoutOrThrow(test.layoutId);
  const poolBase = test.language === "english" ? ENGLISH_POOL : test.language === "mixed" ? [...MYANMAR_POOL, ...ENGLISH_POOL] : MYANMAR_POOL;
  const pool = poolBase.filter((line) => {
    for (const ch of line) if (!layout.lookupChar(ch)) return false;
    return true;
  });
  if (pool.length === 0) {
    throw new Error(`Test "${test.id}": no lines encodable by layout "${test.layoutId}"`);
  }
  const targetChars = Math.max(120, 5 * 25 * test.durationSeconds);
  const lines: string[] = [];
  let total = 0;
  let guard = 0;
  // Each iteration adds at least 2 chars (line.length + 1), so a bound of
  // targetChars + headroom iterations is always enough to satisfy the char
  // target. This keeps the cap from truncating scaling for long durations.
  const maxLines = Math.max(200, Math.ceil(targetChars) + 1000);
  while (total < targetChars && guard < maxLines) {
    const line = pool[Math.floor(Math.random() * pool.length)];
    lines.push(line);
    total += line.length + 1;
    guard += 1;
  }
  const language: Language = layout.language === "english" ? "english" : "myanmar";
  const lesson: LessonData = {
    id: `test-material-${test.id}`,
    level: "advanced",
    number: 0,
    title: test.name,
    titleMy: test.name,
    description: "",
    difficulty: "hard" as Difficulty,
    estimatedMinutes: Math.max(1, Math.round(test.durationSeconds / 60)),
    language,
    layoutId: test.layoutId as "english-qwerty" | "myanmar3",
    completion: { minAccuracy: test.minAccuracy, minWpm: test.minWpm },
    phases: lines.map((text, i) => ({ instruction: `Line ${i + 1}`, text })),
  };
  return resolveLesson(lesson);
}

export function resolveMaterialLayout(layoutId: string): ReturnType<typeof getLayoutOrThrow> {
  return getLayoutOrThrow(layoutId);
}
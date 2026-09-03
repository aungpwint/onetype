import type { Level } from "../../types";
import { LEVEL_ORDER } from "../../types";
import type { LessonData } from "./types";
import { resolveLesson, type ResolvedLesson } from "./generator";
import { englishBeginnerLessons } from "../lessons/english-beginner";
import { englishIntermediateLessons } from "../lessons/english-intermediate";
import { englishAdvancedLessons } from "../lessons/english-advanced";
import { englishShiftLessons } from "../lessons/english-shift";
import { englishNumbersLessons } from "../lessons/english-numbers";
import { myanmarBeginnerLessons } from "../lessons/myanmar-beginner";
import { myanmarIntermediateLessons } from "../lessons/myanmar-intermediate";
import { myanmarAdvancedLessons } from "../lessons/myanmar-advanced";

export interface CurriculumMeta {
  totalLessons: number;
  countsByLevel: Record<Level, number>;
}

const SOURCE_LESSONS: LessonData[] = [
  ...englishBeginnerLessons,
  ...englishShiftLessons,
  ...englishNumbersLessons,
  ...englishIntermediateLessons,
  ...englishAdvancedLessons,
  ...myanmarBeginnerLessons,
  ...myanmarIntermediateLessons,
  ...myanmarAdvancedLessons,
];

export const LESSON_IDS: string[] = SOURCE_LESSONS.map((lesson) => lesson.id);

export const RESOLVED_LESSON_CACHE = new Map<string, ResolvedLesson>();

export function listAllLessons(): LessonData[] {
  return SOURCE_LESSONS;
}

export function getLessonData(id: string): LessonData {
  const lesson = SOURCE_LESSONS.find((l) => l.id === id);
  if (!lesson) {
    throw new Error(`Unknown lesson: "${id}"`);
  }
  return lesson;
}

export function hasLesson(id: string): boolean {
  return SOURCE_LESSONS.some((l) => l.id === id);
}

export function listLessons(level: Level): LessonData[] {
  return SOURCE_LESSONS
    .filter((lesson) => lesson.level === level)
    .sort((a, b) => a.number - b.number);
}

export function listLessonsByLevel(): Record<Level, LessonData[]> {
  const map: Record<Level, LessonData[]> = { beginner: [], intermediate: [], advanced: [] };
  for (const level of LEVEL_ORDER) {
    map[level] = listLessons(level);
  }
  return map;
}

export function resolveLessonById(id: string): ResolvedLesson {
  const cached = RESOLVED_LESSON_CACHE.get(id);
  if (cached) return cached;
  const resolved = resolveLesson(getLessonData(id));
  RESOLVED_LESSON_CACHE.set(id, resolved);
  return resolved;
}

export function getCurriculumMeta(): CurriculumMeta {
  return {
    totalLessons: SOURCE_LESSONS.length,
    countsByLevel: {
      beginner: listLessons("beginner").length,
      intermediate: listLessons("intermediate").length,
      advanced: listLessons("advanced").length,
    },
  };
}

export function totalLessonsInLevel(level: Level): number {
  return listLessons(level).length;
}

export function allResolvedLessonIds(): string[] {
  return LESSON_IDS;
}

export { resolveLesson } from "./generator";
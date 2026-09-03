import { describe, expect, it } from "vitest";
import { listAllLessons, resolveLessonById, hasLesson, getLessonData, getCurriculumMeta, allResolvedLessonIds } from "../curriculum";

describe("curriculum content", () => {
  const lessons = listAllLessons();
  const meta = getCurriculumMeta();

  it("has the expected number of lessons per level per language", () => {
    expect(meta.countsByLevel.beginner).toBe(81);
    expect(meta.countsByLevel.intermediate).toBe(33);
    expect(meta.countsByLevel.advanced).toBe(36);
    expect(meta.totalLessons).toBe(150);
  });

  it("every lesson id follows the convention lesson-{lang}-{level}-{number}", () => {
    for (const lesson of lessons) {
      const lang = lesson.language === "english" ? "en" : "my";
      expect(lesson.id).toBe(`lesson-${lang}-${lesson.level}-${lesson.number}`);
      expect(hasLesson(lesson.id)).toBe(true);
    }
  });

  it("every lesson resolves and every character reverse-maps to a key", () => {
    for (const id of allResolvedLessonIds()) {
      const resolved = resolveLessonById(id);
      expect(resolved.totalUnits).toBeGreaterThan(0);
      expect(resolved.phases.length).toBeGreaterThan(0);
    }
  });

  it("each lesson has distinct numbers within its level and language", () => {
    const seen = new Set<string>();
    for (const lesson of lessons) {
      const key = `${lesson.language}:${lesson.level}:${lesson.number}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it("every prerequisite references an existing lesson", () => {
    for (const lesson of lessons) {
      for (const prereq of lesson.prerequisites ?? []) {
        expect(getLessonData(prereq), `prereq "${prereq}" of "${lesson.id}"`).toBeDefined();
      }
    }
  });
});
import { describe, expect, it } from "vitest";
import type { Lesson } from "@/types/lesson";
import { createLessonRepository, loadLessonRecords, type LessonRecord } from "@/lib/lessons";
import { LessonNotFoundError, LessonCatalogError } from "@/lib/lessons/lesson-errors";

function customLesson(overrides: Partial<Lesson> = {}): Lesson {
  return {
    schemaVersion: 1,
    id: "lesson-custom-beginner-1",
    level: "beginner",
    language: "en",
    number: 1,
    title: "Custom Lesson One",
    description: "Loaded via the repository",
    difficulty: "easy",
    estimatedMinutes: 3,
    keyboard: "qwerty",
    completion: { minAccuracy: 80, minWpm: null },
    exercises: [{ id: "lesson-custom-beginner-1-ex-1", kind: "text", text: "custom text here" }],
    ...overrides,
  };
}

describe("lesson repository", () => {
  it("serves lessons from explicit records", () => {
    const record: LessonRecord = { source: "../../data/lessons/en/beginner/001-custom.json", lesson: customLesson() };
    const repository = createLessonRepository([record]);
    expect(repository.lessonCount()).toBe(1);
    expect(repository.hasLesson("lesson-custom-beginner-1")).toBe(true);
    const lesson = repository.getLesson("lesson-custom-beginner-1");
    expect(lesson.title).toBe("Custom Lesson One");
    expect(lesson.phases).toEqual([{ instruction: "custom text here", text: "custom text here" }]);
    expect(repository.exercisesOf("lesson-custom-beginner-1")).toHaveLength(1);
  });

  it("throws LessonNotFoundError for unknown ids", () => {
    const repository = createLessonRepository([{ source: "x", lesson: customLesson() }]);
    expect(() => repository.getLesson("nope")).toThrow(LessonNotFoundError);
    expect(repository.hasLesson("nope")).toBe(false);
  });

  it("orders lessons by language, level, then number", () => {
    const record = (lesson: Lesson): LessonRecord => ({ source: lesson.id, lesson });
    const repository = createLessonRepository([
      record(customLesson({ id: "lesson-my-beginner-1", language: "my", number: 1 })),
      record(customLesson({ id: "lesson-en-advanced-2", level: "advanced", number: 2 })),
      record(customLesson({ id: "lesson-en-advanced-1", level: "advanced", number: 1 })),
      record(customLesson({ id: "lesson-en-beginner-2", number: 2 })),
      record(customLesson({ id: "lesson-en-intermediate-1", level: "intermediate", number: 1 })),
    ]);
    expect(repository.ids()).toEqual([
      "lesson-en-beginner-2",
      "lesson-en-intermediate-1",
      "lesson-en-advanced-1",
      "lesson-en-advanced-2",
      "lesson-my-beginner-1",
    ]);
  });

  it("detects duplicate ids and duplicate numbers at catalog level", () => {
    const record = (lesson: Lesson): LessonRecord => ({ source: lesson.id, lesson });
    expect(() =>
      createLessonRepository([
        record(customLesson()),
        record(customLesson()),
      ]),
    ).toThrow(LessonCatalogError);

    expect(() =>
      createLessonRepository([
        record(customLesson({ id: "lesson-en-beginner-a" })),
        record(customLesson({ id: "lesson-en-beginner-b", number: 1 })),
      ]),
    ).toThrow(LessonCatalogError);
  });

  it("drops in a custom lesson alongside the shipped curriculum without clobbering it", () => {
    const shipped = loadLessonRecords().slice(0, 3);
    const extra: LessonRecord = {
      source: "../../data/lessons/en/beginner/061-custom.json",
      lesson: customLesson({ id: "lesson-en-beginner-61", number: 61 }),
    };
    const repository = createLessonRepository([...shipped, extra]);
    expect(repository.lessonCount()).toBe(4);
    expect(repository.hasLesson("lesson-en-beginner-61")).toBe(true);
    expect(repository.getLesson("lesson-en-beginner-61").number).toBe(61);
  });

  it("the shipped glob pipeline loads and validates every lesson file", () => {
    const records = loadLessonRecords();
    expect(records).toHaveLength(150);
    for (const record of records) {
      expect(record.lesson.schemaVersion).toBe(1);
      expect(record.lesson.exercises.length).toBeGreaterThan(0);
    }
  });
});
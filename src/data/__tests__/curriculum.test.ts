import { describe, expect, it } from "vitest";
import { listAllLessons, resolveLessonById, hasLesson, getLessonData, getCurriculumMeta, allResolvedLessonIds } from "../curriculum";
import { getLayoutOrThrow } from "../../core/keyboard-layout/registry";
import { remainingText, completedText } from "../../core/typing-engine/sequence";

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

  it("every lesson resolves and every item maps to a defined key in its layout", () => {
    for (const id of allResolvedLessonIds()) {
      const resolved = resolveLessonById(id);
      expect(resolved.totalUnits).toBeGreaterThan(0);
      expect(resolved.phases.length).toBeGreaterThan(0);
      const layout = getLayoutOrThrow(resolved.layoutId);
      for (const unit of resolved.sequence.units) {
        expect(layout.getKey(unit.keyCode), `unit ${unit.index} of "${id}"`).toBeDefined();
        expect(unit.finger).toBeTruthy();
        expect(unit.hand === "left" || unit.hand === "right").toBe(true);
        expect(unit.text.length).toBeGreaterThan(0);
      }
    }
  });

  it("phase ranges are contiguous and exactly cover every unit", () => {
    for (const id of allResolvedLessonIds()) {
      const resolved = resolveLessonById(id);
      let cursor = 0;
      for (const phase of resolved.phases) {
        expect(phase.startUnit, `phase ${phase.label} of "${id}"`).toBe(cursor);
        expect(phase.endUnit).toBeGreaterThanOrEqual(phase.startUnit);
        cursor = phase.endUnit;
        expect(phase.text.length).toBeGreaterThan(0);
      }
      expect(cursor).toBe(resolved.totalUnits);
      expect(cursor).toBe(resolved.sequence.units.length);
    }
  });

  it("every unit's shiftHand is consistent with requiring shift for that key", () => {
    for (const id of allResolvedLessonIds()) {
      const resolved = resolveLessonById(id);
      const layout = getLayoutOrThrow(resolved.layoutId);
      for (const unit of resolved.sequence.units) {
        const key = layout.getKey(unit.keyCode)!;
        const expectsShift = unit.modifier === "shift";
        if (expectsShift) {
          expect(unit.shiftHand, `unit ${unit.index} of "${id}"`).toBeTruthy();
          expect(unit.shiftHand).not.toBe(unit.hand);
        } else {
          expect(unit.shiftHand, `unit ${unit.index} of "${id}"`).toBeNull();
        }
        void key;
      }
    }
  });

  it("grapheme ranges are consistent with the units that reference them", () => {
    for (const id of allResolvedLessonIds()) {
      const resolved = resolveLessonById(id);
      const { units, graphemes, graphemeUnitRanges } = resolved.sequence;
      expect(graphemeUnitRanges.length, `ranges of "${id}"`).toBe(graphemes.length);
      for (let gi = 0; gi < graphemes.length; gi++) {
        const [start, end] = graphemeUnitRanges[gi];
        expect(start).toBeGreaterThanOrEqual(0);
        expect(end).toBeGreaterThanOrEqual(start);
        for (const unit of units) {
          if (unit.graphemeIndex === gi) {
            expect(unit.grapheme).toBe(graphemes[gi]);
          }
        }
      }
    }
  });

  it("remainingText and completedText stay coherent across multi-phase lessons", () => {
    const multi = allResolvedLessonIds().filter((id) => resolveLessonById(id).phases.length > 1);
    expect(multi.length).toBeGreaterThan(0);
    for (const id of multi.slice(0, 20)) {
      const seq = resolveLessonById(id).sequence;
      const lastUnit = seq.units.length - 1;
      for (const idx of [0, 1, Math.floor(lastUnit / 2), lastUnit]) {
        const remaining = remainingText(seq, idx);
        const completed = completedText(seq, idx);
        expect(typeof remaining).toBe("string");
        expect(typeof completed).toBe("string");
        expect(remaining.length).toBeGreaterThanOrEqual(0);
        expect(completed.length).toBeLessThanOrEqual(seq.text.length);
      }
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
import { LEVEL_ORDER, type Level } from "@/types";
import type { LessonLanguage } from "@/types/language";
import type { Lesson } from "@/types/lesson";

import { LessonCatalogError } from "./lesson-errors";
import type { LessonRecord } from "./lesson-loader";

export interface LessonCatalogIndexes {
  byId: Map<string, Lesson>;
  byLanguage: Map<LessonLanguage, Lesson[]>;
  byLevel: Map<Level, Lesson[]>;
  byLanguageAndLevel: Map<string, Lesson[]>;
}

const languageLevelKey = (language: LessonLanguage, level: Level) => `${language}:${level}`;

/**
 * Registry over a loaded lesson collection.
 *
 * Validates catalog-level coherence (no duplicate ids, at most one lesson per
 * `language+level+number`, no unexpected directories) and hands out indexed
 * lookups. The registry is the discovery/catalog layer; the repository sits on
 * top of it to serve normalized lessons to the application.
 */
export class LessonRegistry {
  readonly lessons: Lesson[];
  readonly indexes: LessonCatalogIndexes;
  readonly sources: Map<string, string>;

  constructor(records: LessonRecord[]) {
    this.lessons = records.map((record) => record.lesson);
    this.sources = new Map(records.map((record) => [record.lesson.id, record.source]));
    this.indexes = this.buildIndexes();
  }

  private buildIndexes(): LessonCatalogIndexes {
    const byId = new Map<string, Lesson>();
    const byLanguage: Map<LessonLanguage, Lesson[]> = new Map();
    const byLevel: Map<Level, Lesson[]> = new Map();
    const byLanguageAndLevel = new Map<string, Lesson[]>();
    const slots = new Set<string>();
    const issues: string[] = [];

    for (const lesson of this.lessons) {
      if (byId.has(lesson.id)) {
        issues.push(`Duplicate lesson id "${lesson.id}"`);
        continue;
      }
      byId.set(lesson.id, lesson);

      const slot = languageLevelKey(lesson.language, lesson.level);
      const key = `${slot}#${lesson.number}`;
      if (slots.has(key)) {
        issues.push(`Duplicate ${lesson.language}/${lesson.level} lesson number ${lesson.number} (id "${lesson.id}")`);
      }
      slots.add(key);

      byLanguage.set(lesson.language, [...(byLanguage.get(lesson.language) ?? []), lesson]);
      byLevel.set(lesson.level, [...(byLevel.get(lesson.level) ?? []), lesson]);
      byLanguageAndLevel.set(slot, [...(byLanguageAndLevel.get(slot) ?? []), lesson]);
    }

    if (issues.length > 0) {
      throw new LessonCatalogError(issues);
    }

    return { byId, byLanguage, byLevel, byLanguageAndLevel };
  }

  getById(id: string): Lesson | undefined {
    return this.indexes.byId.get(id);
  }

  getAll(): Lesson[] {
    return this.lessons;
  }

  getByLanguage(language: LessonLanguage): Lesson[] {
    return this.indexes.byLanguage.get(language) ?? [];
  }

  getByLevel(level: Level): Lesson[] {
    return this.indexes.byLevel.get(level) ?? [];
  }

  getByLanguageAndLevel(language: LessonLanguage, level: Level): Lesson[] {
    return this.indexes.byLanguageAndLevel.get(languageLevelKey(language, level)) ?? [];
  }

  count(): number {
    return this.lessons.length;
  }

  totalInLevel(level: Level): number {
    return (this.getByLevel(level) ?? []).length;
  }

  /** Ordered language-level index used by the UI to bucket lessons. */
  languageLevelBuckets(): Record<LessonLanguage, Record<Level, Lesson[]>> {
    const buckets: Record<LessonLanguage, Record<Level, Lesson[]>> = { en: { beginner: [], intermediate: [], advanced: [] }, my: { beginner: [], intermediate: [], advanced: [] } };
    for (const lesson of this.lessons) {
      buckets[lesson.language][lesson.level].push(lesson);
    }
    for (const language of ["en", "my"] as const) {
      for (const level of LEVEL_ORDER) {
        buckets[language][level].sort((a, b) => a.number - b.number);
      }
    }
    return buckets;
  }
}

export function getRegisteredSources(registry: LessonRegistry): Map<string, string> {
  return registry.sources;
}
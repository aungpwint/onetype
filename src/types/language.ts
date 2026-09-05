import type { Language } from "./index";
import { isLanguage } from "./index";

/**
 * Canonical lesson language identifiers used inside lesson JSON files and the
 * on-disk directory layout (`lessons/en/…`, `lessons/my/…`).
 *
 * These are deliberately separate from the legacy runtime `Language` union
 * ("english" | "myanmar" | "mixed") so the two representations do not get
 * conflated: the JSON schema speaks "en"/"my", while the existing application
 * domain model keeps its established values.
 */
export type LessonLanguage = "en" | "my";

export const LESSON_LANGUAGES: readonly LessonLanguage[] = ["en", "my"] as const;

export function isLessonLanguage(value: unknown): value is LessonLanguage {
  return typeof value === "string" && (LESSON_LANGUAGES as readonly string[]).includes(value);
}

const TO_LEGACY: Record<LessonLanguage, Language> = {
  en: "english",
  my: "myanmar",
};

export function toLegacyLanguage(language: LessonLanguage): Language {
  return TO_LEGACY[language];
}

export function fromLegacyLanguage(language: Language): LessonLanguage {
  if (language === "english") return "en";
  if (language === "myanmar") return "my";
  throw new Error(`Cannot represent "${language}" as a lesson language`);
}

export function lessonLanguageMatchesLegacy(language: LessonLanguage, legacy: Language): boolean {
  return isLanguage(legacy) && TO_LEGACY[language] === legacy;
}
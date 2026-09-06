import { isLanguage, type Language } from './index'

export type LessonLanguage = 'en' | 'my'

export const LESSON_LANGUAGES: readonly LessonLanguage[] = ['en', 'my'] as const

export function isLessonLanguage(value: unknown): value is LessonLanguage {
    return typeof value === 'string' && (LESSON_LANGUAGES as readonly string[]).includes(value)
}

const TO_LEGACY: Record<LessonLanguage, Language> = {
    en: 'english',
    my: 'myanmar',
}

export function toLegacyLanguage(language: LessonLanguage): Language {
    return TO_LEGACY[language]
}

export function fromLegacyLanguage(language: Language): LessonLanguage {
    if (language === 'english') return 'en'
    if (language === 'myanmar') return 'my'
    throw new Error(`Cannot represent "${language}" as a lesson language`)
}

export function lessonLanguageMatchesLegacy(language: LessonLanguage, legacy: Language): boolean {
    return isLanguage(legacy) && TO_LEGACY[language] === legacy
}

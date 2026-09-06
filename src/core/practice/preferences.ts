export type PracticeUnit = 'time' | 'words'

export interface PracticePreferences {
    unit: PracticeUnit
    time: number
    words: number
    lang: 'english' | 'myanmar'
}

export const PRACTICE_DEFAULTS: PracticePreferences = {
    unit: 'time',
    time: 30,
    words: 25,
    lang: 'english',
}

const VALID_TIMES = new Set([15, 30, 45, 60, 90, 120])
const VALID_WORDS = new Set([10, 25, 50, 100])

export function resolvedPracticePreferences(overrides: Partial<Record<keyof PracticePreferences, string | number>>): PracticePreferences {
    const unit: PracticeUnit = overrides.unit === 'words' ? 'words' : 'time'
    const rawTime = Number(overrides.time)
    const rawWords = Number(overrides.words)
    const lang = overrides.lang === 'myanmar' ? 'myanmar' : 'english'
    return {
        unit,
        time: VALID_TIMES.has(rawTime) ? rawTime : PRACTICE_DEFAULTS.time,
        words: VALID_WORDS.has(rawWords) ? rawWords : PRACTICE_DEFAULTS.words,
        lang,
    }
}
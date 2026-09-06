import type { SpeedLanguage, SpeedUnit } from '@/core/scoring/score'

/**
 * A first-class typing system profile. English and Myanmar are treated as two
 * distinct typing experiences that share the core engine but differ in how text
 * is segmented into typing units, how those units are counted, and which speed
 * label is honest to show the user.
 */
export interface TypingLanguageProfile {
    id: SpeedLanguage
    /** Human-readable language name. */
    label: string
    /** The speed unit the learner sees. */
    speedUnit: SpeedUnit
    /**
     * Unit-per-word convention used for word-oriented metrics. English counts
     * 5 keystrokes per word; Myanmar deliberately does not fake word lengths,
     * so this is informational only.
     */
    wordLength: number
    /** Split display text into user-perceived units (graphemes / syllables). */
    splitUnits: (text: string) => string[]
}

export function speedUnitLabel(language: SpeedLanguage): SpeedUnit {
    return language === 'myanmar' ? 'units/min' : 'wpm'
}
import type { TypingLanguageProfile } from './types'
import { splitMyanmarSyllables } from '@/core/unicode/myanmar'

/**
 * Myanmar typing is scored in typing units (keystrokes) per minute, and the
 * display text is segmented into complete syllable clusters so the caret and
 * wrong/flash rendering never split a shaped cluster. English's 5-unit "word"
 * convention does not apply, so wordLength stays informational.
 */
export const myanmarProfile: TypingLanguageProfile = {
    id: 'myanmar',
    label: 'Myanmar',
    speedUnit: 'units/min',
    wordLength: 5,
    splitUnits: splitMyanmarSyllables,
}
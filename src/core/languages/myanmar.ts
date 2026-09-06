import type { TypingLanguageProfile } from './types'
import { splitMyanmarSyllables } from '@/core/unicode/myanmar'

export const myanmarProfile: TypingLanguageProfile = {
    id: 'myanmar',
    label: 'Myanmar',
    speedUnit: 'units/min',
    wordLength: 5,
    splitUnits: splitMyanmarSyllables,
}

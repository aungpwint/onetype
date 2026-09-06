import type { TypingLanguageProfile } from './types'
import { splitGraphemes } from '@/core/unicode/graphemes'
import { WORD_LENGTH } from '@/core/scoring/score'

export const englishProfile: TypingLanguageProfile = {
    id: 'english',
    label: 'English',
    speedUnit: 'wpm',
    wordLength: WORD_LENGTH,
    splitUnits: splitGraphemes,
}
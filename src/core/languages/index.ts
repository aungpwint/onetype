import type { SpeedLanguage } from '@/core/scoring/score'
import type { TypingLanguageProfile } from './types'
import { englishProfile } from './english'
import { myanmarProfile } from './myanmar'

export type { TypingLanguageProfile } from './types'
export { englishProfile } from './english'
export { myanmarProfile } from './myanmar'

const BY_LANGUAGE: Record<SpeedLanguage, TypingLanguageProfile> = {
    english: englishProfile,
    myanmar: myanmarProfile,
}

export function profileFor(language: SpeedLanguage): TypingLanguageProfile {
    return BY_LANGUAGE[language]
}

export function profileForScript(script: 'english' | 'myanmar'): TypingLanguageProfile {
    return BY_LANGUAGE[script]
}
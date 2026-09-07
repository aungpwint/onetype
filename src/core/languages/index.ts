import type { SpeedLanguage } from '@/core/scoring/score'
import type { TypingLanguageProfile } from './types'
import { englishProfile } from './english'
import { myanmarProfile } from './myanmar'
import { mixedProfile } from './mixed'

export type { TypingLanguageProfile } from './types'
export { englishProfile } from './english'
export { myanmarProfile } from './myanmar'
export { mixedProfile } from './mixed'

const BY_LANGUAGE: Record<SpeedLanguage, TypingLanguageProfile> = {
    english: englishProfile,
    myanmar: myanmarProfile,
    mixed: mixedProfile,
}

export function profileFor(language: SpeedLanguage): TypingLanguageProfile {
    return BY_LANGUAGE[language]
}

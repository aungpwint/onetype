import type { TypingLanguageProfile } from './types'
import { splitMixedClusters } from '@/core/unicode/myanmar'

export const mixedProfile: TypingLanguageProfile = {
    id: 'mixed',
    label: 'Mixed English + Myanmar',
    speedUnit: 'units/min',
    wordLength: 5,
    splitUnits: splitMixedClusters,
}
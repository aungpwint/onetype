import type { SpeedLanguage, SpeedUnit } from '@/core/scoring/score'

export interface TypingLanguageProfile {
    id: SpeedLanguage
    label: string
    speedUnit: SpeedUnit
    wordLength: number
    splitUnits: (text: string) => string[]
}

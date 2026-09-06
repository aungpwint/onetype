import type { Modifier } from '@/types'
import type { KeyOutcome } from '@/core/typing-engine/engine'

export interface KeyTap {
    id: string
    code: string
    modifier: Modifier
    correct: number
    incorrect: number
}

export type KeyTapTone = 'clean' | 'slip' | 'heavy'

export interface KeyTapSummary {
    totalKeystrokes: number
    distinctKeys: number
    keystrokeAccuracy: number
    keys: KeyTap[]
    errorKeys: KeyTap[]
}

export function keyTapTone(tap: KeyTap): KeyTapTone {
    if (tap.incorrect === 0) return 'clean'
    return tap.incorrect > tap.correct ? 'heavy' : 'slip'
}

export function keyTapAccuracy(tap: KeyTap): number {
    const total = tap.correct + tap.incorrect
    return total === 0 ? 100 : (tap.correct / total) * 100
}

export function summarizeKeyTaps(keyOutcomes: Map<string, KeyOutcome>): KeyTapSummary {
    const keys: KeyTap[] = []
    let correct = 0
    let incorrect = 0
    for (const [id, outcome] of keyOutcomes) {
        const sep = id.lastIndexOf(':')
        const code = sep >= 0 ? id.slice(0, sep) : id
        const modifier = (sep >= 0 ? id.slice(sep + 1) : 'none') as Modifier
        if (outcome.correct <= 0 && outcome.incorrect <= 0) continue
        keys.push({ id, code, modifier, correct: outcome.correct, incorrect: outcome.incorrect })
        correct += outcome.correct
        incorrect += outcome.incorrect
    }

    const totalKeystrokes = correct + incorrect
    const errorKeys = keys
        .filter((tap) => tap.incorrect > 0)
        .sort((a, b) => b.incorrect - a.incorrect || a.correct - b.correct)

    return {
        totalKeystrokes,
        distinctKeys: keys.length,
        keystrokeAccuracy: totalKeystrokes === 0 ? 100 : (correct / totalKeystrokes) * 100,
        keys,
        errorKeys,
    }
}

export function worstKeys(summary: KeyTapSummary, limit = 5): KeyTap[] {
    return summary.errorKeys.slice(0, limit)
}
import type { KeyboardLayout } from '@/core/keyboard-layout/layout'
import { buildSequence } from '@/core/typing-engine/sequence'
import type { TypingUnit } from '@/core/typing-engine/sequence'
import { difficultyScore } from './difficulty'
import { maxConsecutiveSameChunk, meanChunkLength, distinctTokenRatio } from './pattern'
import type { LessonQuality, ExerciseGeneratorSpec } from './types'

export interface QualityInput {
    text: string
    layout: KeyboardLayout
    spec?: ExerciseGeneratorSpec
    mode?: 'drill' | 'prose'
    targetDifficulty?: number
}

function handShares(units: TypingUnit[]): { left: number; right: number } {
    let left = 0
    let right = 0
    for (const unit of units) {
        if (unit.hand === 'left') left += 1
        else right += 1
    }
    const total = left + right
    return total === 0 ? { left: 0, right: 0 } : { left: left / total, right: right / total }
}

function fingerShares(units: TypingUnit[]): Map<string, number> {
    const counts = new Map<string, number>()
    for (const unit of units) {
        counts.set(unit.finger, (counts.get(unit.finger) ?? 0) + 1)
    }
    const total = units.length
    const out = new Map<string, number>()
    for (const [finger, count] of counts) out.set(finger, total === 0 ? 0 : count / total)
    return out
}

function linear(value: number, lo: number, hi: number, idealLo: number, idealHi: number): number {
    if (value < lo || value > hi) return 0
    if (value >= idealLo && value <= idealHi) return 1
    if (value < idealLo) return (value - lo) / (idealLo - lo)
    return (hi - value) / (hi - idealHi)
}

function sameKeyMaxRun(units: TypingUnit[]): number {
    let best = 0
    let run = 0
    let prev = ''
    for (const unit of units) {
        if (unit.text === prev) {
            run += 1
        } else {
            run = 1
            prev = unit.text
        }
        if (run > best) best = run
    }
    return best
}

function specificKeyCoverage(units: TypingUnit[], keys: string[], layout: KeyboardLayout): number {
    if (keys.length === 0) return 1
    const present = new Set<string>()
    for (const unit of units) present.add(unit.text)
    let covered = 0
    for (const key of keys) {
        if (key.length === 1) {
            if (present.has(key)) covered += 1
            continue
        }
        // Multi-codepoint Myanmar units: check the logical grapheme appears
        // anywhere in the built sequence (its press order is a permutation).
        const seq = buildSequence(key, layout)
        const seqText = seq.text
        if (seqText.length > 0 && textOf(units).includes(seqText)) {
            covered += 1
        }
    }
    return covered / keys.length
}

function textOf(units: TypingUnit[]): string {
    const seen = new Set<number>()
    let out = ''
    for (const unit of units) {
        if (seen.has(unit.graphemeIndex)) continue
        seen.add(unit.graphemeIndex)
        out += unit.grapheme
    }
    return out
}

export function assessLessonQuality(input: QualityInput): LessonQuality {
    const { text, layout, mode = 'drill' } = input
    const sequence = buildSequence(text, layout)
    const units = sequence.units
    const factors = {
        repetitionScore: 1,
        varietyScore: 1,
        spacingScore: 1,
        fingerBalanceScore: 1,
        handBalanceScore: 1,
        transitionScore: 1,
        difficultyScore: 1,
        targetCoverageScore: 1,
    }

    if (units.length === 0) {
        return { score: 0, factors, issues: ['text has no typeable units'] }
    }

    const issues: string[] = []
    const maxRun = sameKeyMaxRun(units)
    const sameChunkRun = maxConsecutiveSameChunk(text)
    factors.repetitionScore = linear(maxRun, 0.0001, 6, 0.0001, 3) * linear(sameChunkRun, 0.0001, 4, 0.0001, 2)
    if (maxRun > 4 || sameChunkRun > 3) issues.push(`excessive repetition: max key run ${maxRun}, max identical chunk run ${sameChunkRun}`)

    factors.varietyScore = distinctTokenRatio(text)
    if (factors.varietyScore < 0.25) issues.push('chunks are nearly all identical')

    const chunkLen = meanChunkLength(text)
    factors.spacingScore = linear(chunkLen, 1.2, 18, 3, 8)
    if (chunkLen < 1.8) issues.push(`space after nearly every unit (mean chunk length ${chunkLen.toFixed(1)})`)
    if (chunkLen < 1.01) issues.push('every unit is space-separated')

    const fingers = fingerShares(units)
    let topFinger = 0
    for (const share of fingers.values()) topFinger = Math.max(topFinger, share)
    factors.fingerBalanceScore = linear(topFinger, 0, 0.75, 0, 0.35)
    if (topFinger > 0.55) issues.push(`single finger dominates (${(topFinger * 100).toFixed(0)}% of presses)`)

    const hands = handShares(units)
    const balance = Math.min(hands.left, hands.right)
    const handWin = linear(balance, 0, 0.35, 0.12, 0.3)
    factors.handBalanceScore = mode === 'prose' ? 1 : handWin
    if (mode === 'drill' && balance < 0.1) issues.push('one hand carries almost all presses')

    if (mode === 'drill' && units.length > 1) {
        let sameFingerTransitions = 0
        for (let i = 1; i < units.length; i += 1) {
            const prevFinger = units[i - 1]!.finger
            const curFinger = units[i]!.finger
            if (prevFinger === curFinger) sameFingerTransitions += 1
        }
        const ratio = sameFingerTransitions / (units.length - 1)
        factors.transitionScore = linear(ratio, 0, 0.6, 0, 0.22)
        if (ratio > 0.45) issues.push(`same-finger transitions too frequent (${(ratio * 100).toFixed(0)}%)`)
    }

    const diff = difficultyScore(units, text)
    if (input.targetDifficulty !== undefined) {
        const gap = Math.abs(diff - input.targetDifficulty)
        factors.difficultyScore = linear(gap, 0.6, 0.001, 0.12, 0.001)
        if (gap > 0.35) issues.push(`difficulty ${diff.toFixed(2)} too far from target ${input.targetDifficulty.toFixed(2)}`)
    } else {
        factors.difficultyScore = 1
    }

    if (input.spec && input.spec.type === 'chunks') {
        factors.targetCoverageScore = specificKeyCoverage(units, input.spec.keys, layout)
        if (factors.targetCoverageScore < 1) issues.push('not every targeted unit appears in the text')
    } else {
        factors.targetCoverageScore = 1
    }

    const weights = mode === 'prose' ? [0.15, 0.05, 0.4, 0.1, 0.1, 0.05, 0.05, 0.1] : [0.25, 0.1, 0.2, 0.1, 0.1, 0.1, 0.05, 0.1]
    const values = [
        factors.repetitionScore,
        factors.varietyScore,
        factors.spacingScore,
        factors.fingerBalanceScore,
        factors.handBalanceScore,
        factors.transitionScore,
        factors.difficultyScore,
        factors.targetCoverageScore,
    ]
    let score = 0
    for (let i = 0; i < values.length; i += 1) score += values[i]! * weights[i]!

    return {
        score: Math.round(score * 100),
        factors,
        issues: dedupe(issues),
    }
}

function dedupe(items: string[]): string[] {
    return [...new Set(items)]
}

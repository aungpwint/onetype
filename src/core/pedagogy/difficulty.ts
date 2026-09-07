import type { DifficultyDimensions, DifficultyProfile } from './types'

export interface UnitLike {
    keyCode: string
    modifier: 'none' | 'shift'
    finger: string
    hand: 'left' | 'right'
    grapheme: string
}

const LEVEL_MEANS: Record<string, number> = {
    basic: 0.18,
    easy: 0.34,
    medium: 0.56,
    hard: 0.78,
}

export function targetDifficultyForLabel(label: 'basic' | 'easy' | 'medium' | 'hard'): number {
    return LEVEL_MEANS[label] ?? 0.5
}

export function nearestDifficultyLabel(score: number): 'basic' | 'easy' | 'medium' | 'hard' {
    const labels = ['basic', 'easy', 'medium', 'hard'] as const
    let best: 'basic' | 'easy' | 'medium' | 'hard' = 'basic'
    let bestGap = Number.POSITIVE_INFINITY
    for (const label of labels) {
        const gap = Math.abs(targetDifficultyForLabel(label) - score)
        if (gap < bestGap) {
            bestGap = gap
            best = label
        }
    }
    return best
}

export function difficultyDimensions(units: UnitLike[], text: string): DifficultyDimensions {
    const uniqueKeys = new Set(units.map((u) => u.keyCode)).size
    const characterCount = units.length
    const shiftCount = units.filter((u) => u.modifier === 'shift').length

    let sameHand = 0
    let sameFinger = 0
    let rowChange = 0
    let transitions = 0
    for (let i = 1; i < units.length; i += 1) {
        const prev = units[i - 1]!
        const cur = units[i]!
        transitions += 1
        if (prev.hand === cur.hand) sameHand += 1
        if (prev.finger === cur.finger) sameFinger += 1
        if (rowLadder(prev) !== rowLadder(cur)) rowChange += 1
    }

    const graphemeComplexity = meanGraphemeComplexity(units)

    const tokens = text.split(/\s+/).filter((token) => token.length > 0)
    const meanChunkLength = tokens.length > 0 ? units.length / tokens.length : 0

    const entropy = unitEntropy(units)

    return {
        uniqueKeys,
        characterCount,
        shiftRatio: transitions > 0 ? shiftCount / units.length : 0,
        sameHandRatio: transitions > 0 ? sameHand / transitions : 0,
        sameFingerRatio: transitions > 0 ? sameFinger / transitions : 0,
        rowChangeRatio: transitions > 0 ? rowChange / transitions : 0,
        meanChunkLength,
        graphemeComplexity,
        entropy,
    }
}

function rowLadder(unit: UnitLike): number {
    const code = unit.keyCode
    if (/^Key[QWE RT]/.test(code) || /^Key[YUIOP]/.test(code)) return 2
    if (/^Key[ASDFGHJKL]/.test(code) || /^Key[ZXCVBNM]/.test(code)) {
        if (/^Key[ASDFGHJKL;]/.test(code)) return 1
        return 0
    }
    if (/^Digit/.test(code)) return 3
    if (code === 'Space') return 0
    return 1
}

function meanGraphemeComplexity(units: UnitLike[]): number {
    const perGrapheme = new Map<string, number>()
    for (const unit of units) {
        perGrapheme.set(unit.grapheme, (perGrapheme.get(unit.grapheme) ?? 0) + 1)
    }
    const counts = [...perGrapheme.values()]
    if (counts.length === 0) return 1
    return counts.reduce((sum, count) => sum + count, 0) / counts.length
}

function unitEntropy(units: UnitLike[]): number {
    if (units.length === 0) return 0
    const counts = new Map<string, number>()
    for (const unit of units) counts.set(unit.keyCode, (counts.get(unit.keyCode) ?? 0) + 1)
    let entropy = 0
    for (const count of counts.values()) {
        const p = count / units.length
        entropy -= p * Math.log2(p)
    }
    // Normalize to 0..1 relative to the maximum possible for this many units.
    const maxEntropy = Math.log2(Math.max(1, counts.size))
    return maxEntropy > 0 ? entropy / maxEntropy : 0
}

// Deterministic normalized difficulty in 0..1. Higher = harder. Weightings are
// empirical but intentional: handedness and same-finger tension dominate, then
// reach/entropy, then surface features (shift, cluster complexity).
export function difficultyScore(units: UnitLike[], text: string): number {
    const d = difficultyDimensions(units, text)
    const handTension = Math.min(1, d.sameHandRatio / 0.7)
    const fingerTension = Math.min(1, d.sameFingerRatio / 0.35)
    const reach = Math.min(1, d.rowChangeRatio / 0.5)
    const keySpread = Math.min(1, d.uniqueKeys / 26)
    const shiftWeight = Math.min(1, d.shiftRatio / 0.4)
    const clusterWeight = Math.min(1, (d.graphemeComplexity - 1) / 3)
    const entropyDamp = clamp01(1 - d.entropy) // low entropy = predictable = easier

    const score =
        0.28 * handTension + 0.24 * fingerTension + 0.14 * reach + 0.12 * keySpread + 0.1 * shiftWeight + 0.06 * clusterWeight + 0.06 * entropyDamp

    return clamp01(score)
}

export function computeDifficultyProfile(units: UnitLike[], text: string): DifficultyProfile {
    const dimensions = difficultyDimensions(units, text)
    return { score: difficultyScore(units, text), dimensions }
}

function clamp01(value: number): number {
    return Math.max(0, Math.min(1, value))
}

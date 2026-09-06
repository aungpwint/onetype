import type { StatInput, WeaknessConfig, WeaknessScore } from './types'

export const DEFAULT_WEAKNESS_CONFIG: WeaknessConfig = {
    minAttempts: 2,
    confidenceZ: 1.96,
}

export function attempts(stat: StatInput): number {
    return stat.correct + stat.incorrect
}

export function accuracyFraction(stat: StatInput): number {
    const n = attempts(stat)
    if (n <= 0) return 0
    return stat.correct / n
}

export function wilsonLowerBound(correct: number, n: number, z: number): number {
    if (n <= 0) return 0
    const p = correct / n
    const z2 = z * z
    const denom = 1 + z2 / n
    const center = p + z2 / (2 * n)
    const width = z * Math.sqrt(Math.max(0, (p * (1 - p) + z2 / (4 * n)) / n))
    return (center - width) / denom
}

export function weaknessScore(stat: StatInput, config: WeaknessConfig = DEFAULT_WEAKNESS_CONFIG): WeaknessScore {
    const n = attempts(stat)
    return {
        key: stat.key,
        accuracy: accuracyFraction(stat) * 100,
        attempts: n,
        lowerBound: wilsonLowerBound(stat.correct, n, config.confidenceZ),
    }
}

export function rankWeakest(stats: StatInput[], config: WeaknessConfig = DEFAULT_WEAKNESS_CONFIG): WeaknessScore[] {
    return stats
        .filter((s) => attempts(s) >= config.minAttempts)
        .map((s) => weaknessScore(s, config))
        .sort((a, b) => a.lowerBound - b.lowerBound)
}

export function topWeakest(stats: StatInput[], limit: number, config: WeaknessConfig = DEFAULT_WEAKNESS_CONFIG): WeaknessScore[] {
    return rankWeakest(stats, config).slice(0, Math.max(0, limit))
}

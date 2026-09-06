export type SpeedLanguage = 'english' | 'myanmar'

export type SpeedUnit = 'wpm' | 'units/min'

export interface ScoreMetrics {
    totalAttempts: number
    correctAttempts: number
    incorrectAttempts: number
    accuracy: number
    characters: number
    words: number
    grossWpm: number
    netWpm: number
    cpm: number
    elapsedSeconds: number
    backspaceCount: number
    /** Raw (accuracy-blind) speed in the language's own speed unit. */
    rawSpeed: number
    /** 0–100 pacing consistency, derived from per-second typing pace. */
    consistency: number
    /** The speed value shown to the user (wpm for English, units/min for Myanmar). */
    speed: number
    speedUnit: SpeedUnit
    /** Grapheme clusters fully typed (Myanmar syllables when applicable). */
    graphemeClusters: number
    language: SpeedLanguage
}

/** English counting convention: one word = 5 typing units (chars/keystrokes). */
export const WORD_LENGTH = 5

export interface ScoreInput {
    correctAttempts: number
    incorrectAttempts: number
    backspaceCount: number
    elapsedSeconds: number
    language?: SpeedLanguage
    /** Grapheme clusters completed (Myanmar). */
    clusters?: number
    /** Elapsed-millisecond timestamp of every correct keystroke. */
    correctTimes?: number[]
}

export function computeScore(input: ScoreInput): ScoreMetrics {
    const language: SpeedLanguage = input.language ?? 'english'
    const totalAttempts = input.correctAttempts + input.incorrectAttempts
    const accuracy = totalAttempts > 0 ? (input.correctAttempts / totalAttempts) * 100 : 0
    const minutes = input.elapsedSeconds / 60
    const characters = input.correctAttempts
    const words = characters / WORD_LENGTH
    const grossWpm = minutes > 0 ? words / minutes : 0
    const netWords = Math.max(0, characters - input.incorrectAttempts) / WORD_LENGTH
    const netWpm = minutes > 0 ? netWords / minutes : 0
    const cpm = minutes > 0 ? characters / minutes : 0

    // Myanmar is scored in typing units per minute: a keystroke is the atomic
    // input event, so its speed is honestly reported as units/min rather than
    // pretending 5 Myanmar graphemes equal one "word".
    const isMyanmar = language === 'myanmar'
    const speed = isMyanmar ? (minutes > 0 ? characters / minutes : 0) : grossWpm
    const rawSpeed = isMyanmar ? (minutes > 0 ? totalAttempts / minutes : 0) : (minutes > 0 ? totalAttempts / WORD_LENGTH / minutes : 0)
    const speedUnit: SpeedUnit = isMyanmar ? 'units/min' : 'wpm'

    return {
        totalAttempts,
        correctAttempts: characters,
        incorrectAttempts: input.incorrectAttempts,
        accuracy,
        characters,
        words,
        grossWpm,
        netWpm,
        cpm,
        elapsedSeconds: input.elapsedSeconds,
        backspaceCount: input.backspaceCount,
        rawSpeed,
        consistency: consistencyFromTimes(input.correctTimes ?? []),
        speed,
        speedUnit,
        graphemeClusters: input.clusters ?? 0,
        language,
    }
}

function consistencyFromTimes(correctTimes: number[]): number {
    if (correctTimes.length < 2) return 100
    const gaps: number[] = []
    // Idle stretches longer than a few seconds are rest pauses, not typist
    // rhythm, so they are excluded from pacing consistency.
    const PAUSE_CAP_MS = 3000
    for (let i = 1; i < correctTimes.length; i++) {
        const gap = correctTimes[i] - correctTimes[i - 1]
        if (gap < 0 || gap > PAUSE_CAP_MS) continue
        gaps.push(Math.max(1, gap))
    }
    if (gaps.length === 0) return 100
    const average = gaps.reduce((sum, g) => sum + g, 0) / gaps.length
    let deviation = 0
    for (const gap of gaps) deviation += Math.abs(gap - average)
    deviation /= gaps.length
    return clampPct((1 - deviation / average) * 100)
}

function clampPct(value: number): number {
    if (!Number.isFinite(value)) return 100
    return Math.max(0, Math.min(100, value))
}

/**
 * Per-second speed series for a pacing chart. Each bucket counts the correct
 * keystrokes whose elapsed timestamp lands inside it and converts them to the
 * language's own speed unit (wpm for English, typing units/min for Myanmar).
 * The final bucket is allowed to be partial so a short run still renders a
 * fair curve instead of one deflated trailing bar.
 */
export function speedSeries(input: ScoreInput & { elapsedSeconds: number }): number[] {
    const language = input.language ?? 'english'
    const times = input.correctTimes ?? []
    const elapsedSeconds = input.elapsedSeconds
    const total = Math.max(1, Math.ceil(elapsedSeconds))
    const out: number[] = []
    for (let i = 0; i < total; i += 1) {
        const from = i * 1000
        const to = Math.min(elapsedSeconds * 1000, (i + 1) * 1000)
        const widthMs = Math.max(1, to - from)
        let count = 0
        for (const t of times) {
            if (t >= from && t < to) count += 1
        }
        const wpm = count / (widthMs / 1000 / 60)
        out.push(language === 'myanmar' ? wpm : wpm / WORD_LENGTH)
    }
    return out
}
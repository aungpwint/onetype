import { MASTERY_ORDER, DEFAULT_MASTERY_CONFIG, type AttemptRecord, type MasteryConfig, type MasteryLevel } from './types'

export function isMasteryPass(attempt: AttemptRecord, minAccuracy: number, config: MasteryConfig = DEFAULT_MASTERY_CONFIG): boolean {
    if (!attempt.passed) return false
    return attempt.accuracy >= minAccuracy + config.accuracyMargin
}

export function computeMasteryLevel(attempts: AttemptRecord[], minAccuracy: number, config: MasteryConfig = DEFAULT_MASTERY_CONFIG): MasteryLevel {
    const isMaster = (a: AttemptRecord) => isMasteryPass(a, minAccuracy, config)
    const hasMasteredRun = attempts.length >= config.consecutivePassesRequired && attempts.slice(-config.consecutivePassesRequired).every(isMaster)
    if (hasMasteredRun) return 'mastered'

    const hasPass = attempts.some((a) => a.passed)
    if (hasPass) return 'passed'

    return attempts.length > 0 ? 'attempted' : 'not-started'
}

export function hasMasteryLevel(achieved: MasteryLevel, required: MasteryLevel): boolean {
    return MASTERY_ORDER.indexOf(achieved) >= MASTERY_ORDER.indexOf(required)
}

export function isLessonUnlocked(
    prerequisiteAttempts: AttemptRecord[],
    prerequisiteMinAccuracy: number,
    requiredLevel: MasteryLevel = 'passed',
    config: MasteryConfig = DEFAULT_MASTERY_CONFIG,
): boolean {
    const level = computeMasteryLevel(prerequisiteAttempts, prerequisiteMinAccuracy, config)
    return hasMasteryLevel(level, requiredLevel)
}

export interface MasteryDelta {
    before: MasteryLevel
    after: MasteryLevel
    improved: boolean
}

export function projectMasteryDelta(
    attemptsIncludingNew: AttemptRecord[],
    minAccuracy: number,
    config: MasteryConfig = DEFAULT_MASTERY_CONFIG,
): MasteryDelta {
    if (attemptsIncludingNew.length === 0) {
        return { before: 'not-started', after: 'not-started', improved: false }
    }
    const before = computeMasteryLevel(attemptsIncludingNew.slice(0, -1), minAccuracy, config)
    const after = computeMasteryLevel(attemptsIncludingNew, minAccuracy, config)
    return { before, after, improved: MASTERY_ORDER.indexOf(after) > MASTERY_ORDER.indexOf(before) }
}

export function computeMasteryForLessons(
    records: { lessonId: string; attempt: number; passed: boolean; accuracy: number }[],
    lessons: Record<string, { minAccuracy: number }>,
    config: MasteryConfig = DEFAULT_MASTERY_CONFIG,
): Map<string, MasteryLevel> {
    const grouped = new Map<string, { lessonId: string; attempt: number; passed: boolean; accuracy: number }[]>()
    for (const r of records) {
        if (!r.lessonId) continue
        const group = grouped.get(r.lessonId) ?? []
        group.push(r)
        grouped.set(r.lessonId, group)
    }
    const result = new Map<string, MasteryLevel>()
    for (const [lessonId, attempts] of grouped) {
        const sorted = [...attempts].sort((a, b) => a.attempt - b.attempt)
        const passAttempts: AttemptRecord[] = sorted.map((a) => ({ passed: a.passed, accuracy: a.accuracy }))
        const minAccuracy = lessons[lessonId]?.minAccuracy ?? 80
        result.set(lessonId, computeMasteryLevel(passAttempts, minAccuracy, config))
    }
    return result
}

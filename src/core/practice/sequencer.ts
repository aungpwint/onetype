import { computeMasteryLevel, hasMasteryLevel, type MasteryLevel } from '@/core/mastery'
import { DEFAULT_MASTERY_CONFIG, type AttemptRecord, type MasteryConfig } from '@/core/mastery/types'
import { DEFAULT_WEAKNESS_CONFIG, topWeakest, type StatInput, type WeaknessConfig } from '@/core/weakness'
import type { LessonData } from '@/data/curriculum/types'

export type RecommendationReason = 'unfinished' | 'blocked' | 'weak-key-boost' | 'review' | 'complete'

export interface LessonRecommendation {
    lesson: LessonData | null
    reason: RecommendationReason
    blockedLessonId?: string
}

export interface SequencerInput {
    lessons: LessonData[]
    attemptsByLesson: Record<string, AttemptRecord[]>
    minAccuracyByLesson?: Partial<Record<string, number>>
    keyStats?: StatInput[]
    requiredLevel?: MasteryLevel
    masteryConfig?: MasteryConfig
    weaknessConfig?: WeaknessConfig
    weakBoostThreshold?: number
}

const DEFAULT_REQUIRED_LEVEL: MasteryLevel = 'passed'
const DEFAULT_WEAK_BOOST_THRESHOLD = 0.75

function minAccuracyFor(lesson: LessonData, input: SequencerInput): number {
    return input.minAccuracyByLesson?.[lesson.id] ?? lesson.completion.minAccuracy
}

function attemptsFor(lesson: LessonData, input: SequencerInput): AttemptRecord[] {
    return input.attemptsByLesson[lesson.id] ?? []
}

export function masteryOfLesson(lesson: LessonData, input: SequencerInput): MasteryLevel {
    return computeMasteryLevel(attemptsFor(lesson, input), minAccuracyFor(lesson, input), input.masteryConfig ?? DEFAULT_MASTERY_CONFIG)
}

function prerequisitesOf(lesson: LessonData, index: number, input: SequencerInput): string[] {
    if (lesson.prerequisites && lesson.prerequisites.length > 0) return lesson.prerequisites
    if (index > 0) return [input.lessons[index - 1].id]
    return []
}

export function isLessonAccessible(input: SequencerInput, index: number, requiredLevel: MasteryLevel = DEFAULT_REQUIRED_LEVEL): boolean {
    const lesson = input.lessons[index]
    if (!lesson || index < 0 || index >= input.lessons.length) return false
    if (index === 0 && prerequisitesOf(lesson, index, input).length === 0) return true
    return prerequisitesOf(lesson, index, input).every((id) => {
        const found = input.lessons.findIndex((l) => l.id === id)
        if (found === -1) return true
        return hasMasteryLevel(masteryOfLesson(input.lessons[found], input), requiredLevel)
    })
}

function normalizeKey(value: string): string {
    return value.toLowerCase().replace(/^key/, '')
}

function keysOverlap(focusKeys: string[] | undefined, weak: Set<string>): boolean {
    if (!focusKeys || focusKeys.length === 0) return true
    return focusKeys.some((k) => weak.has(normalizeKey(k)))
}

export function weakKeys(input: SequencerInput): Set<string> {
    if (!input.keyStats || input.keyStats.length === 0) return new Set()
    const threshold = input.weakBoostThreshold ?? DEFAULT_WEAK_BOOST_THRESHOLD
    return new Set(
        topWeakest(input.keyStats, input.keyStats.length, input.weaknessConfig ?? DEFAULT_WEAKNESS_CONFIG)
            .filter((score) => score.lowerBound < threshold)
            .map((score) => normalizeKey(score.key)),
    )
}

export function recommendNextLesson(input: SequencerInput): LessonRecommendation {
    const requiredLevel = input.requiredLevel ?? DEFAULT_REQUIRED_LEVEL

    const unfinished: { lesson: LessonData; index: number }[] = []
    const passed: { lesson: LessonData; index: number }[] = []
    for (let i = 0; i < input.lessons.length; i += 1) {
        const level = masteryOfLesson(input.lessons[i], input)
        if (hasMasteryLevel(level, 'passed')) passed.push({ lesson: input.lessons[i], index: i })
        else unfinished.push({ lesson: input.lessons[i], index: i })
    }

    const firstUnfinished = unfinished[0]
    if (firstUnfinished) {
        if (isLessonAccessible(input, firstUnfinished.index, requiredLevel)) {
            return { lesson: firstUnfinished.lesson, reason: 'unfinished' }
        }
        return { lesson: null, reason: 'blocked', blockedLessonId: firstUnfinished.lesson.id }
    }

    const weak = weakKeys(input)
    if (weak.size > 0) {
        const boosted = passed.find(
            (item) => !hasMasteryLevel(masteryOfLesson(item.lesson, input), 'mastered') && keysOverlap(item.lesson.focusKeys, weak),
        )
        if (boosted) return { lesson: boosted.lesson, reason: 'weak-key-boost' }
    }

    const redo = passed.find((item) => !hasMasteryLevel(masteryOfLesson(item.lesson, input), 'mastered'))
    if (redo) return { lesson: redo.lesson, reason: 'review' }

    return { lesson: null, reason: 'complete' }
}

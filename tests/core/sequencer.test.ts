import { describe, expect, it } from 'vitest'
import { computeMasteryLevel, type AttemptRecord } from '@/core/mastery'
import { isLessonAccessible, recommendNextLesson, type SequencerInput } from '@/core/practice'
import type { LessonData } from '@/data/curriculum/types'

const PASS_ACCURACY = 95
const PASS_ATTEMPTS: AttemptRecord[] = [
    { passed: true, accuracy: PASS_ACCURACY },
    { passed: true, accuracy: PASS_ACCURACY },
    { passed: true, accuracy: PASS_ACCURACY },
]
const MASTERED = 'mastered'
const PASSED = 'passed'

function makeLesson(overrides: Partial<LessonData> & { id: string; number: number }): LessonData {
    const defaults: Omit<LessonData, 'id' | 'number'> = {
        level: 'beginner',
        title: 'Lesson',
        titleMy: '',
        description: '',
        difficulty: 'easy',
        estimatedMinutes: 5,
        language: 'english',
        layoutId: 'english-qwerty',
        completion: { minAccuracy: 80, minWpm: null },
        prerequisites: [],
        focusKeys: [],
        phases: [],
    }
    return { ...defaults, ...overrides } as LessonData
}

const CHAIN = [
    makeLesson({ id: 'L1', number: 1 }),
    makeLesson({ id: 'L2', number: 2, prerequisites: ['L1'] }),
    makeLesson({ id: 'L3', number: 3, prerequisites: ['L2'] }),
    makeLesson({ id: 'L4', number: 4, prerequisites: ['L3'] }),
]

function input(overrides: Partial<SequencerInput>): SequencerInput {
    return {
        lessons: CHAIN,
        attemptsByLesson: {},
        ...overrides,
    }
}

describe('sequencer — accessibility', () => {
    it('the first lesson is always accessible', () => {
        expect(isLessonAccessible(input({}), 0)).toBe(true)
    })

    it('a lesson stays locked until its direct prerequisite is passed', () => {
        expect(isLessonAccessible(input({}), 1)).toBe(false)
        expect(isLessonAccessible(input({ attemptsByLesson: { L1: PASS_ATTEMPTS } }), 1)).toBe(true)
        expect(isLessonAccessible(input({ attemptsByLesson: { L1: [{ passed: false, accuracy: 30 }] } }), 1)).toBe(false)
    })

    it('unknown-presence prerequisites never block a lesson', () => {
        const three = makeLesson({ id: 'L3', number: 3, prerequisites: ['ghost'] })
        expect(isLessonAccessible(input({ lessons: CHAIN.slice(0, 1).concat([three]) }), 1)).toBe(true)
    })

    it('a multi-prerequisite lesson needs every prerequisite', () => {
        const three = makeLesson({ id: 'L3', number: 3, prerequisites: ['L1', 'L2'] })
        const withTwo = [CHAIN[0], CHAIN[1], three]
        const partial = input({ lessons: withTwo, attemptsByLesson: { L1: PASS_ATTEMPTS } })
        expect(isLessonAccessible(partial, 2)).toBe(false)
        partial.attemptsByLesson.L2 = PASS_ATTEMPTS
        expect(isLessonAccessible(partial, 2)).toBe(true)
    })
})

describe('sequencer — recommendation', () => {
    it('returns the earliest unfinished reachable lesson', () => {
        const rec = recommendNextLesson(input({ attemptsByLesson: { L1: PASS_ATTEMPTS } }))
        expect(rec.reason).toBe('unfinished')
        expect(rec.lesson?.id).toBe('L2')
    })

    it('reports blocked when the next unfinished lesson needs a higher pass on an earlier lesson', () => {
        const twoPasses: AttemptRecord[] = [
            { passed: true, accuracy: PASS_ACCURACY },
            { passed: true, accuracy: PASS_ACCURACY },
        ]
        const rec = recommendNextLesson(input({ lessons: CHAIN.slice(0, 2), attemptsByLesson: { L1: twoPasses }, requiredLevel: 'mastered' }))
        expect(rec.reason).toBe('blocked')
        expect(rec.lesson).toBeNull()
        expect(rec.blockedLessonId).toBe('L2')
    })

    it('prefers a weak-key boost over a plain review pass', () => {
        const focused = makeLesson({ id: 'L3', number: 3, prerequisites: ['L2'], focusKeys: ['KeyF'] })
        const allPassed = input({
            lessons: [CHAIN[0], CHAIN[1], focused, CHAIN[3]],
            attemptsByLesson: { L1: PASS_ATTEMPTS, L2: PASS_ATTEMPTS, L3: [{ passed: true, accuracy: PASS_ACCURACY }], L4: PASS_ATTEMPTS },
            keyStats: [{ key: 'KeyF', correct: 4, incorrect: 60 }],
        })
        const rec = recommendNextLesson(allPassed)
        expect(rec.reason).toBe('weak-key-boost')
        expect(rec.lesson?.id).toBe('L3')
    })

    it('never boosts without key stats', () => {
        const allPassed = input({
            attemptsByLesson: { L1: PASS_ATTEMPTS, L2: PASS_ATTEMPTS, L3: [{ passed: true, accuracy: PASS_ACCURACY }], L4: PASS_ATTEMPTS },
        })
        const rec = recommendNextLesson(allPassed)
        expect(rec.reason).not.toBe('weak-key-boost')
    })

    it('reviews the earliest passed-but-not-mastered lesson when nothing is weak', () => {
        const allPassed = input({
            attemptsByLesson: { L1: PASS_ATTEMPTS, L2: PASS_ATTEMPTS, L3: [{ passed: true, accuracy: PASS_ACCURACY }], L4: PASS_ATTEMPTS },
        })
        const rec = recommendNextLesson(allPassed)
        expect(rec.reason).toBe('review')
        expect(rec.lesson?.id).toBe('L3')
    })

    it('is complete when every lesson is mastered', () => {
        const mastered: Record<string, AttemptRecord[]> = {}
        for (const lesson of CHAIN) mastered[lesson.id] = PASS_ATTEMPTS
        const rec = recommendNextLesson(input({ attemptsByLesson: mastered }))
        expect(rec.reason).toBe('complete')
        expect(rec.lesson).toBeNull()
    })
})

describe('sequencer — mastery levels', () => {
    it('classifies single pass, triple pass and failed attempts', () => {
        expect(computeMasteryLevel([{ passed: false, accuracy: 20 }], 80)).toBe('attempted')
        expect(computeMasteryLevel([{ passed: true, accuracy: 92 }], 80)).toBe(PASSED)
        expect(
            computeMasteryLevel(
                [
                    { passed: true, accuracy: 92 },
                    { passed: true, accuracy: 94 },
                    { passed: true, accuracy: 95 },
                ],
                80,
            ),
        ).toBe(MASTERED)
    })
})

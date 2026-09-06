import { describe, expect, it } from 'vitest'

import type { TestResult, TypingTest } from '@/services/types'
import { focusQueue } from '@/core/tests/focus'

const TEST: TypingTest = {
    id: 't1',
    code: 'MY-90-1',
    name: 'Paper One',
    durationSeconds: 90,
    language: 'myanmar',
    layoutId: 'myanmar-pyidaungsu',
    minAccuracy: 96,
    minWpm: 30,
    contentVersion: 1,
}

function result(over: Partial<TestResult>): TestResult {
    return {
        id: 'r-0',
        studentId: 's-1',
        testId: 't1',
        attempt: 1,
        wpm: 40,
        cpm: 200,
        accuracy: 95,
        errors: 0,
        correctCount: 80,
        durationSeconds: 90,
        passed: false,
        passedAccuracy: false,
        passedWpm: false,
        scoredOn: 1000,
        layoutId: 'myanmar-pyidaungsu',
        contentVersion: 1,
        ...over,
    }
}

function test(over: Partial<TypingTest>): TypingTest {
    return { ...TEST, ...over }
}

describe('focusQueue', () => {
    it('ranks unpassed papers by combined shortfall', () => {
        const a = test({ id: 'a', code: 'MY-90-1', minWpm: 30, minAccuracy: 96 })
        const b = test({ id: 'b', code: 'MY-90-2', minWpm: 30, minAccuracy: 96 })
        const queue = focusQueue(
            [result({ testId: 'a', wpm: 29, accuracy: 96 }), result({ testId: 'b', wpm: 20, accuracy: 80 })],
            [a, b],
            3,
        )
        expect(queue.map((e) => e.code)).toEqual(['MY-90-1', 'MY-90-2'])
        expect(queue[0].shortfall).toBe(1)
        expect(queue[1].shortfall).toBe(26)
    })

    it('skips papers that have already been passed', () => {
        const queue = focusQueue([result({ testId: 't1', wpm: 31, accuracy: 97, passed: true })], [TEST], 3)
        expect(queue).toEqual([])
    })

    it('treats a null wpm target as no wpm shortfall', () => {
        const accOnly = test({ id: 't1', minWpm: null })
        const queue = focusQueue([result({ testId: 't1', wpm: 5, accuracy: 96 })], [accOnly], 3)
        expect(queue[0].shortfall).toBe(0)
    })

    it('bases the gap on the best run, not the latest', () => {
        const queue = focusQueue([result({ attempt: 1, wpm: 40, accuracy: 99, scoredOn: 1000 }), result({ attempt: 2, wpm: 10, accuracy: 50, scoredOn: 2000 })], [TEST], 3)
        expect(queue[0].shortfall).toBe(0)
        expect(queue[0].bestWpm).toBe(40)
    })

    it('returns an empty queue when nothing is attempted', () => {
        expect(focusQueue([], [TEST], 3)).toEqual([])
    })

    it('honours the limit', () => {
        const papers = [1, 2, 3, 4].map((n) => test({ id: `t${n}`, code: `MY-90-${n}`, minWpm: 30, minAccuracy: 96 }))
        const runs = papers.map((p) => result({ testId: p.id, wpm: 28, accuracy: 95 }))
        expect(focusQueue(runs, papers, 2).length).toBe(2)
    })
})
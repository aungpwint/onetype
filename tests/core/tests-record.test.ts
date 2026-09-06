import { describe, expect, it } from 'vitest'

import type { TestResult, TypingTest } from '@/services/types'
import { buildTestRecord, type TestRecordEntry } from '@/core/tests/record'

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

describe('buildTestRecord', () => {
    it('picks the best run per paper and flags a passed paper', () => {
        const record = buildTestRecord(
            [result({ attempt: 1, wpm: 38, accuracy: 97, passed: true, scoredOn: 2000 }), result({ attempt: 2, wpm: 52, accuracy: 94, scoredOn: 3000 })],
            [TEST],
        )
        const entry: TestRecordEntry = record[0]
        expect(entry.code).toBe('MY-90-1')
        expect(entry.bestWpm).toBe(52)
        expect(entry.bestAccuracy).toBe(94)
        expect(entry.attempts).toBe(2)
        expect(entry.passed).toBe(true)
        expect(entry.lastAttemptAt).toBe(3000)
    })

    it('considers a paper passed if any run passed', () => {
        const record = buildTestRecord(
            [result({ attempt: 1, wpm: 50, passed: false, scoredOn: 1000 }), result({ attempt: 2, wpm: 31, passed: true, scoredOn: 2000 })],
            [TEST],
        )
        expect(record[0].passed).toBe(true)
    })

    it('leaves tests without any result out', () => {
        const record = buildTestRecord([], [TEST])
        expect(record).toEqual([])
    })

    it('ignores results that reference unknown papers', () => {
        const record = buildTestRecord([result({ testId: 'ghost' })], [TEST])
        expect(record).toEqual([])
    })

    it('sorts papers by code', () => {
        const b: TypingTest = { ...TEST, id: 't2', code: 'EN-60-1' }
        const record = buildTestRecord(
            [result({ testId: 't1', scoredOn: 3000 }), result({ testId: 't2', scoredOn: 1000 })],
            [TEST, b],
        )
        expect(record.map((e) => e.code)).toEqual(['EN-60-1', 'MY-90-1'])
    })
})
import { describe, expect, it } from 'vitest'

import { rankClassOnTest, type BestRun, type LeaderboardCandidate } from '@/core/leaderboard/ranking'

const a = (over: Partial<BestRun> & { testId: string }): BestRun => ({
    wpm: 40,
    accuracy: 96,
    passed: true,
    scoredOn: 1000,
    ...over,
})

const student = (over: Partial<LeaderboardCandidate> & { runs: BestRun[] }): LeaderboardCandidate => ({
    studentId: over.studentId ?? 's-0',
    name: over.name ?? 'Student',
    runs: over.runs,
})

describe('rankClassOnTest', () => {
    it('orders learners by their best WPM on the chosen paper', () => {
        const entries = rankClassOnTest(
            [
                student({ studentId: 'a', name: 'Aung', runs: [a({ testId: 't1', wpm: 42 })] }),
                student({ studentId: 'b', name: 'Bo', runs: [a({ testId: 't1', wpm: 55 })] }),
                student({ studentId: 'c', name: 'Cho', runs: [a({ testId: 't1', wpm: 30 })] }),
            ],
            't1',
        )
        expect(entries.map((e) => e.name)).toEqual(['Bo', 'Aung', 'Cho'])
        expect(entries.map((e) => e.rank)).toEqual([1, 2, 3])
    })

    it('keeps only the best run when a learner typed a paper multiple times', () => {
        const entries = rankClassOnTest(
            [
                student({
                    studentId: 'a',
                    name: 'Aung',
                    runs: [
                        a({ testId: 't1', wpm: 38, accuracy: 98 }),
                        a({ testId: 't1', wpm: 52, accuracy: 92, scoredOn: 2000 }),
                        a({ testId: 't1', wpm: 47, accuracy: 99 }),
                    ],
                }),
            ],
            't1',
        )
        expect(entries).toHaveLength(1)
        expect(entries[0].bestWpm).toBe(52)
        expect(entries[0].attempts).toBe(3)
    })

    it('ignores runs on other papers', () => {
        const entries = rankClassOnTest([student({ studentId: 'a', name: 'Aung', runs: [a({ testId: 't2', wpm: 99 })] })], 't1')
        expect(entries).toHaveLength(0)
    })

    it('breaks WPM ties by accuracy, then by earliest run, then by name', () => {
        const entries = rankClassOnTest(
            [
                student({ studentId: 'a', name: 'Aung', runs: [a({ testId: 't1', wpm: 50, accuracy: 90, scoredOn: 3000 })] }),
                student({ studentId: 'b', name: 'Bo', runs: [a({ testId: 't1', wpm: 50, accuracy: 95, scoredOn: 2000 })] }),
                student({ studentId: 'c', name: 'Cho', runs: [a({ testId: 't1', wpm: 50, accuracy: 95, scoredOn: 1000 })] }),
            ],
            't1',
        )
        expect(entries.map((e) => e.name)).toEqual(['Cho', 'Bo', 'Aung'])
    })

    it('leaves learners without a run on the paper off the board', () => {
        const entries = rankClassOnTest(
            [
                student({ studentId: 'a', name: 'Aung', runs: [a({ testId: 't1', wpm: 42 })] }),
                student({ studentId: 'b', name: 'Bo', runs: [a({ testId: 't2', wpm: 99 })] }),
            ],
            't1',
        )
        expect(entries.map((e) => e.name)).toEqual(['Aung'])
    })

    it('counts passing attempts across the paper', () => {
        const entries = rankClassOnTest(
            [
                student({
                    studentId: 'a',
                    name: 'Aung',
                    runs: [
                        a({ testId: 't1', wpm: 40, passed: false }),
                        a({ testId: 't1', wpm: 35, passed: true }),
                        a({ testId: 't1', wpm: 45, passed: true }),
                    ],
                }),
            ],
            't1',
        )
        expect(entries[0].attempts).toBe(3)
        expect(entries[0].passedAttempts).toBe(2)
        expect(entries[0].passed).toBe(true)
    })

    it('returns an empty board for no input', () => {
        expect(rankClassOnTest([], 't1')).toEqual([])
    })
})

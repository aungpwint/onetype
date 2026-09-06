import { describe, expect, it } from 'vitest'

import { dailyGoalState } from '@/core/goals/daily-goal'

describe('dailyGoalState', () => {
    it('measures progress toward the goal', () => {
        expect(dailyGoalState(10, 15)).toEqual({ fraction: 2 / 3, percent: 67, completed: false, remainingMinutes: 5 })
    })

    it('marks a completed day', () => {
        const info = dailyGoalState(15, 15)
        expect(info.completed).toBe(true)
        expect(info.fraction).toBe(1)
        expect(info.percent).toBe(100)
        expect(info.remainingMinutes).toBe(0)

        expect(dailyGoalState(23, 15).completed).toBe(true)
    })

    it('clamps above the goal to a full ring', () => {
        const info = dailyGoalState(40, 15)
        expect(info.fraction).toBe(1)
        expect(info.percent).toBe(100)
    })

    it('never reports negative progress', () => {
        const info = dailyGoalState(-4, 15)
        expect(info.fraction).toBe(0)
        expect(info.percent).toBe(0)
        expect(info.remainingMinutes).toBe(15)
    })

    it('treats a zero or unset goal as no goal', () => {
        for (const goal of [0, -5]) {
            const info = dailyGoalState(30, goal)
            expect(info.fraction).toBe(0)
            expect(info.completed).toBe(false)
        }
    })

    it('floors the goal to whole minutes', () => {
        const info = dailyGoalState(15, 15.9)
        expect(info.completed).toBe(true)
        expect(info.percent).toBe(100)
    })
})
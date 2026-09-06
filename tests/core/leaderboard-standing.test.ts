import { describe, expect, it } from 'vitest'

import { classStanding } from '@/core/leaderboard/standing'

describe('classStanding', () => {
    it('reports the learner position from their board entry', () => {
        expect(classStanding({ rank: 3 }, 12)).toEqual({ rank: 3, total: 12, hasStanding: true })
    })

    it('has no standing when the learner has not attempted the paper', () => {
        expect(classStanding(null, 8)).toEqual({ rank: 0, total: 8, hasStanding: false })
    })

    it('has no standing on an empty board', () => {
        expect(classStanding({ rank: 1 }, 0)).toEqual({ rank: 0, total: 0, hasStanding: false })
    })

    it('clamps out-of-range ranks into the board', () => {
        expect(classStanding({ rank: 99 }, 5).rank).toBe(5)
        expect(classStanding({ rank: 0 }, 5).rank).toBe(1)
        expect(classStanding({ rank: -3 }, 5).rank).toBe(1)
    })
})
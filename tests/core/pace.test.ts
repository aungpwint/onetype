import { describe, expect, it } from 'vitest'

import { paceState } from '@/core/session/pace'

describe('paceState', () => {
    it('flags on-pace when live stats already clear both targets', () => {
        expect(paceState(45, 97, 30, 96)).toEqual({ onPace: true, byWpm: 0, byAccuracy: 0 })
    })

    it('reports the wpm shortfall when under target', () => {
        expect(paceState(28, 97, 30, 96)).toEqual({ onPace: false, byWpm: 2, byAccuracy: 0 })
    })

    it('reports the accuracy shortfall when under target', () => {
        expect(paceState(45, 94, 30, 96)).toEqual({ onPace: false, byWpm: 0, byAccuracy: 2 })
    })

    it('ignores a null wpm target', () => {
        expect(paceState(5, 99, null, 96)).toEqual({ onPace: true, byWpm: 0, byAccuracy: 0 })
    })

    it('treats negative live values as zero gap beyond target', () => {
        const pace = paceState(-2, -1, 30, 96)
        expect(pace.byWpm).toBe(32)
        expect(pace.byAccuracy).toBe(97)
        expect(pace.onPace).toBe(false)
    })
})
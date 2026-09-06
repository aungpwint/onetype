import { describe, expect, it } from 'vitest'
import { Stopwatch } from '@/core/timing/stopwatch'

describe('Stopwatch', () => {
    it('measures honest elapsed time from start', () => {
        let now = 0
        const w = new Stopwatch(() => now)
        w.start()
        now = 250
        expect(w.elapsedMs()).toBe(250)
        now = 1_000
        expect(w.elapsedMs()).toBe(1_000)
    })

    it('starts from zero when a previous run is reset', () => {
        let now = 0
        const w = new Stopwatch(() => now)
        w.start()
        now = 500
        expect(w.elapsedMs()).toBe(500)
        w.reset()
        now = 800 // fresh epoch after the reset
        w.start()
        expect(w.elapsedMs()).toBe(0)
        now = 1_100
        expect(w.elapsedMs()).toBe(300)
    })

    it('excludes paused time from elapsed', () => {
        let now = 1_000
        const w = new Stopwatch(() => now)
        w.start()
        now = 3_000
        w.pause()
        now = 13_000 // 10s of pause
        w.start()
        expect(w.elapsedMs()).toBe(2_000)
    })

    it('freezes elapsed while paused', () => {
        let now = 0
        const w = new Stopwatch(() => now)
        w.start()
        now = 500
        w.pause()
        expect(w.elapsedMs()).toBe(500)
        now = 8_000
        expect(w.elapsedMs()).toBe(500)
    })

    it('caps a frozen-tab burst to the burst budget and discards the rest', () => {
        let now = 0
        const w = new Stopwatch(() => now, 1000)
        w.start()
        now = 40
        expect(w.elapsedMs()).toBe(40) // a normal read is credited in full
        now = 60_000 // the tab was frozen for ~60s between reads
        expect(w.elapsedMs()).toBe(1_040) // only 1000ms of burst is credited
        expect(w.correctedJumpsCount()).toBe(1)
    })

    it('does not re-trigger a correction on the read right after a burst', () => {
        let now = 0
        const w = new Stopwatch(() => now, 1000)
        w.start()
        now = 30
        w.elapsedMs()
        now = 30_000 // frozen gap
        expect(w.elapsedMs()).toBe(1_030)
        now = 30_050 // a normal small read
        expect(w.elapsedMs()).toBe(1_080)
        expect(w.correctedJumpsCount()).toBe(1)
    })

    it('returns credited elapsed after finish (no extra credit for the final gap)', () => {
        let now = 0
        const w = new Stopwatch(() => now, 1000)
        w.start()
        now = 200
        w.elapsedMs()
        w.finish()
        now = 50_000
        expect(w.elapsedMs()).toBe(200)
    })

    it('supports fractional slow-motion reads without correction', () => {
        let now = 0
        const w = new Stopwatch(() => now, 1000)
        w.start()
        for (const ms of [250, 500, 750, 1_000]) {
            now = ms
            expect(w.elapsedMs()).toBe(ms)
        }
        expect(w.correctedJumpsCount()).toBe(0)
    })
})
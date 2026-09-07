import { describe, expect, it } from 'vitest'
import { myanmar } from '@/core/keyboard-layout/myanmar'
import { buildSequence, graphemeUnitRuns } from '@/core/typing-engine/sequence'

const PHRASES = [
    'ရေ',
    'က',
    'စာ',
    'ကောင်း',
    'ကျောင်း',
    'ကြီး',
    'ကွာ',
    'မြန်မာ',
    'တက္ကသိုလ်ထက်',
    'မင်္ဂလာ',
    'သဂြိုလ်',
    'ကမ္ဘာ',
    'နက္ခတ်',
    'အင်္ဂလန်',
    'သင်္ဘော',
    'မင်္ဂလာပါ',
]

describe('target-text runs never duplicate characters', () => {
    it('runs concatenate back to the phrase with no overlap', () => {
        for (const p of PHRASES) {
            const seq = buildSequence(p, myanmar)
            const runs = graphemeUnitRuns(seq)
            const joined = runs.map((g) => g.text).join('')
            expect(joined, `runs of "${p}"`).toBe(p)
            expect(seq.text, `seq.text of "${p}"`).toBe(p)
        }
    })

    it('no adjacent run carries the same text (would visibly double)', () => {
        for (const p of PHRASES) {
            const runs = graphemeUnitRuns(buildSequence(p, myanmar))
            for (let i = 1; i < runs.length; i++) {
                expect(runs[i]!.text !== runs[i - 1]!.text, `dup run in "${p}" at ${i} (${runs[i - 1]!.text}==${runs[i]!.text})`).toBe(true)
            }
        }
    })

    it('slot texts concatenate to the grapheme text', () => {
        for (const p of PHRASES) {
            for (const g of graphemeUnitRuns(buildSequence(p, myanmar))) {
                expect(g.slots.map((s) => s.text).join(''), `slots of "${g.text}"`).toBe(g.text)
            }
        }
    })

    it('unit press texts are a permutation of the grapheme code points', () => {
        for (const p of PHRASES) {
            const seq = buildSequence(p, myanmar)
            for (let gi = 0; gi < seq.graphemes.length; gi++) {
                const [start, end] = seq.graphemeUnitRanges[gi]!
                const presses = seq.units.slice(start, end).map((u) => u.text)
                const log = Array.from(seq.graphemes[gi]!)
                expect(presses.slice().sort(), `press set of "${seq.graphemes[gi]}"`).toEqual(log.slice().sort())
            }
        }
    })
})

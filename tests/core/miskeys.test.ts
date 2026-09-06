import { describe, expect, it } from 'vitest'

import { summarizeMiskeys, topMiskeys, isShiftSlip } from '@/core/session/miskeys'
import { TypingEngine } from '@/core/typing-engine/engine'
import { buildSequence } from '@/core/typing-engine/sequence'
import { englishQwerty } from '@/core/keyboard-layout/english-qwerty'
import { myanmar } from '@/core/keyboard-layout/myanmar'

function presses(entries: Record<string, Record<string, number>>): Map<string, Map<string, number>> {
    return new Map(Object.entries(entries).map(([k, v]) => [k, new Map(Object.entries(v))]))
}

describe('miskey summaries', () => {
    it('is empty for a clean map', () => {
        const summary = summarizeMiskeys(new Map())
        expect(summary.miskeyCount).toBe(0)
        expect(summary.pairs).toEqual([])
    })

    it('aggregates presses by expected→pressed pair', () => {
        const summary = summarizeMiskeys(presses({ 'KeyC:none': { 'KeyX:none': 2, 'KeyV:none': 1 }, 'KeyT:none': { 'KeyB:none': 3 } }))
        expect(summary.miskeyCount).toBe(6)
        expect(summary.pairs).toEqual([
            { expectedId: 'KeyT:none', pressedId: 'KeyB:none', count: 3 },
            { expectedId: 'KeyC:none', pressedId: 'KeyX:none', count: 2 },
            { expectedId: 'KeyC:none', pressedId: 'KeyV:none', count: 1 },
        ])
    })

    it('breaks count ties deterministically on the pressed key id', () => {
        const summary = summarizeMiskeys(presses({ 'KeyA:none': { 'KeyY:none': 1, 'KeyX:none': 1, 'KeyZ:none': 1 } }))
        expect(summary.pairs.map((p) => p.pressedId)).toEqual(['KeyX:none', 'KeyY:none', 'KeyZ:none'])
    })

    it('topMiskeys honours the limit', () => {
        const summary = summarizeMiskeys(
            presses({ 'KeyA:none': { 'KeyS:none': 4 }, 'KeyD:none': { 'KeyF:none': 3 }, 'KeyG:none': { 'KeyH:none': 2 } }),
        )
        const top = topMiskeys(summary, 2)
        expect(top).toHaveLength(2)
        expect(top[0].pressedId).toBe('KeyS:none')
    })

    it('spots shift slips: same physical key, wrong modifier', () => {
        expect(isShiftSlip({ expectedId: 'KeyC:shift', pressedId: 'KeyC:none', count: 1 })).toBe(true)
        expect(isShiftSlip({ expectedId: 'KeyC:none', pressedId: 'KeyX:none', count: 1 })).toBe(false)
    })
})

describe('typing engine wrong-press tracking', () => {
    it('records which key was pressed instead of each expected key', () => {
        const engine = new TypingEngine({ sequence: buildSequence('cat', englishQwerty), layout: englishQwerty })
        engine.processKey('KeyX', 'none') // wrong for c
        engine.processKey('KeyX', 'none') // wrong again
        engine.processKey('KeyC', 'none') // correct
        engine.processKey('KeyA', 'none') // correct
        engine.processKey('KeyB', 'none') // wrong for t

        expect(engine.wrongPresses.get('KeyC:none')?.get('KeyX:none')).toBe(2)
        expect(engine.wrongPresses.get('KeyT:none')?.get('KeyB:none')).toBe(1)
    })

    it('records a shift slip as its own modifier pair', () => {
        const engine = new TypingEngine({ sequence: buildSequence('Cat', englishQwerty), layout: englishQwerty })
        engine.processKey('KeyC', 'none') // lowercase where Shift+C was expected
        engine.processKey('Backspace', 'none')
        engine.processKey('KeyC', 'shift') // correct

        expect(engine.wrongPresses.get('KeyC:shift')?.get('KeyC:none')).toBe(1)
    })

    it('works for the Myanmar layout', () => {
        const engine = new TypingEngine({ sequence: buildSequence('ရေ', myanmar), layout: myanmar })
        // The first expected unit is ရ on KeyA; pressing Digit7:shift for it is a miss.
        engine.processKey('Digit7', 'shift') // wrong for ရ
        engine.processKey('KeyA', 'none') // correct ရ
        engine.processKey('Digit7', 'shift') // correct ေ

        expect(engine.status).toBe('finished')
        expect(engine.incorrectCount).toBe(1)
        expect(engine.wrongPresses.get('KeyA:none')?.get('Digit7:shift')).toBe(1)
    })
})
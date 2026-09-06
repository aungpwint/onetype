import { describe, expect, it } from 'vitest'

import { myanmar } from '@/core/keyboard-layout/myanmar'
import { TypingEngine } from '@/core/typing-engine/engine'
import { buildSequence, graphemeUnitRuns, logicalSlotsForCluster } from '@/core/typing-engine/sequence'

interface EmissiveKey {
    code: string
    modifier: 'none' | 'shift'
    text: string
    label: string
}

/** Every physical key the layout can emit, plain and shifted (digits, symbols,
 *  punctuation, Space, Backquote, brackets, …, not just letters). */
function emissiveKeys(): EmissiveKey[] {
    const out: EmissiveKey[] = []
    for (const row of myanmar.rows) {
        for (const key of row) {
            if (key.kind === 'modifier') continue
            if (key.plain !== undefined) out.push({ code: key.code, modifier: 'none', text: key.plain, label: key.label })
            if (key.shifted !== undefined) out.push({ code: key.code, modifier: 'shift', text: key.shifted, label: key.label })
        }
    }
    return out
}

/** Press every unit of a phrase correctly and assert the whole run finishes. */
function typeThrough(phrase: string) {
    const seq = buildSequence(phrase, myanmar)
    expect(seq.text, `phrase "${phrase}"`).toBe(phrase)
    const engine = new TypingEngine({ sequence: seq, layout: myanmar })
    for (const unit of seq.units) {
        const ev = engine.processKey(unit.keyCode, unit.modifier)
        const last = unit.index === seq.units.length - 1
        // The terminal keypress also emits the 'finish' event.
        expect(last ? ['finish', 'correct'] : ['correct'], `unit ${unit.index} (${unit.text}) of "${phrase}"`).toContain(ev?.type)
        if (!last) {
            expect(engine.expectedUnit?.index, `caret after unit ${unit.index}`).toBe(unit.index + 1)
        }
    }
    expect(engine.unitIndex).toBe(seq.units.length)
    expect(engine.isComplete).toBe(true)
    return { seq, engine }
}

describe('every Myanmar key is buildable, typeable and slot-exact', () => {
    it('every text key alone round-trips through sequence → engine', () => {
        for (const k of emissiveKeys()) {
            if (k.text === ' ') continue // space alone is empty-ish; covered below
            const phrase = `က${k.text}ဌ`
            const { seq } = typeThrough(phrase)
            const runs = graphemeUnitRuns(seq)
            for (const g of runs) {
                // Unit texts concatenate to the grapheme text (a unit may be
                // multi-codepoint, e.g. ၎င်း), hence compare at codepoint level.
                const presses = seq.units.slice(g.startUnit, g.endUnit).flatMap((u) => Array.from(u.text)).sort()
                const logical = Array.from(g.text).sort()
                expect(presses, `press of "${g.text}" (${k.code} ${k.modifier})`).toEqual(logical)
                expect(
                    g.slots.map((s) => s.text).join(''),
                    `slots of "${g.text}" (${k.code} ${k.modifier})`,
                ).toBe(g.text)
            }
        }
    })

    it('the full keyboard (all keys, one word each) types green end-to-end', () => {
        const keys = emissiveKeys()
        const phrase = ['က', ...keys.map((k) => k.text), 'ဌ'].join(' ')
        const { seq, engine } = typeThrough(phrase)

        // Every unit answered correct → every outcome green.
        for (const unit of seq.units) {
            expect(engine.unitOutcomeAt(unit.index), `unit ${unit.index}`).toBe('correct')
        }

        // Each unit maps to the exact physical key that emits it.
        const keyForText = new Map<string, EmissiveKey[]>()
        for (const k of keys) {
            const list = keyForText.get(k.text) ?? []
            list.push(k)
            keyForText.set(k.text, list)
        }
        for (let u = 0; u < seq.units.length; u++) {
            const unit = seq.units[u]!
            const physical = keyForText.get(unit.text)
            if (physical === undefined) continue
            expect(physical.some((p) => p.code === unit.keyCode && p.modifier === unit.modifier), `unit ${u} ${unit.text}`).toBe(true)
        }
    })

    it('the multi-codepoint key ၎င်း (Shift+R) is a single green unit', () => {
        const { seq, engine } = typeThrough('၎င်း')
        expect(seq.graphemes).toHaveLength(1)
        expect(seq.units).toHaveLength(1)
        expect(seq.units[0]!.keyCode).toBe('KeyR')
        expect(seq.units[0]!.modifier).toBe('shift')
        const [g] = graphemeUnitRuns(seq)
        // All four code points belong to the single press unit → unitLocal 0.
        expect(g!.slots.map((s) => s.unitLocal)).toEqual([0, 0, 0, 0])
        expect(g!.slots.map((s) => s.text).join('')).toBe('၎င်း')
        expect(engine.unitOutcomeAt(0)).toBe('correct')
    })

    it('a bare pre-base vowel (KeyA = ေ) never breaks a phrase', () => {
        const { seq } = typeThrough('ေ')
        expect(runsJoin(seq)).toBe('ေ')
    })

    it('space, digits and ASCII symbols keep identity slots', () => {
        for (const text of [' ', '၁', '*', '(', ')', '"', '?', ',', '.', '/', '-', '_', '+', '=', "'"]) {
            const { seq } = typeThrough(`က ${text} က`)
            const runs = graphemeUnitRuns(seq)
            for (const g of runs) {
                expect(logicalSlotsForCluster(g.text, seq.units.slice(g.startUnit, g.endUnit).map((u) => u.text)).map((s) => s.unitLocal))
                    .toEqual(Array.from(g.text).map((_, i) => i))
            }
        }
    })
})

function runsJoin(seq: ReturnType<typeof buildSequence>): string {
    return graphemeUnitRuns(seq).map((g) => g.text).join('')
}
import { describe, expect, it } from 'vitest'

import { summarizeKeyTaps } from '@/core/session/key-outcomes'
import { troubleKeyIds, troubleDrillHref } from '@/core/session/trouble-drill'
import { englishQwerty } from '@/core/keyboard-layout/english-qwerty'
import { myanmar } from '@/core/keyboard-layout/myanmar'

describe('trouble key selection', () => {
    it('returns no keys for a clean round', () => {
        const summary = summarizeKeyTaps(new Map())
        expect(troubleKeyIds(summary, englishQwerty)).toEqual([])
    })

    it('ranks worst keys first (most incorrect presses)', () => {
        const summary = summarizeKeyTaps(
            new Map([
                ['KeyA:none', { correct: 9, incorrect: 1 }],
                ['KeyB:none', { correct: 1, incorrect: 4 }],
                ['KeyC:none', { correct: 2, incorrect: 3 }],
            ]),
        )
        expect(troubleKeyIds(summary, englishQwerty)).toEqual(['KeyB:none', 'KeyC:none', 'KeyA:none'])
    })

    it('respects the drill key cap', () => {
        const map = new Map<string, { correct: number; incorrect: number }>(
            ['KeyA', 'KeyB', 'KeyC', 'KeyD'].map((code) => [code + ':none', { correct: 1, incorrect: 2 }]),
        )
        const summary = summarizeKeyTaps(map)
        expect(troubleKeyIds(summary, englishQwerty, 2)).toHaveLength(2)
    })

    it('skips keys the layout cannot produce', () => {
        const map = new Map<string, { correct: number; incorrect: number }>([
            ['KeyB:none', { correct: 0, incorrect: 3 }],
            ['KeyA:none', { correct: 0, incorrect: 3 }],
            ['Backspace', { correct: 0, incorrect: 5 }],
        ])
        const summary = summarizeKeyTaps(map)
        const ids = troubleKeyIds(summary, englishQwerty)
        expect(ids).not.toContain('Backspace')
        expect(ids.length).toBe(2)
        expect(ids.every((id) => /^Key.:none$/.test(id))).toBe(true)
    })

    it('maps a single errored key id straight through', () => {
        const summary = summarizeKeyTaps(new Map([['KeyA:none', { correct: 1, incorrect: 2 }]]))
        expect(troubleKeyIds(summary, englishQwerty)).toEqual(['KeyA:none'])
    })

    it('reads a Myanmar layout with its writable keys', () => {
        const summary = summarizeKeyTaps(new Map([['KeyA:none', { correct: 2, incorrect: 5 }]]))
        expect(troubleKeyIds(summary, myanmar)).toContain('KeyA:none')
    })
})

describe('trouble drill href', () => {
    it('builds a drill route with layout and keys', () => {
        expect(troubleDrillHref('myanmar', ['KeyA:none', 'KeyS:shift'])).toBe('/drill?layout=myanmar&keys=KeyA:none,KeyS:shift')
        expect(troubleDrillHref('english-qwerty', ['KeyJ:none'])).toBe('/drill?layout=english-qwerty&keys=KeyJ:none')
    })

    it('falls back to a plain drill page without keys', () => {
        expect(troubleDrillHref('english-qwerty', [])).toBe('/drill')
    })
})

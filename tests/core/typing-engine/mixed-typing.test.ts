import { describe, expect, it } from 'vitest'

import { buildSequence } from '@/core/typing-engine/sequence'
import { TypingEngine } from '@/core/typing-engine/engine'
import { mixedEnglishMyanmar } from '@/core/keyboard-layout/mixed'
import { resolvePressedKey } from '@/core/input/key-resolution'
import { splitMixedClusters } from '@/core/unicode/myanmar'
import { computeScore } from '@/core/scoring/score'
import { buildPracticeMaterial } from '@/core/materials/practice-material'
import { containsMyanmar } from '@/core/unicode/myanmar'

describe('mixed English + Myanmar sequence building', () => {
    it('splits Latin into graphemes and Myanmar into syllables within one target', () => {
        const seq = buildSequence('Hello မင်္ဂလာပါ', mixedEnglishMyanmar)
        expect(seq.graphemes).toEqual(['H', 'e', 'l', 'l', 'o', ' ', 'မင်္ဂ', 'လာ', 'ပါ'])
        expect(seq.units[0]).toMatchObject({ keyCode: 'KeyH', modifier: 'shift', text: 'H' })
        expect(seq.units[1]).toMatchObject({ keyCode: 'KeyE', modifier: 'none', text: 'e' })
        // The Myanmar cluster keeps its press order (pre-base vowel first) and
        // maps to the Pyidaungsu physical keys.
        expect(seq.units.slice(6, 11).map((u) => u.text)).toEqual(['မ', 'င', '်', '္', 'ဂ'])
        expect(seq.graphemeUnitRanges[6]).toEqual([6, 11])
    })

    it('applies pre-base vowel reorder only to Myanmar clusters', () => {
        const seq = buildSequence('ရေ OK', mixedEnglishMyanmar)
        expect(seq.graphemes).toEqual(['ရေ', ' ', 'O', 'K'])
        expect(seq.units.map((u) => u.text)).toEqual(['ေ', 'ရ', ' ', 'O', 'K'])
        expect(seq.units[0]).toMatchObject({ keyCode: 'KeyA', modifier: 'none', text: 'ေ' })
        expect(seq.units[1]).toMatchObject({ keyCode: 'Digit7', modifier: 'shift', text: 'ရ' })
        expect(seq.units[3]).toMatchObject({ keyCode: 'KeyO', modifier: 'shift', text: 'O' })
    })

    it('rejects suspicious invisible characters in mixed text', () => {
        expect(() => buildSequence('Hi \u200Cမင်္ဂလာပါ', mixedEnglishMyanmar)).toThrow(/invisible character/)
    })
})

describe('splitMixedClusters', () => {
    it('keeps Latin grapheme clusters and Myanmar syllables apart', () => {
        expect(splitMixedClusters('Hello မင်္ဂလာပါ')).toEqual(['H', 'e', 'l', 'l', 'o', ' ', 'မင်္ဂ', 'လာ', 'ပါ'])
        expect(splitMixedClusters('Asia \u1000\u1031')).toEqual(['A', 's', 'i', 'a', ' ', '\u1000\u1031'])
    })
})

describe('mixed engine grading by typed character', () => {
    const build = () => {
        const sequence = buildSequence('Hi က', mixedEnglishMyanmar)
        const engine = new TypingEngine({ sequence, layout: mixedEnglishMyanmar })
        return engine
    }

    it('completes a mixed target when the right character is typed on the right modifier', () => {
        const engine = build()
        engine.processKey('KeyH', 'shift', 'H')
        engine.processKey('KeyI', 'none', 'i')
        engine.processKey('Space', 'none', ' ')
        engine.processKey('KeyU', 'none', 'က')
        expect(engine.isComplete).toBe(true)
        expect(engine.correctCount).toBe(4)
        expect(engine.incorrectCount).toBe(0)
    })

    it('rejects the wrong script even on the same physical key (expected က, typed u)', () => {
        // KeyU is both English `u` and Myanmar က on the mixed layout. Without the
        // typed character the engine would accept the wrong script.
        const engine = build()
        engine.processKey('KeyH', 'shift', 'H')
        engine.processKey('KeyI', 'none', 'i')
        engine.processKey('Space', 'none', ' ')
        engine.processKey('KeyU', 'none', 'u')
        expect(engine.incorrectCount).toBe(1)
        expect(engine.expectedUnit?.text).toBe('က')
        engine.processKey('KeyU', 'none', 'က')
        expect(engine.isComplete).toBe(true)
    })

    it('rejects typing a Myanmar char when English is expected', () => {
        const sequence = buildSequence('use ခ', mixedEnglishMyanmar)
        const engine = new TypingEngine({ sequence, layout: mixedEnglishMyanmar })
        engine.processKey('KeyU', 'none', 'u')
        engine.processKey('KeyS', 'none', 's')
        engine.processKey('KeyE', 'none', 'က')
        expect(engine.incorrectCount).toBe(1)
        engine.processKey('KeyE', 'none', 'e')
        engine.processKey('Space', 'none', ' ')
        engine.processKey('Digit6', 'none', 'ခ')
        expect(engine.isComplete).toBe(true)
    })

    it('still flags modifier errors on the correct key', () => {
        const sequence = buildSequence('Hက', mixedEnglishMyanmar)
        const engine = new TypingEngine({ sequence, layout: mixedEnglishMyanmar })
        const event = engine.processKey('KeyH', 'none', 'h')
        expect(event?.errorKind).toBe('modifier')
        expect(engine.shiftErrorCount).toBe(1)
        engine.processKey('KeyH', 'shift', 'H')
        engine.processKey('KeyU', 'none', 'က')
        expect(engine.isComplete).toBe(true)
    })

    it('keeps working when no character is supplied (code-based fallback)', () => {
        const engine = build()
        engine.processKey('KeyH', 'shift')
        engine.processKey('KeyI', 'none')
        engine.processKey('Space', 'none')
        engine.processKey('KeyU', 'none')
        expect(engine.isComplete).toBe(true)
    })

    it('diagnoses slips inside mixed Myanmar clusters', () => {
        const sequence = buildSequence('ရေ X', mixedEnglishMyanmar)
        const engine = new TypingEngine({ sequence, layout: mixedEnglishMyanmar })
        engine.processKey('KeyA', 'none', 'ေ')
        engine.processKey('Digit7', 'shift', 'ရ')
        const diag = engine.clusterDiagnosisFor(0)
        expect(diag).not.toBeNull()
        engine.processKey('Space', 'none', ' ')
        engine.processKey('KeyX', 'shift', 'X')
        expect(engine.isComplete).toBe(true)
    })
})

describe('resolvePressedKey on the mixed layout', () => {
    it('reports the typed character for both an English and a Myanmar press of KeyU', () => {
        expect(resolvePressedKey({ code: 'KeyU', key: 'u', shiftKey: false }, mixedEnglishMyanmar)).toEqual({
            code: 'KeyU',
            modifier: 'none',
            character: 'u',
        })
        expect(resolvePressedKey({ code: 'KeyU', key: 'က', shiftKey: false }, mixedEnglishMyanmar)).toEqual({
            code: 'KeyU',
            modifier: 'none',
            character: 'က',
        })
        expect(resolvePressedKey({ code: 'Digit7', key: 'ရ', shiftKey: true }, mixedEnglishMyanmar)).toEqual({
            code: 'Digit7',
            modifier: 'shift',
            character: 'ရ',
        })
    })
})

describe('mixed metrics', () => {
    it('reports speed in typing units/min like Myanmar', () => {
        const metrics = computeScore({
            correctAttempts: 10,
            incorrectAttempts: 1,
            backspaceCount: 0,
            elapsedSeconds: 60,
            language: 'mixed',
        })
        expect(metrics.speedUnit).toBe('units/min')
        expect(metrics.language).toBe('mixed')
        expect(metrics.speed).toBeCloseTo(10, 5)
    })
})

describe('mixed practice material', () => {
    it('builds custom mixed text on the mixed layout', () => {
        const resolved = buildPracticeMaterial({ language: 'mixed', unit: 'text', text: 'Hello မင်္ဂလာပါ။' })
        expect(resolved.layoutId).toBe('english-myanmar-mixed')
        const text = resolved.phases.map((p) => p.text).join(' ')
        expect(containsMyanmar(text)).toBe(true)
        expect(/[A-Za-z]/.test(text)).toBe(true)
        expect(resolved.sequence.units.length).toBeGreaterThan(0)
    })

    it('draws mixed word practice from both scripts', () => {
        const resolved = buildPracticeMaterial({ language: 'mixed', unit: 'words', words: 30 })
        const text = resolved.phases.map((p) => p.text).join(' ')
        expect(containsMyanmar(text)).toBe(true)
        expect(/[A-Za-z]/.test(text)).toBe(true)
    })
})
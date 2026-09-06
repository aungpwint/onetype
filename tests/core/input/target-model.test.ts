import { describe, expect, it } from 'vitest'

import { resolveLastKey, resolveTarget } from '@/core/target-model'
import { buildSequence } from '@/core/typing-engine/sequence'
import { TypingEngine } from '@/core/typing-engine/engine'
import { englishQwerty } from '@/core/keyboard-layout/english-qwerty'
import { myanmar } from '@/core/keyboard-layout/myanmar'
import { type KeyboardLayout } from '@/core/keyboard-layout/layout'

function manualEngine(text: string, layout: KeyboardLayout): TypingEngine {
    const sequence = buildSequence(text, layout)
    return new TypingEngine({ sequence, layout })
}

describe('resolveTarget — English', () => {
    it('reports the physical key, finger and hand for the home-row target', () => {
        const engine = manualEngine('asdf', englishQwerty)
        const target = resolveTarget(engine, englishQwerty)
        expect(target.keyCode).toBe('KeyA')
        expect(target.finger).toBe('left-pinky')
        expect(target.hand).toBe('left')
        expect(target.requiresShift).toBe(false)
        expect(target.shiftHand).toBe(null)
    })

    it('resolves a shifted key to the opposite shift hand', () => {
        const engine = manualEngine('Hello', englishQwerty)
        const target = resolveTarget(engine, englishQwerty)
        expect(target.keyCode).toBe('KeyH')
        expect(target.requiresShift).toBe(true)
        expect(target.shiftHand).toBe('left')
    })

    it('is idle when the engine has no expected unit', () => {
        expect(resolveTarget(null, englishQwerty)).toEqual({
            keyCode: null,
            modifier: 'none',
            finger: null,
            hand: null,
            requiresShift: false,
            shiftHand: null,
        })
    })
})

describe('resolveTarget — Myanmar', () => {
    it('starts on the pre-base vowel key of ရေ (keyboard press order first)', () => {
        const engine = manualEngine('ရေ', myanmar)
        const target = resolveTarget(engine, myanmar)
        expect(target.keyCode).toBe('KeyA')
        expect(target.requiresShift).toBe(false)
        expect(target.shiftHand).toBe(null)
    })

    it('advances to the base-consonant unit of the same syllable after the vowel', () => {
        const engine = manualEngine('ရေ', myanmar)
        expect(resolveTarget(engine, myanmar).keyCode).toBe('KeyA')
        engine.processKey('KeyA', 'none')
        expect(resolveTarget(engine, myanmar).keyCode).toBe('Digit7')
        const target = resolveTarget(engine, myanmar)
        expect(target.requiresShift).toBe(true)
        expect(target.shiftHand).toBe(target.hand === 'left' ? 'right' : 'left')
    })
})

describe('resolveLastKey', () => {
    it('reads the last graded keypress', () => {
        const engine = manualEngine('What', englishQwerty)
        engine.processKey('KeyW', 'shift')
        expect(resolveLastKey(engine)).toEqual({ keyCode: 'KeyW', correct: true })
    })
})
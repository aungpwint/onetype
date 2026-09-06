import { describe, expect, it } from 'vitest'
import { RetypeEngine, retypeMatch } from '@/core/retyping'
import { getLayoutOrThrow } from '@/core/keyboard-layout/registry'
import { splitMyanmarSyllables } from '@/core/unicode/myanmar'

describe('RetypeEngine (text retyping)', () => {
    const qwerty = getLayoutOrThrow('english-qwerty')
    const myanmar = getLayoutOrThrow('myanmar')

    describe('English retyping', () => {
        it('retypes a simple exercise to completion', () => {
            const engine = new RetypeEngine({ text: 'the quick fox', options: {} }, qwerty, { now: () => 1000 })
            expect(engine.status).toBe('ready')
            expect(engine.currentGrapheme()).toBe('t')

            expect(engine.typeChar('t')).toBe(true)
            expect(engine.currentGrapheme()).toBe('h')
            expect(engine.typeChar('h')).toBe(true)
            expect(engine.typeChar('e')).toBe(true)
            expect(engine.typeChar(' ')).toBe(true)
            for (const ch of 'quick fox') engine.typeChar(ch)

            expect(engine.isComplete).toBe(true)
            expect(engine.finishReason).toBe('completed')
            expect(engine.progress().percentComplete).toBe(100)
            const metrics = engine.metrics()
            expect(metrics.incorrectAttempts).toBe(0)
            expect(metrics.correctAttempts).toBe('the quick fox'.length)
        })

        it('counts mistakes without advancing', () => {
            const engine = new RetypeEngine({ text: 'cat', options: {} }, qwerty, { now: () => 2000 })
            expect(engine.typeChar('x')).toBe(false)
            expect(engine.currentGrapheme()).toBe('c')
            expect(engine.correctCount).toBe(0)
            expect(engine.incorrectCount).toBe(1)
            expect(engine.progress().incorrectGraphemes).toBe(0)
            expect(engine.progress().correctGraphemes).toBe(0)

            expect(engine.typeChar('c')).toBe(true)
            expect(engine.typeChar('a')).toBe(true)
            expect(engine.typeChar('t')).toBe(true)
            expect(engine.isComplete).toBe(true)
            expect(engine.progress().correctGraphemes).toBe(3)
        })

        it('backspace repairs a mistake and continues', () => {
            const engine = new RetypeEngine({ text: 'ab', options: { allowBackspace: true } }, qwerty, { now: () => 3000 })
            engine.typeChar('a')
            engine.processKey('Backspace', 'none')
            expect(engine.status).toBe('running')
            expect(engine.currentGrapheme()).toBe('a')
            engine.typeChar('a')
            engine.typeChar('b')
            expect(engine.isComplete).toBe(true)
            expect(engine.backspaceCount).toBe(1)
        })

        it('ignores backspace when disabled', () => {
            const engine = new RetypeEngine({ text: 'ab', options: { allowBackspace: false } }, qwerty, { now: () => 4000 })
            engine.typeChar('a')
            expect(engine.processKey('Backspace', 'none')).toBe(false)
            expect(engine.currentGrapheme()).toBe('b')
            expect(engine.backspaceCount).toBe(0)
        })

        it('whitespace is significant', () => {
            const engine = new RetypeEngine({ text: 'a b', options: {} }, qwerty, { now: () => 5000 })
            expect(engine.typeChar('a')).toBe(true)
            expect(engine.typeChar('?')).toBe(false) // not the space
            expect(engine.typeChar(' ')).toBe(true)
            expect(engine.typeChar('b')).toBe(true)
            expect(engine.isComplete).toBe(true)
        })
    })

    describe('Unicode-safe comparison (Myanmar clusters)', () => {
        it('segments Myanmar text into syllables rather than raw code points', () => {
            const sample = 'ကက္က' // က + က္ + က (4 code points, 2 syllable clusters)
            expect(splitMyanmarSyllables(sample)).toHaveLength(2)
            expect(Array.from(sample)).toHaveLength(4)
            expect(splitMyanmarSyllables(sample).join('')).toBe(sample)
        })

        it('matches a full stacked syllable as one cluster', () => {
            const engine = new RetypeEngine({ text: 'ကက္က', options: {} }, myanmar, { now: () => 6000 })
            const first = engine.currentGrapheme()
            expect(first).toBe('က')
            expect(engine.typeChar('က')).toBe(true)
            expect(engine.currentGrapheme()).toBe('က္က')
            expect(engine.typeChar('က္က')).toBe(true)
            expect(engine.isComplete).toBe(true)
            expect(engine.progress().totalGraphemes).toBe(2)
        })

        it('does not advance the cluster on a partial match', () => {
            const engine = new RetypeEngine({ text: 'က္က', options: {} }, myanmar, { now: () => 7000 })
            expect(engine.typeChar('က')).toBe(false)
            expect(engine.currentGrapheme()).toBe('က္က')
            expect(engine.unitIndex).toBe(0)
        })

        it('compares canonically (NFC) so pre-composed vs decomposed equivalents match', () => {
            // U+0049 + combining acute (U+0301) decomposes; NFC folds to pre-composed form.
            const decomposed = 'I\u0301'
            const precomposed = '\u00CD' // Í
            expect(precomposed.normalize('NFC')).toBe(precomposed)
            expect(retypeMatch(decomposed, precomposed)).toBe(true)
            expect(retypeMatch(precomposed, decomposed)).toBe(true)
            expect(retypeMatch(decomposed, precomposed, 'code-point')).toBe(false)
        })

        it('reports per-cluster correctness for a mixed-correctness lesson', () => {
            const engine = new RetypeEngine({ text: 'f j', options: {} }, qwerty, { now: () => 9000 })
            engine.typeChar('g') // mistake on 'f'
            engine.typeChar('f') // ok
            const results = engine.graphemeResults()
            expect(results[0].text).toBe('f')
            expect(results[0].state).toBe('correct')
            expect(results[1].state).toBe('unreached')
            expect(engine.progress().correctGraphemes).toBe(1)
        })
    })

    describe('exercise options and metrics', () => {
        it('drives accuracy and wpm from the underlying engine', () => {
            const engine = new RetypeEngine({ text: 'aaaa', options: {} }, qwerty, {
                now: (() => {
                    let t = 0
                    return () => (t += 1000)
                })(),
            })
            engine.typeChar('a')
            engine.typeChar('b')
            engine.typeChar('a')
            engine.typeChar('a')
            const metrics = engine.metrics()
            expect(metrics.correctAttempts).toBe(3)
            expect(metrics.incorrectAttempts).toBe(1)
            expect(metrics.accuracy).toBeGreaterThanOrEqual(75)
            expect(metrics.grossWpm).toBeGreaterThan(0)
        })
    })
})

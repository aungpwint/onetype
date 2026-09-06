import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { useTypingStore } from '@/stores/typing-store'
import { TypingEngine } from '@/core/typing-engine/engine'
import { buildSequence } from '@/core/typing-engine/sequence'
import { englishQwerty } from '@/core/keyboard-layout/english-qwerty'
import { myanmar } from '@/core/keyboard-layout/myanmar'
import { extractMissedWords } from '@/core/materials/missed-words'

// The store's clear() unbinds window/document key listeners. Provide the
// minimal DOM surface the store touches so the node-only test env is happy.
class FakeWindow {
    private handlers = new Map<string, Array<() => void>>()
    addEventListener(type: string, handler: () => void) {
        const arr = this.handlers.get(type) ?? []
        arr.push(handler)
        this.handlers.set(type, arr)
    }
    removeEventListener(type: string, handler: () => void) {
        const arr = (this.handlers.get(type) ?? []).filter((h) => h !== handler)
        this.handlers.set(type, arr)
    }
}
;(globalThis as Record<string, unknown>).window = new FakeWindow()
;(globalThis as Record<string, unknown>).document = { visibilityState: 'visible', addEventListener() {}, removeEventListener() {} }

/** Type the units covering the given text prefix, then stop. */
function typePrefix(engine: TypingEngine, prefix: string): void {
    let typed = ''
    for (const unit of engine.sequence.units) {
        if (typed.length >= prefix.length || engine.status === 'finished') return
        engine.processKey(unit.keyCode, unit.modifier)
        typed += unit.text
    }
}

/** Seed the store with a finished session that still has a wrong word. */
function seedFinishedSession() {
    const seq = buildSequence('cat dog fox', englishQwerty)
    const engine = new TypingEngine({ sequence: seq, layout: englishQwerty })
    // cat
    engine.processKey('KeyC', 'none')
    engine.processKey('KeyA', 'none')
    engine.processKey('KeyT', 'none')
    engine.processKey('Space', 'none')
    // dog — hit the wrong key for "d" and never correct it
    engine.processKey('KeyX', 'none')
    engine.processKey('KeyO', 'none')
    engine.processKey('KeyG', 'none')
    engine.processKey('Space', 'none')
    // fox
    engine.processKey('KeyF', 'none')
    engine.processKey('KeyO', 'none')
    engine.processKey('KeyX', 'none')
    useTypingStore.setState({
        session: {
            kind: 'practice',
            practice: { language: 'english', unit: 'words', words: 3 },
            resolved: { sequence: seq, phases: [] } as never,
            layout: englishQwerty,
            mode: 'quick',
            durationSeconds: null,
            attempt: 1,
            startedAt: 0,
        } as never,
        engine,
        status: 'finished',
        result: {} as never,
    })
}

describe('extractMissedWords', () => {
    it('returns only words that are still wrong at the end of the round', () => {
        const seq = buildSequence('cat dog fox', englishQwerty)
        const engine = new TypingEngine({ sequence: seq, layout: englishQwerty })
        engine.processKey('KeyC', 'none') // c
        engine.processKey('KeyA', 'none') // a
        engine.processKey('KeyT', 'none') // t
        engine.processKey('Space', 'none')
        engine.processKey('KeyX', 'none') // wrong for the "d" of dog
        engine.processKey('KeyO', 'none')
        engine.processKey('KeyG', 'none')
        engine.processKey('Space', 'none')
        engine.processKey('KeyF', 'none')
        engine.processKey('KeyO', 'none')
        engine.processKey('KeyX', 'none')
        const missed = extractMissedWords(engine)
        expect(missed.words).toEqual(['dog'])
        expect(missed.text).toBe('dog')
        expect(missed.count).toBe(1)
    })

    it('treats a wrong-then-backspaced-then-corrected word as clean', () => {
        const seq = buildSequence('cat dog fox', englishQwerty)
        const engine = new TypingEngine({ sequence: seq, layout: englishQwerty })
        typePrefix(engine, 'cat ')
        engine.processKey('KeyX', 'none') // wrong "d"
        // Backspace erases the wrong attempt on the CURRENT unit (unit-granular):
        // the caret stays on "d", clearing the stray incorrect outcome.
        expect(engine.unitIndex).toBe(4)
        engine.processKey('Backspace', 'none')
        expect(engine.unitIndex).toBe(4)
        expect(engine.unitOutcomeAt(4)).toBeNull()
        engine.processKey('KeyD', 'none') // correct "d" — no wrong mark remains
        engine.processKey('KeyO', 'none')
        engine.processKey('KeyG', 'none')
        engine.processKey('Space', 'none')
        engine.processKey('KeyF', 'none')
        engine.processKey('KeyO', 'none')
        engine.processKey('KeyX', 'none')
        const missed = extractMissedWords(engine)
        expect(missed.count).toBe(0)
        expect(missed.text).toBe('')
    })

    it('ignores unattempted trailing words', () => {
        const seq = buildSequence('cat dog fox', englishQwerty)
        const engine = new TypingEngine({ sequence: seq, layout: englishQwerty })
        typePrefix(engine, 'cat')
        // never touched "dog fox"
        expect(engine.status).toBe('running')
        const missed = extractMissedWords(engine)
        expect(missed.count).toBe(0)
    })

    it('deduplicates repeated missed words', () => {
        const seq = buildSequence('dog cat dog', englishQwerty)
        const engine = new TypingEngine({ sequence: seq, layout: englishQwerty })
        engine.processKey('KeyX', 'none')
        engine.processKey('KeyO', 'none')
        engine.processKey('KeyG', 'none')
        engine.processKey('Space', 'none')
        engine.processKey('KeyC', 'none')
        engine.processKey('KeyA', 'none')
        engine.processKey('KeyT', 'none')
        engine.processKey('Space', 'none')
        engine.processKey('KeyX', 'none')
        engine.processKey('KeyO', 'none')
        engine.processKey('KeyG', 'none')
        const missed = extractMissedWords(engine)
        expect(missed.words).toEqual(['dog'])
        expect(missed.count).toBe(1)
    })

    it('extracts Myanmar words whose cluster contains an undone error', () => {
        // ကောင် စာ → miss "ကောင်" by pressing the first key wrong and then
        // moving straight on, so the first unit is still wrong when time runs out.
        const text = '\u1000\u102F\u1004\u103A\u1038 \u1005\u102C'
        const seq = buildSequence(text, myanmar)
        const engine = new TypingEngine({ sequence: seq, layout: myanmar })
        const first = seq.units[0]
        engine.processKey(first.keyCode === 'KeyA' ? 'KeyB' : 'KeyA', first.modifier) // wrong first press
        for (let i = 1; i < seq.units.length; i += 1) {
            engine.processKey(seq.units[i].keyCode, seq.units[i].modifier)
        }
        const missed = extractMissedWords(engine)
        expect(missed.words).toEqual(['\u1000\u102F\u1004\u103A\u1038'])
        expect(missed.count).toBe(1)
    })
})

describe('practiceMissedWords store action', () => {
    beforeEach(() => {
        seedFinishedSession()
    })

    afterEach(() => {
        useTypingStore.getState().clear()
    })

    it('starts an untracked text practice on the missed words only', async () => {
        await useTypingStore.getState().practiceMissedWords()
        const st = useTypingStore.getState()
        expect(st.status).toBe('ready')
        expect(st.session?.kind).toBe('practice')
        expect(st.session?.practice?.unit).toBe('text')
        expect(st.session?.practice?.text).toBe('dog')
        expect(st.engine?.sequence.text).toBe('dog')
    })

    it('is a no-op when the round finished mistake-free', async () => {
        const seq = buildSequence('cat', englishQwerty)
        const engine = new TypingEngine({ sequence: seq, layout: englishQwerty })
        typePrefix(engine, 'cat')
        useTypingStore.setState({
            session: {
                kind: 'practice',
                practice: { language: 'english', unit: 'words', words: 3 },
                resolved: { sequence: seq, phases: [] } as never,
                layout: englishQwerty,
                mode: 'quick',
                durationSeconds: null,
                attempt: 1,
                startedAt: 0,
            } as never,
            engine,
            status: 'finished',
            result: {} as never,
        })
        await useTypingStore.getState().practiceMissedWords()
        const st = useTypingStore.getState()
        expect(st.status).toBe('finished')
        expect(st.session?.practice?.unit).toBe('words')
    })

    it('is a no-op unless the round is finished', async () => {
        useTypingStore.setState({ status: 'running' })
        await useTypingStore.getState().practiceMissedWords()
        const st = useTypingStore.getState()
        expect(st.status).toBe('running')
        expect(st.session?.practice?.unit).toBe('words')
    })
})
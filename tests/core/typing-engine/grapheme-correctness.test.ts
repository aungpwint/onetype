import { describe, expect, it } from 'vitest'

import { buildSequence, graphemeUnitRuns, type BuiltSequence, type GraphemeRun } from '@/core/typing-engine/sequence'
import { TypingEngine } from '@/core/typing-engine/engine'
import { myanmar } from '@/core/keyboard-layout/myanmar'
import { englishQwerty } from '@/core/keyboard-layout/english-qwerty'
import type { KeyboardLayout } from '@/core/keyboard-layout/layout'
import {
    cursorProgressInCluster,
    graphemePresentation,
    isCurrentGrapheme,
    type GraphemePresentation,
    type UnitPresentation,
} from '@/core/typing-engine/char-state'

/**
 * The renderer's canonical per-grapheme presentation (see TargetText `Char`).
 * A grapheme is committed (green/red) only once every typing unit is consumed;
 * while composing, its per-unit slots carry the live state in LOGICAL display
 * order so exactly the typed units are colored — never the whole grapheme.
 */
function present(engine: TypingEngine, run: GraphemeRun): GraphemePresentation {
    return graphemePresentation(engine.unitIndex, run.startUnit, run.slots, engine)
}

function renderClass(v: GraphemePresentation): string {
    if (v.correctness === 'incorrect') return 'incorrect'
    if (v.correctness === 'correct') return 'correct'
    return v.isCurrent ? 'current' : 'pending'
}

/** Per-slot visual status mirroring the Char component's class decision. */
function slotStatus(s: UnitPresentation): string {
    if (s.isCurrent) return s.outcome === 'incorrect' ? 'miss-now' : 'now'
    if (s.completed) return s.outcome === 'incorrect' ? 'miss' : 'ok'
    return 'pending'
}

function slotStates(engine: TypingEngine, run: GraphemeRun): string[] {
    const v = present(engine, run)
    return (v.slots ?? []).map(slotStatus)
}

/** A running engine with the target text's layout, advanced by exact keystrokes. */
function makeEngine(text: string, layout: KeyboardLayout): { engine: TypingEngine; seq: BuiltSequence } {
    const seq = buildSequence(text, layout)
    const engine = new TypingEngine({ sequence: seq, layout })
    return { engine, seq }
}

/** Press the sequence of expected units until the given number are consumed. */
function typeUnits(engine: TypingEngine, seq: BuiltSequence, count: number) {
    while (engine.unitIndex < count && engine.unitIndex < seq.units.length) {
        const u = seq.units[engine.unitIndex]!
        engine.processKey(u.keyCode, u.modifier)
    }
}

describe('Myanmar per-unit coloring: never fully green after one unit', () => {
    it('ရေ: typing only the pre-base vowel ေ (first unit) colors exactly that unit, not the grapheme', () => {
        const { engine, seq } = makeEngine('ရေ', myanmar)
        const run = graphemeUnitRuns(seq)[0]!
        // Press order for ရေ is [ေ, ရ] (pre-base vowel first, then base).
        expect(seq.units[0]!.text).toBe('ေ')
        typeUnits(engine, seq, 1)
        expect(engine.unitIndex).toBe(1)
        // Logical display order [ရ,ေ]: only the typed `ေ` is green; the whole
        // grapheme is still composing (never the committed green verdict).
        expect(slotStates(engine, run)).toEqual(['now', 'ok'])
        expect(present(engine, run).correctness).toBe('pending')
        // Complete it → the WHOLE grapheme turns green as one shaped span.
        typeUnits(engine, seq, 2)
        expect(present(engine, run).correctness).toBe('correct')
        expect(present(engine, run).slots).toBeNull()
    })

    it('မြန်မာ: slot colors follow typing progress unit by unit, green only at completion', () => {
        const { engine, seq } = makeEngine('မြန်မာ', myanmar)
        const run = graphemeUnitRuns(seq)[0]!
        expect(run.slots).toHaveLength(6)

        // Fresh: nothing colored yet, first slot current.
        expect(slotStates(engine, run)).toEqual(['now', 'pending', 'pending', 'pending', 'pending', 'pending'])
        typeUnits(engine, seq, 1)
        expect(slotStates(engine, run)).toEqual(['ok', 'now', 'pending', 'pending', 'pending', 'pending'])
        typeUnits(engine, seq, 3)
        expect(slotStates(engine, run)).toEqual(['ok', 'ok', 'ok', 'now', 'pending', 'pending'])

        // The final unit delivers the complete grapheme → one green span.
        typeUnits(engine, seq, 6)
        expect(present(engine, run).correctness).toBe('correct')
        expect(present(engine, run).slots).toBeNull()
    })

    it('wrong Myanmar input flags exactly the current unit incorrect and never the whole grapheme green', () => {
        const { engine, seq } = makeEngine('ရေ', myanmar)
        const run = graphemeUnitRuns(seq)[0]!
        // Wrong key (KeyQ) when ေ (KeyA) is expected: the unit is recorded
        // incorrect, the caret does not advance, and only that unit is red.
        engine.processKey('KeyQ', 'none')
        expect(engine.unitIndex).toBe(0)
        expect(engine.unitOutcomeAt(0)).toBe('incorrect')
        expect(engine.incorrectCount).toBe(1)
        expect(slotStates(engine, run)).toEqual(['pending', 'miss-now'])
        expect(present(engine, run).correctness).toBe('pending')

        // Once the wrong unit is typed correctly, the resurrected grapheme
        // completes to green (the incorrect verdict was transient).
        typeUnits(engine, seq, 2)
        expect(present(engine, run).correctness).toBe('correct')
    })

    it('backspace during an incomplete grapheme rewinds exactly one unit with no stale state', () => {
        const { engine, seq } = makeEngine('မြန်မာ', myanmar)
        const run = graphemeUnitRuns(seq)[0]!
        // Type halfway into the six-unit grapheme (3 units).
        typeUnits(engine, seq, 3)
        expect(engine.unitIndex).toBe(3)
        expect(slotStates(engine, run)).toEqual(['ok', 'ok', 'ok', 'now', 'pending', 'pending'])

        // Backspace is unit-granular: removes the third unit, which flips the
        // `န` slot back to current/pending immediately — everything after stays
        // pending, the two consumed units keep green.
        engine.processKey('Backspace', 'none')
        expect(engine.unitIndex).toBe(2)
        expect(engine.unitOutcomeAt(2)).toBeNull()
        expect(slotStates(engine, run)).toEqual(['ok', 'ok', 'now', 'pending', 'pending', 'pending'])
        expect(present(engine, run).correctness).not.toBe('correct')
        expect(present(engine, run).correctness).not.toBe('incorrect')

        // A second Backspace unwinds the next unit too.
        engine.processKey('Backspace', 'none')
        expect(engine.unitIndex).toBe(1)
        expect(slotStates(engine, run)).toEqual(['ok', 'now', 'pending', 'pending', 'pending', 'pending'])

        // Re-type to completion → correct.
        typeUnits(engine, seq, 6)
        expect(present(engine, run).correctness).toBe('correct')
    })
})

describe('Myanmar grapheme corpus — composing while partial, green only when complete', () => {
    const corpus: Array<{ text: string; label: string }> = [
        { text: 'ရေ', label: 'ရေ — pre-base vowel reorder (2 units)' },
        { text: 'က', label: 'က — single base consonant (1 unit)' },
        { text: 'စာ', label: 'စာ — base + vowel sign (2 units)' },
        { text: 'ကောင်း', label: 'ကောင်း — base + asat + vowel' },
        { text: 'ကျောင်း', label: 'ကျောင်း — base + stacked medial + asat + vowel' },
        { text: 'ကြီး', label: 'ကြီး — base + medial ya + vowel' },
        { text: 'ကွာ', label: 'ကွာ — base + medial wa + vowel' },
        { text: 'မြန်မာ', label: 'မြန်မာ — six-unit composite word' },
        { text: 'တက္ကသိုလ်', label: 'တက္ကသိုလ် — university (stacked clusters)' },
    ]

    it.each(corpus)('$label', ({ text }) => {
        const { engine, seq } = makeEngine(text, myanmar)
        const runs = graphemeUnitRuns(seq)
        expect(runs.length).toBeGreaterThan(0)

        for (const run of runs) {
            // Consume every unit but the final one, asserting that ONLY the
            // consumed units are colored and the grapheme verdict stays pending.
            for (let u = run.startUnit; u < run.endUnit - 1; u++) {
                typeUnits(engine, seq, u + 1)
                const v = present(engine, run)
                expect(v.isCurrent, `${run.text} @${u + 1}/${run.endUnit}`).toBe(true)
                expect(v.correctness, `${run.text} @${u + 1}/${run.endUnit}`).toBe('pending')

                const states = slotStates(engine, run)
                const consumed = states.filter((s) => s === 'ok').length
                const active = states.filter((s) => s === 'now').length
                expect(consumed, `${run.text} consumed @${u + 1}`).toBe(u + 1 - run.startUnit)
                expect(active, `${run.text} active @${u + 1}`).toBe(1)
                expect(states.filter((s) => s === 'miss' || s === 'miss-now'), `${run.text} miss`).toHaveLength(0)
                expect(v.progress, `${run.text} @${u + 1}/${run.endUnit}`).toBeCloseTo((u + 1 - run.startUnit) / (run.endUnit - run.startUnit))
            }
            // The final unit delivers the complete grapheme → one green span.
            typeUnits(engine, seq, run.endUnit)
            expect(present(engine, run).correctness, run.text).toBe('correct')
            expect(present(engine, run).slots, run.text).toBeNull()
        }

        expect(engine.status).toBe('finished')
    })
})

describe('English keeps existing character-by-character behavior', () => {
    it('hello turns each letter green a keypress later (unchanged)', () => {
        const { engine, seq } = makeEngine('hello', englishQwerty)
        const runs = graphemeUnitRuns(seq)
        expect(runs.map((r) => r.text)).toEqual(['h', 'e', 'l', 'l', 'o'])

        for (const run of runs) {
            // While the caret sits ON this character, it is current/pending —
            // not yet green. (For English this is a 1-unit span.)
            expect(present(engine, run).isCurrent).toBe(true)
            expect(slotStates(engine, run)).toEqual(['now'])
            // One keypress consumes it → green.
            typeUnits(engine, seq, run.endUnit)
            expect(present(engine, run).correctness).toBe('correct')
        }

        expect(engine.status).toBe('finished')
    })
})

// ---------------------------------------------------------------------------
// Cursor moves in real time during composition
// ---------------------------------------------------------------------------

describe('Cursor moves in real time during Myanmar composition', () => {
    it('ရေ: cursor progress updates after each input, green only at completion', () => {
        const { engine, seq } = makeEngine('ရေ', myanmar)
        const run = graphemeUnitRuns(seq)[0]!
        expect(run.endUnit - run.startUnit).toBe(2)

        expect(present(engine, run).progress).toBe(0)
        expect(present(engine, run).isCurrent).toBe(true)
        expect(renderClass(present(engine, run))).toBe('current')

        // After typing ေ (unit 0 → 1): cursor moves (progress 0.5), still composing.
        typeUnits(engine, seq, 1)
        expect(engine.unitIndex).toBe(1)
        expect(present(engine, run).progress).toBe(0.5)
        expect(slotStates(engine, run)).toEqual(['now', 'ok'])

        // After typing ရ (unit 1 → 2): grapheme complete → green.
        typeUnits(engine, seq, 2)
        expect(present(engine, run).correctness).toBe('correct')
    })

    it('မြန်မာ: cursor advances through all six intermediate positions', () => {
        const { engine, seq } = makeEngine('မြန်မာ', myanmar)
        const run = graphemeUnitRuns(seq)[0]!
        expect(run.endUnit - run.startUnit).toBe(6)

        for (let i = 0; i < run.endUnit - 1; i++) {
            typeUnits(engine, seq, i + 1)
            const v = present(engine, run)
            expect(v.progress, `after ${i + 1}/${run.endUnit}`).toBeCloseTo((i + 1) / run.endUnit)
            expect(v.isCurrent).toBe(true)
            expect(v.correctness).toBe('pending')
            // Exactly i+1 consumed slots are green and exactly one is the
            // current (active) target.
            expect(slotStates(engine, run).filter((s) => s === 'ok').length, `slots green ${i + 1}`).toBe(i + 1)
            expect(slotStates(engine, run).filter((s) => s === 'now').length, `slots active ${i + 1}`).toBe(1)
        }

        // Final unit → green.
        typeUnits(engine, seq, run.endUnit)
        expect(present(engine, run).correctness).toBe('correct')
    })

    it('combined Myanmar sequence: cursor tracks each grapheme in real time', () => {
        const text = 'ရေ က မ စာ'
        const { engine, seq } = makeEngine(text, myanmar)
        const runs = graphemeUnitRuns(seq)

        for (const run of runs) {
            const [s, e] = [run.startUnit, run.endUnit]
            const span = e - s

            while (engine.unitIndex < e) {
                const v = present(engine, run)
                expect(v.isCurrent, `${run.text} @unit ${engine.unitIndex} should be composing`).toBe(true)
                expect(v.correctness, `${run.text} @unit ${engine.unitIndex} should not be correct yet`).toBe('pending')

                const u = seq.units[engine.unitIndex]!
                engine.processKey(u.keyCode, u.modifier)
                if (engine.unitIndex < e) {
                    expect(present(engine, run).progress, `${run.text} progress`).toBeCloseTo((engine.unitIndex - s) / span)
                }
            }
            // Complete → green.
            expect(present(engine, run).correctness).toBe('correct')
        }
    })
})

describe('Wrong input feedback remains immediate during composition', () => {
    it('ရေ: wrong key colors the current unit red and keeps the caret composing', () => {
        const { engine, seq } = makeEngine('ရေ', myanmar)
        const run = graphemeUnitRuns(seq)[0]!

        engine.processKey('KeyQ', 'none')
        expect(engine.unitIndex).toBe(0) // caret doesn't advance on a wrong press
        const v = present(engine, run)
        expect(v.isCurrent).toBe(true)
        expect(v.correctness).toBe('pending')
        expect(v.slots?.find((s) => s.isCurrent)?.outcome).toBe('incorrect')
        expect(slotStates(engine, run)).toEqual(['pending', 'miss-now'])

        // Correct the key and complete → green.
        typeUnits(engine, seq, 2)
        expect(present(engine, run).correctness).toBe('correct')
    })
})

describe('Backspace during composition rewinds the caret one unit immediately', () => {
    it('မြန်မာ: backspace un-composes the last typed unit, slot flips back to current', () => {
        const { engine, seq } = makeEngine('မြန်မာ', myanmar)
        const run = graphemeUnitRuns(seq)[0]!

        // Type 3 units into the grapheme; cursor advanced to progress 0.5.
        typeUnits(engine, seq, 3)
        expect(engine.unitIndex).toBe(3)
        expect(present(engine, run).progress).toBeCloseTo(0.5)
        expect(slotStates(engine, run)).toEqual(['ok', 'ok', 'ok', 'now', 'pending', 'pending'])

        // Backspace: exactly one unit rewinds — progress 0.33, the `န` slot is
        // now current/pending again, unit 1's consume state is untouched.
        engine.processKey('Backspace', 'none')
        expect(engine.unitIndex).toBe(2)
        const reset = present(engine, run)
        expect(reset.isCurrent).toBe(true)
        expect(reset.progress).toBeCloseTo(2 / 6)
        expect(slotStates(engine, run)).toEqual(['ok', 'ok', 'now', 'pending', 'pending', 'pending'])

        // Re-type to completion.
        typeUnits(engine, seq, 6)
        expect(present(engine, run).correctness).toBe('correct')
    })

    it('backspace while a wrong unit is current erases that attempt and keeps the caret on it', () => {
        const { engine, seq } = makeEngine('ရေ', myanmar)
        const run = graphemeUnitRuns(seq)[0]!
        engine.processKey('KeyQ', 'none') // wrong for ေ
        expect(slotStates(engine, run)).toEqual(['pending', 'miss-now'])

        // Backspace erases the wrong attempt: the unit is pending again, and
        // the caret stays on it so the learner can retype the same unit.
        engine.processKey('Backspace', 'none')
        expect(engine.unitIndex).toBe(0)
        expect(engine.unitOutcomeAt(0)).toBeNull()
        expect(slotStates(engine, run)).toEqual(['pending', 'now'])

        typeUnits(engine, seq, 2)
        expect(present(engine, run).correctness).toBe('correct')
    })

    it('exhaustive unit-granular backspace walks every unit back to the start', () => {
        const { engine, seq } = makeEngine('ထို', myanmar)
        const total = seq.units.length
        expect(total).toBeGreaterThan(1)
        // Type one key short of the end so the run stays in-flight (Backspace
        // is ignored once the engine finishes).
        typeUnits(engine, seq, total - 1)
        expect(engine.unitIndex).toBe(total - 1)

        const visited: number[] = []
        for (let i = 0; i < total; i++) {
            engine.processKey('Backspace', 'none')
            visited.push(engine.unitIndex)
        }
        // Each Backspace steps back exactly one unit until 0, then no-ops.
        expect(visited).toEqual(Array.from({ length: total }, (_, i) => Math.max(0, total - 2 - i)))
        expect(visited.every((v, i) => i === 0 || v <= visited[i - 1]!), 'never moves forward').toBe(true)
        expect(engine.unitIndex).toBe(0)
        // The final backspace at 0 is a no-op that does not crash.
        engine.processKey('Backspace', 'none')
        expect(engine.unitIndex).toBe(0)
    })
})

describe('English remains character-by-character and real-time', () => {
    it('English single-unit characters: current while composing, correct once consumed', () => {
        const { engine, seq } = makeEngine('hello', englishQwerty)
        const runs = graphemeUnitRuns(seq)
        for (const run of runs) {
            expect(present(engine, run).isCurrent).toBe(true)
            expect(present(engine, run).progress).toBe(0)
            typeUnits(engine, seq, run.endUnit)
            expect(present(engine, run).correctness).toBe('correct')
        }
    })
})

describe('Only one grapheme is current at any caret position (current-character highlight)', () => {
    it('က က က က: exactly one grapheme is current at each unit', () => {
        const { engine, seq } = makeEngine('က က က က', myanmar)
        const runs = graphemeUnitRuns(seq)
        const kaRuns = runs.filter((r) => r.text === 'က')
        expect(kaRuns).toHaveLength(4)

        for (const ka of kaRuns) {
            typeUnits(engine, seq, ka.startUnit)
            const liveActive = runs.filter((g) => isCurrentGrapheme(engine.unitIndex, g.startUnit, g.endUnit))
            expect(liveActive, `caret ${engine.unitIndex}`).toHaveLength(1)
            expect(liveActive[0]).toEqual(ka)
        }
    })
})

describe('Caret movement: caret advances past completed graphemes immediately', () => {
    it('ရေ က: after completing ရေ, caret is on က (current), not on ရေ (correct)', () => {
        const { engine, seq } = makeEngine('ရေ က', myanmar)
        const runs = graphemeUnitRuns(seq)
        expect(runs[0]!.text).toBe('ရေ')
        expect(runs[1]!.text).toBe(' ')
        expect(runs[2]!.text).toBe('က')

        const rye = runs[0]!
        const space = runs[1]!
        const ka = runs[2]!

        typeUnits(engine, seq, rye.endUnit)
        expect(present(engine, rye).correctness).toBe('correct')

        expect(present(engine, space).isCurrent).toBe(true)
        expect(present(engine, space).progress).toBe(0)

        typeUnits(engine, seq, space.endUnit)

        expect(present(engine, ka).isCurrent).toBe(true)
        expect(present(engine, ka).progress).toBe(0)

        typeUnits(engine, seq, ka.endUnit)
        expect(present(engine, ka).correctness).toBe('correct')
        expect(engine.status).toBe('finished')
    })
})

// ---------------------------------------------------------------------------
// Three states are independent: cursor progress, active highlight, correctness
// ---------------------------------------------------------------------------

describe('STATE separation — cursor/highlight are real-time, only green waits', () => {
    it('ရေ: cursor slides and per-unit slots tint while correctness stays pending', () => {
        const { engine, seq } = makeEngine('ရေ', myanmar)
        const run = graphemeUnitRuns(seq)[0]!
        expect(run.endUnit - run.startUnit).toBe(2)

        const v = () => present(engine, run)

        expect(v().progress).toBe(0)
        expect(v().isCurrent).toBe(true)
        expect(v().slots?.filter((s) => s.completed)).toHaveLength(0)

        // First keystroke (ေ): cursor advances to 50%, EXACTLY one slot greens,
        // and the highlight is still on this grapheme. Green (whole) still waits.
        typeUnits(engine, seq, 1)
        expect(engine.unitIndex).toBe(1)
        expect(v().progress).toBe(0.5)
        expect(v().isCurrent).toBe(true)
        expect(v().slots?.filter((s) => s.completed)).toHaveLength(1)
        expect(v().slots?.filter((s) => s.completed)[0]!.text).toBe('ေ')
        expect(v().correctness).toBe('pending')

        // Second keystroke (ရ): grapheme completes → green; caret passes it.
        typeUnits(engine, seq, 2)
        expect(v().progress).toBe(1)
        expect(v().isCurrent).toBe(false)
        expect(v().correctness).toBe('correct')
        expect(v().slots).toBeNull()
    })

    it('ရေ က: highlight moves to the next logical grapheme the instant the current one completes', () => {
        const { engine, seq } = makeEngine('ရေ က', myanmar)
        const runs = graphemeUnitRuns(seq)
        const rye = runs[0]!
        const space = runs[1]!
        const ka = runs[2]!

        const activeOf = (r: GraphemeRun) => isCurrentGrapheme(engine.unitIndex, r.startUnit, r.endUnit)

        typeUnits(engine, seq, 1)
        expect(activeOf(rye)).toBe(true)
        expect(activeOf(space)).toBe(false)
        expect(activeOf(ka)).toBe(false)

        typeUnits(engine, seq, 2)
        expect(present(engine, rye).correctness).toBe('correct')
        expect(activeOf(rye)).toBe(false)
        expect(activeOf(space)).toBe(true)

        typeUnits(engine, seq, 3)
        expect(activeOf(ka)).toBe(true)
        expect(present(engine, space).correctness).toBe('correct')
    })

    it('မြန်မာ: progress advances every keystroke while pending graphemes stay at 0', () => {
        const { engine, seq } = makeEngine('မြန်မာ က', myanmar)
        const runs = graphemeUnitRuns(seq)
        expect(runs[0]!.text).toBe('မြန်မာ')
        const manya = runs[0]!
        const space = runs[1]!
        const ka = runs[2]!

        for (let i = 1; i < manya.endUnit; i++) {
            typeUnits(engine, seq, i)
            expect(cursorProgressInCluster(engine.unitIndex, manya.startUnit, manya.endUnit)).toBeCloseTo(
                i / manya.endUnit,
            )
            expect(cursorProgressInCluster(engine.unitIndex, space.startUnit, space.endUnit)).toBe(0)
            expect(cursorProgressInCluster(engine.unitIndex, ka.startUnit, ka.endUnit)).toBe(0)
            expect(present(engine, manya).correctness).toBe('pending')
        }
    })
})

// ---------------------------------------------------------------------------
// Current-grapheme highlight vs current-word: full-sequence regression walk
// ---------------------------------------------------------------------------
// `.tt-word-now` (the active background wash + ink) is applied ONLY to the
// grapheme currently under the caret — `isCurrentGrapheme(unit, start, end)`,
// which is exactly the predicate behind TargetText's `view.isCurrent` gate.
// Pending characters of the SAME word and already-typed characters must NEVER
// carry that active state (they render as tt-char-typed/tt-char-ok/tt-char-miss).
// This walk drives a real engine through complete sequences and asserts the
// invariant at every caret position, including spaces and mid-composition
// positions inside multi-unit Myanmar clusters.

describe('Current-grapheme highlight: exactly one active grapheme at every caret', () => {
    const sequences: Array<{ text: string; layout: KeyboardLayout; label: string }> = [
        { text: 'က က က က က', layout: myanmar, label: 'Case A — Myanmar repeated characters' },
        { text: 'မြန်မာ စာ', layout: myanmar, label: 'Case B — Myanmar multi-grapheme word + word' },
        { text: 'hello world', layout: englishQwerty, label: 'Case C — English two words' },
    ]

    it.each(sequences)('$label', ({ text, layout }) => {
        const { engine, seq } = makeEngine(text, layout)
        const runs = graphemeUnitRuns(seq)
        const total = seq.units.length

        for (let caret = 0; caret <= total; caret++) {
            typeUnits(engine, seq, caret)
            expect(engine.unitIndex).toBe(caret)

            for (const g of runs) {
                const active = isCurrentGrapheme(engine.unitIndex, g.startUnit, g.endUnit)
                const typed = engine.unitIndex >= g.endUnit
                const pending = engine.unitIndex < g.startUnit

                // Typed → committed verdict; upcoming pending graphemes of the
                // same word → untouched. Neither may carry the active highlight.
                if (typed || pending) {
                    expect(active, `${g.text} (typed=${typed}) @caret ${engine.unitIndex}`).toBe(false)
                }
            }

            // In-flight carets (before the last unit) always have exactly ONE
            // active grapheme — the one holding the caret.
            if (caret < total) {
                const currents = runs.filter((g) => isCurrentGrapheme(engine.unitIndex, g.startUnit, g.endUnit))
                expect(currents, `caret ${engine.unitIndex}`).toHaveLength(1)
            }
        }
    })
})
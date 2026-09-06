import { describe, expect, it } from 'vitest'

import { buildSequence, graphemeUnitRuns, type BuiltSequence } from '@/core/typing-engine/sequence'
import { TypingEngine } from '@/core/typing-engine/engine'
import { myanmar } from '@/core/keyboard-layout/myanmar'
import { englishQwerty } from '@/core/keyboard-layout/english-qwerty'
import type { KeyboardLayout } from '@/core/keyboard-layout/layout'
import {
    cursorProgressInCluster,
    graphemeViewState,
    isCurrentGrapheme,
    rangeHasIncorrect,
    type GraphemeViewState,
} from '@/core/typing-engine/char-state'

/**
 * The renderer's canonical per-grapheme selector (see TargetText `Char`). We
 * replicate it here to assert the exact visual state a learner sees after each
 * keystroke — correctness is decided solely by whether the whole grapheme's unit
 * range has been consumed AND whether an incorrect unit landed inside it.
 */
function viewState(engine: TypingEngine, startUnit: number, endUnit: number): GraphemeViewState {
    return graphemeViewState(engine.unitIndex, startUnit, endUnit, rangeHasIncorrect(engine, startUnit, endUnit))
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

function renderClass(v: GraphemeViewState): string {
    if (v.correctness === 'incorrect') return 'incorrect'
    if (v.correctness === 'correct') return 'correct'
    return v.isCurrent ? 'current' : 'pending'
}

describe('Myanmar grapheme correctness waits for the complete grapheme', () => {
    it('ရေ: typing only the pre-base vowel ေ (first unit) stays composing, not green', () => {
        const { engine, seq } = makeEngine('ရေ', myanmar)
        const [start, end] = [0, seq.graphemeUnitRanges[0]![1]]
        // Press order for ရေ is [ေ, ရ] (pre-base vowel first, then base).
        expect(seq.units[0]!.text).toBe('ေ')
        typeUnits(engine, seq, 1)
        expect(engine.unitIndex).toBe(1)
        // Mid-composition: the caret has advanced but the grapheme is NOT green.
        const mid = viewState(engine, start, end)
        expect(mid.isCurrent).toBe(true)
        expect(renderClass(mid)).toBe('current')
        // Now complete it → green.
        typeUnits(engine, seq, 2)
        expect(viewState(engine, start, end).correctness).toBe('correct')
    })

    it('wrong Myanmar input flags the unit incorrect and never flips the grapheme green early', () => {
        const { engine, seq } = makeEngine('ရေ', myanmar)
        const [start, end] = [0, seq.graphemeUnitRanges[0]![1]]
        // Wrong key (KeyQ) when ေ (KeyA) is expected: the unit is recorded
        // incorrect, the caret does not advance, and the grapheme stays in the
        // composing state — it is NOT green.
        engine.processKey('KeyQ', 'none')
        expect(engine.unitIndex).toBe(0)
        expect(engine.unitOutcomeAt(0)).toBe('incorrect')
        expect(engine.incorrectCount).toBe(1)
        const phase = viewState(engine, start, end)
        expect(phase.isCurrent).toBe(true)
        expect(phase.correctness).toBe('pending')
        expect(renderClass(phase)).not.toBe('correct')

        // Engine semantics (preserved): once the wrong unit is later typed
        // correctly, the resurrected grapheme completes to green. The incorrect
        // verdict is transient and replaced by the correct outcome.
        typeUnits(engine, seq, end)
        expect(viewState(engine, start, end).correctness).toBe('correct')
    })

    it('backspace during an incomplete grapheme resets state correctly', () => {
        const { engine, seq } = makeEngine('မြန်မာ', myanmar)
        const [start, end] = [0, seq.graphemeUnitRanges[0]![1]]
        // Type halfway into the six-unit grapheme (3 units).
        typeUnits(engine, seq, 3)
        expect(engine.unitIndex).toBe(3)
        const mid = viewState(engine, start, end)
        expect(mid.isCurrent).toBe(true)

        // Backspace is cluster-aware: removes the whole grapheme back to start.
        engine.processKey('Backspace', 'none')
        expect(engine.unitIndex).toBe(0)
        expect(engine.unitOutcomeAt(0)).toBeNull()
        const reset = viewState(engine, start, end)
        expect(reset.isCurrent).toBe(true) // caret back at composing start
        expect(renderClass(reset)).toBe('current')
        expect(reset.correctness).not.toBe('correct')
        expect(reset.correctness).not.toBe('incorrect')

        // Re-type to completion → correct.
        typeUnits(engine, seq, end)
        expect(viewState(engine, start, end).correctness).toBe('correct')
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
            // Consume every unit but the final one, asserting mid-composition
            // stays current/pending (never green, caret keeps sliding).
            for (let u = run.startUnit; u < run.endUnit - 1; u++) {
                typeUnits(engine, seq, u + 1)
                const v = viewState(engine, run.startUnit, run.endUnit)
                const consumed = engine.unitIndex - run.startUnit
                const span = run.endUnit - run.startUnit
                expect(v.isCurrent, `${run.text} @${consumed}/${span}`).toBe(true)
                expect(v.correctness, `${run.text} @${consumed}/${span}`).toBe('pending')
                expect(v.progress, `${run.text} @${consumed}/${span}`).toBeCloseTo(consumed / span)
            }
            // The final unit delivers the complete grapheme → green.
            typeUnits(engine, seq, run.endUnit)
            expect(viewState(engine, run.startUnit, run.endUnit).correctness, run.text).toBe('correct')
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
            const [start, end] = [run.startUnit, run.endUnit]
            // While the caret sits ON this character, it is current/pending —
            // not yet green. (For English this is a 1-unit span.)
            expect(viewState(engine, start, end).isCurrent).toBe(true)
            // One keypress consumes it → green.
            typeUnits(engine, seq, end)
            expect(viewState(engine, start, end).correctness).toBe('correct')
        }

        expect(engine.status).toBe('finished')
    })
})

// ---------------------------------------------------------------------------
// Cursor moves in real time during composition
// ---------------------------------------------------------------------------
// The cursor/progress updates after every keyboard input, providing immediate
// visual feedback. Correctness (green) is delayed until the full grapheme is
// entered. These tests verify that cursor progress tracks each unit in real
// time while correctness stays pending until completion.

describe('Cursor moves in real time during Myanmar composition', () => {
    it('ရေ: cursor progress updates after each input, green only at completion', () => {
        const { engine, seq } = makeEngine('ရေ', myanmar)
        const [start, end] = [0, seq.graphemeUnitRanges[0]![1]]
        expect(end - start).toBe(2)

        // Fresh start: current, progress 0 — composing, not green.
        expect(viewState(engine, start, end).progress).toBe(0)
        expect(viewState(engine, start, end).isCurrent).toBe(true)
        expect(renderClass(viewState(engine, start, end))).not.toBe('correct')

        // After typing ေ (unit 0 → 1): cursor moves (progress 0.5), still composing.
        typeUnits(engine, seq, 1)
        expect(engine.unitIndex).toBe(1)
        expect(viewState(engine, start, end).progress).toBe(0.5)
        expect(renderClass(viewState(engine, start, end))).not.toBe('correct')

        // After typing ရ (unit 1 → 2): grapheme complete → green.
        typeUnits(engine, seq, 2)
        expect(viewState(engine, start, end).correctness).toBe('correct')
    })

    it('မြန်မာ: cursor advances through all six intermediate positions', () => {
        const { engine, seq } = makeEngine('မြန်မာ', myanmar)
        const [start, end] = [0, seq.graphemeUnitRanges[0]![1]]
        expect(end - start).toBe(6)

        for (let i = 0; i < end - 1; i++) {
            typeUnits(engine, seq, i + 1)
            const v = viewState(engine, start, end)
            expect(v.progress, `after ${i + 1}/${end}`).toBeCloseTo((i + 1) / end)
            expect(v.isCurrent).toBe(true)
            expect(v.correctness).toBe('pending')
        }

        // Final unit → green.
        typeUnits(engine, seq, end)
        expect(viewState(engine, start, end).correctness).toBe('correct')
    })

    it('combined Myanmar sequence: cursor tracks each grapheme in real time', () => {
        const text = 'ရေ က မ စာ'
        const { engine, seq } = makeEngine(text, myanmar)
        const runs = graphemeUnitRuns(seq)

        for (const run of runs) {
            const [s, e] = [run.startUnit, run.endUnit]
            const span = e - s

            while (engine.unitIndex < e) {
                // While composing, the grapheme is current — cursor is moving.
                const v = viewState(engine, s, e)
                expect(v.isCurrent, `${run.text} @unit ${engine.unitIndex} should be composing`).toBe(true)
                expect(v.correctness, `${run.text} @unit ${engine.unitIndex} should not be correct yet`).toBe('pending')

                const u = seq.units[engine.unitIndex]!
                engine.processKey(u.keyCode, u.modifier)
                if (engine.unitIndex < e) {
                    expect(viewState(engine, s, e).progress, `${run.text} progress`).toBeCloseTo((engine.unitIndex - s) / span)
                }
            }
            // Complete → green.
            expect(viewState(engine, s, e).correctness).toBe('correct')
        }
    })
})

describe('Wrong input feedback remains immediate during composition', () => {
    it('ရေ: wrong key records the error and keeps the caret composing (not green)', () => {
        const { engine, seq } = makeEngine('ရေ', myanmar)
        const [start, end] = [0, seq.graphemeUnitRanges[0]![1]]

        // Press wrong key (KeyQ instead of expected KeyA for ေ).
        engine.processKey('KeyQ', 'none')
        expect(engine.unitIndex).toBe(0) // caret doesn't advance on a wrong press
        // Still composing — not green, not a final incorrect verdict.
        const v = viewState(engine, start, end)
        expect(v.isCurrent).toBe(true)
        expect(v.correctness).toBe('pending')
        expect(renderClass(v)).not.toBe('correct')

        // Correct the key and complete → green.
        typeUnits(engine, seq, end)
        expect(viewState(engine, start, end).correctness).toBe('correct')
    })
})

describe('Backspace during composition resets the caret immediately', () => {
    it('မြန်မာ: backspace resets caret from interior of typed content to grapheme start', () => {
        const { engine, seq } = makeEngine('မြန်မာ', myanmar)
        const [start, end] = [0, seq.graphemeUnitRanges[0]![1]]

        // Type 3 units into the grapheme.
        typeUnits(engine, seq, 3)
        expect(engine.unitIndex).toBe(3)
        // Mid-composition cursor has advanced to progress 0.5 of the cluster.
        expect(viewState(engine, start, end).progress).toBeCloseTo(0.5)

        // Backspace: cluster-aware, resets to grapheme start.
        engine.processKey('Backspace', 'none')
        expect(engine.unitIndex).toBe(0)
        // Caret resets to the composing start of the same grapheme.
        const reset = viewState(engine, start, end)
        expect(reset.isCurrent).toBe(true)
        expect(reset.progress).toBe(0)

        // Re-type to completion.
        typeUnits(engine, seq, end)
        expect(viewState(engine, start, end).correctness).toBe('correct')
    })
})

describe('English remains character-by-character and real-time', () => {
    it('English single-unit characters: current while composing, correct once consumed', () => {
        const { engine, seq } = makeEngine('hello', englishQwerty)
        const runs = graphemeUnitRuns(seq)
        for (const run of runs) {
            const [start, end] = [run.startUnit, run.endUnit]
            // Before typing: current with progress 0 (composing start).
            expect(viewState(engine, start, end).isCurrent).toBe(true)
            expect(viewState(engine, start, end).progress).toBe(0)
            // Type the character → green.
            typeUnits(engine, seq, end)
            expect(viewState(engine, start, end).correctness).toBe('correct')
        }
    })
})

describe('Only one grapheme is current at any caret position (current-character highlight)', () => {
    it('က က က က: exactly one grapheme is current at each unit', () => {
        const { engine, seq } = makeEngine('က က က က', myanmar)
        const runs = graphemeUnitRuns(seq)
        // Runs: က[0,1) space[1,2) က[2,3) space[3,4) က[4,5) space[5,6) က[6,7).
        const kaRuns = runs.filter((r) => r.text === 'က')
        expect(kaRuns).toHaveLength(4)

        for (const ka of kaRuns) {
            // Drive the engine up to the start of this က (typing everything
            // before it, including the separating spaces).
            typeUnits(engine, seq, ka.startUnit)

            // Exactly one grapheme is current, and it is THIS က — never a
            // neighbour (each က is an identical 1-unit grapheme, so selection
            // must come from unit ranges, not from repeated text).
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

        // Complete ရေ.
        typeUnits(engine, seq, rye.endUnit)
        expect(viewState(engine, rye.startUnit, rye.endUnit).correctness).toBe('correct')

        // Space: current (progress 0), caret at composing start.
        expect(viewState(engine, space.startUnit, space.endUnit).isCurrent).toBe(true)
        expect(viewState(engine, space.startUnit, space.endUnit).progress).toBe(0)

        // Type the space.
        typeUnits(engine, seq, space.endUnit)

        // က: current (progress 0), caret at composing start.
        expect(viewState(engine, ka.startUnit, ka.endUnit).isCurrent).toBe(true)
        expect(viewState(engine, ka.startUnit, ka.endUnit).progress).toBe(0)

        // Type က.
        typeUnits(engine, seq, ka.endUnit)
        expect(viewState(engine, ka.startUnit, ka.endUnit).correctness).toBe('correct')
        expect(engine.status).toBe('finished')
    })
})

// ---------------------------------------------------------------------------
// Three states are independent: cursor progress, active highlight, correctness
// ---------------------------------------------------------------------------
// Regression: the highlight and cursor must track the caret in REAL TIME while
// the green verdict alone waits for the complete grapheme. All three are
// composed by graphemeViewState but never cross-gate: isCurrent + progress
// update on every keystroke, correctness is decided only on full consumption.

describe('STATE separation — cursor/highlight are real-time, only green waits', () => {
    it('ရေ: cursor slides and highlight stays active while correctness stays pending', () => {
        const { engine, seq } = makeEngine('ရေ', myanmar)
        const [start, end] = [0, seq.graphemeUnitRanges[0]![1]]
        expect(end - start).toBe(2)

        const v = () => viewState(engine, start, end)

        // Before any keystroke: caret at the leading boundary, grapheme active,
        // composition pending (never green).
        expect(v().progress).toBe(0)
        expect(v().isCurrent).toBe(true)
        expect(['correct', 'incorrect']).not.toContain(v().correctness)

        // First keystroke (ေ): the cursor advances to 50% of the cluster and the
        // highlight is still on this grapheme — both instant. Green still waits.
        typeUnits(engine, seq, 1)
        expect(engine.unitIndex).toBe(1)
        expect(v().progress).toBe(0.5)
        expect(v().isCurrent).toBe(true)
        expect(['correct', 'incorrect']).not.toContain(v().correctness)
        expect(renderClass(v())).toBe('current')

        // Second keystroke (ရ): grapheme completes → correct; caret passes it.
        typeUnits(engine, seq, 2)
        expect(v().progress).toBe(1)
        expect(v().isCurrent).toBe(false)
        expect(v().correctness).toBe('correct')
    })

    it('ရေ က: highlight moves to the next logical grapheme the instant the current one completes', () => {
        const { engine, seq } = makeEngine('ရေ က', myanmar)
        const runs = graphemeUnitRuns(seq)
        const rye = runs[0]!
        const space = runs[1]!
        const ka = runs[2]!

        const activeOf = (r: { startUnit: number; endUnit: number }) =>
            isCurrentGrapheme(engine.unitIndex, r.startUnit, r.endUnit)

        // Mid-composition of ရေ: only ရေ is highlighted, never the neighbour.
        typeUnits(engine, seq, 1)
        expect(activeOf(rye)).toBe(true)
        expect(activeOf(space)).toBe(false)
        expect(activeOf(ka)).toBe(false)

        // The final unit completes ရေ → green AND the highlight immediately
        // transitions to the following grapheme in the same instant.
        typeUnits(engine, seq, 2)
        expect(viewState(engine, rye.startUnit, rye.endUnit).correctness).toBe('correct')
        expect(activeOf(rye)).toBe(false)
        expect(activeOf(space)).toBe(true)

        // Keep typing: the highlight lands on က — never on the finished word.
        typeUnits(engine, seq, 3)
        expect(activeOf(ka)).toBe(true)
        expect(viewState(engine, space.startUnit, space.endUnit).correctness).toBe('correct')
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
            // Unreached graphemes always report progress 0 — the caret is never
            // "somewhere" inside a pending cluster.
            expect(cursorProgressInCluster(engine.unitIndex, space.startUnit, space.endUnit)).toBe(0)
            expect(cursorProgressInCluster(engine.unitIndex, ka.startUnit, ka.endUnit)).toBe(0)
            expect(viewState(engine, manya.startUnit, manya.endUnit).correctness).toBe('pending')
        }
    })
})
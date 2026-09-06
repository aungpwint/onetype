import type { Modifier } from '@/types'
import type { Hand } from '@/types'
import type { FingerId } from '@/types'
import { KeyboardLayout, shiftHandFor } from '@/core/keyboard-layout/layout'
import { splitGraphemes } from '@/core/unicode/graphemes'
import { findSuspiciousInvisibleCharacters, splitMyanmarSyllables, containsMyanmar } from '@/core/unicode/myanmar'
import { isPreBaseVowel } from '@/core/unicode/classification'

export interface TypingUnit {
    index: number
    keyCode: string
    modifier: Modifier
    text: string
    finger: FingerId
    hand: Hand
    shiftHand: Hand | null
    graphemeIndex: number
    grapheme: string
}

export interface BuiltSequence {
    units: TypingUnit[]
    graphemes: string[]
    graphemeUnitRanges: [number, number][]
    text: string
    charCount: number
}

// --- Myanmar input-order model ---------------------------------------------
//
// STORED/logical Unicode "ရေ" = U+101B then U+1031 — lesson data, `graphemes`,
// `text` and the renderer all live here. KEYBOARD press order reorders the
// pre-base vowel U+1031 to the front (ေ → ရ) because it is the leftmost glyph
// on the Pyidaungsu-mapped keyboard. VISUAL result is the shaped glyph run from
// the logical sequence. `splitMyanmarSyllables` produces logical clusters;
// `keyboardOrderForCluster` reorders one cluster into press order; `buildSequence`
// emits units in press order while graphemes/ranges keep logical order.

export function keyboardOrderForCluster(cluster: string): string {
    if (!containsMyanmar(cluster)) return cluster
    const chars = Array.from(cluster)
    const prebase = chars.filter((c) => isPreBaseVowel(c.codePointAt(0) ?? 0))
    if (prebase.length === 0) return cluster
    const rest = chars.filter((c) => !isPreBaseVowel(c.codePointAt(0) ?? 0))
    return [...prebase, ...rest].join('')
}

export function buildSequence(text: string, layout: KeyboardLayout): BuiltSequence {
    if (layout.language === 'myanmar') {
        const found = findSuspiciousInvisibleCharacters(text)
        if (found.length > 0) {
            throw new Error(`Myanmar typing text contains unexpected invisible character at index ${found[0].index}: ${found[0].description}`)
        }
    }
    const graphemes = layout.language === 'myanmar' ? splitMyanmarSyllables(text) : splitGraphemes(text)
    const graphemeUnitRanges: [number, number][] = []
    const units: TypingUnit[] = []
    for (let gi = 0; gi < graphemes.length; gi++) {
        const token = graphemes[gi]
        // Units are emitted in KEYBOARD press order, not Unicode order. The
        // cluster's press order is a permutation of its logical code points, so
        // the press set always composes the cluster's logical (canonical) text.
        const inputToken = layout.language === 'myanmar' ? keyboardOrderForCluster(token) : token
        const pairs = layout.reverseMap([inputToken])
        const start = units.length
        for (const pair of pairs) {
            const index = units.length
            units.push({
                index,
                keyCode: pair.lookup.code,
                modifier: pair.lookup.modifier,
                text: pair.lookup.text,
                finger: pair.lookup.finger,
                hand: pair.lookup.hand,
                shiftHand: pair.lookup.modifier === 'shift' ? shiftHandFor(pair.lookup.hand) : null,
                graphemeIndex: gi,
                grapheme: token,
            })
        }
        const end = units.length
        graphemeUnitRanges.push([start, end])
    }
    return {
        units,
        graphemes,
        graphemeUnitRanges,
        text: graphemes.join(''),
        charCount: units.length,
    }
}

export function graphemeForUnit(sequence: BuiltSequence, unitIndex: number): number {
    if (unitIndex <= 0) return 0
    if (unitIndex >= sequence.units.length) return sequence.graphemes.length - 1
    return sequence.units[unitIndex].graphemeIndex
}

export function remainingText(sequence: BuiltSequence, unitIndex: number): string {
    return sequence.graphemes.slice(graphemeForUnit(sequence, unitIndex)).join('')
}

export function completedText(sequence: BuiltSequence, unitIndex: number): string {
    const count = unitsForGraphemesBefore(sequence, unitIndex)
    return sequence.graphemes.slice(0, count).join('')
}

function unitsForGraphemesBefore(sequence: BuiltSequence, unitIndex: number): number {
    const gi = graphemeForUnit(sequence, unitIndex)
    return sequence.graphemeUnitRanges[gi][0]
}

export interface GraphemeSlot {
    /** Logical display segment (one code point) of a grapheme. */
    text: string
    /** Local typing-unit offset within the grapheme's [startUnit, endUnit) that
        produces this segment in press order. Logical slot i renders the state
        of global unit `startUnit + unitLocal`. */
    unitLocal: number
}

/**
 * Maps every code point of a grapheme (in logical display order) to the
 * keyboard-press unit that produces it. The grapheme's press order is a
 * permutation of its logical code points (pre-base vowels like U+1031 move to
 * the front), so a greedy match driven by press order recovers the exact
 * inverse assignment — including repeated code points like the two `မ` in
 * `မြန်မာ`. The logical slot-to-unit mapping is what lets the renderer color
 * per typing unit while keeping the grapheme in readable display order.
 */
export function logicalSlotsForCluster(logical: string, pressTexts: string[]): GraphemeSlot[] {
    const unitCps = pressTexts.map((text) => Array.from(text))
    const slots: GraphemeSlot[] = []
    for (const cp of Array.from(logical)) {
        let matched = -1
        for (let u = 0; u < unitCps.length; u++) {
            const idx = unitCps[u]!.indexOf(cp)
            if (idx >= 0) {
                unitCps[u]!.splice(idx, 1)
                matched = u
                break
            }
        }
        if (matched === -1) {
            // Valid targets never reach here (the press set is a permutation of
            // the logical code points); fall back to the next unattributed unit
            // so an unexpected grapheme still renders every code point.
            matched = slots.length < unitCps.length ? slots.length : unitCps.length - 1
        }
        slots.push({ text: cp, unitLocal: matched })
    }
    return slots
}

export interface GraphemeRun {
    index: number
    text: string
    startUnit: number
    endUnit: number
    /** Logical-display-order per-unit slots; the presentation layer's source. */
    slots: GraphemeSlot[]
}

export function graphemeUnitRuns(sequence: BuiltSequence): GraphemeRun[] {
    const runs: GraphemeRun[] = []
    for (let gi = 0; gi < sequence.graphemeUnitRanges.length; gi++) {
        const [start, end] = sequence.graphemeUnitRanges[gi]
        runs.push({
            index: gi,
            text: sequence.graphemes[gi],
            startUnit: start,
            endUnit: end,
            slots: logicalSlotsForCluster(
                sequence.graphemes[gi],
                sequence.units.slice(start, end).map((u) => u.text),
            ),
        })
    }
    return runs
}

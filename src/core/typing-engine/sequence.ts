import type { Modifier } from '@/types'
import type { Hand } from '@/types'
import type { FingerId } from '@/types'
import { KeyboardLayout, shiftHandFor } from '@/core/keyboard-layout/layout'
import { splitGraphemes } from '@/core/unicode/graphemes'
import { findSuspiciousInvisibleCharacters, splitMyanmarSyllables, splitMixedClusters } from '@/core/unicode/myanmar'
import { myanmarKeyboardOrder } from '@/core/unicode/keyboard-order'

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

// Graphemes retain natural display order; Myanmar units are derived in the
// keyboard's input order so validation never depends on shaped glyph order.

export function buildSequence(text: string, layout: KeyboardLayout): BuiltSequence {
    // Any suspicious invisible characters must not reach the typing target,
    // including inside a mixed English + Myanmar text.
    if (layout.language !== 'english') {
        const found = findSuspiciousInvisibleCharacters(text)
        if (found.length > 0) {
            throw new Error(`Myanmar typing text contains unexpected invisible character at index ${found[0].index}: ${found[0].description}`)
        }
    }
    const graphemes =
        layout.language === 'myanmar' ? splitMyanmarSyllables(text) : layout.language === 'mixed' ? splitMixedClusters(text) : splitGraphemes(text)
    const graphemeUnitRanges: [number, number][] = []
    const units: TypingUnit[] = []
    for (let gi = 0; gi < graphemes.length; gi++) {
        const token = graphemes[gi]
        const isMyanmarToken =
            layout.language === 'myanmar' || (layout.language === 'mixed' && /[\u1000-\u109f\uaa60-\uaa7f\ua9e0-\ua9ff]/u.test(token))
        // Preserve layout-defined multi-codepoint aliases such as ၎င်း as
        // one key; only ordinary Myanmar syllables need reordering.
        const inputText = isMyanmarToken && !layout.lookupChar(token) ? myanmarKeyboardOrder(token) : token
        const pairs = layout.reverseMap([inputText])
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
    text: string
    unitLocal: number
}

// Maps every code point of a grapheme (in logical display order) to the
// keyboard-press unit that produces it, via a greedy match driven by press
// order — recovering the exact assignment even with repeated code points.
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

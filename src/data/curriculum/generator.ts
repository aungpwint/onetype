import type { Level } from '@/types'
import { getLayoutOrThrow } from '@/core/keyboard-layout/registry'
import { splitGraphemes } from '@/core/unicode/graphemes'
import { buildSequence, type BuiltSequence, type TypingUnit } from '@/core/typing-engine/sequence'

import type { LessonData, LessonPhase } from './types'

interface ResolvedPhase {
    label: string
    instruction: string
    startUnit: number
    endUnit: number
    text: string
}

export interface ResolvedLesson {
    id: string
    level: Level
    number: number
    sequence: BuiltSequence
    layoutId: string
    totalUnits: number
    totalCharacters: number
    phases: ResolvedPhase[]
    difficulty: string
    estimatedMinutes: number
    completion: { minAccuracy: number; minWpm: number | null }
    title: string
    titleMy: string
    description: string
    language: string
    focusKeys?: string[]
}

function validateLessonCharacters(lessonId: string, phase: LessonPhase, layoutId: string): void {
    const layout = getLayoutOrThrow(layoutId)
    for (const grapheme of splitGraphemes(phase.text)) {
        // Reverse-map like the engine grades so multi-codepoint emissions (e.g. ၎င်း on KeyR shift) count as one key press.
        try {
            layout.reverseMap([grapheme])
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            throw new Error(`Lesson "${lessonId}": ${message} (in phase "${phase.instruction}")`, { cause: error })
        }
    }
}

export function resolveLesson(data: LessonData): ResolvedLesson {
    for (const phase of data.phases) {
        validateLessonCharacters(data.id, phase, data.layoutId)
    }

    const allPhases: ResolvedPhase[] = []
    const unitsByPhase: BuiltSequence[] = []
    let unitOffset = 0
    let phaseIndex = 0
    for (const phase of data.phases) {
        const sequence = buildSequence(phase.text, getLayoutOrThrow(data.layoutId))
        allPhases.push({
            label: `${data.number}.${phaseIndex + 1}`,
            instruction: phase.instruction,
            startUnit: unitOffset,
            endUnit: unitOffset + sequence.units.length,
            text: phase.text,
        })
        unitsByPhase.push(sequence)
        unitOffset += sequence.units.length
        phaseIndex += 1
    }

    // Rebase units, graphemes and ranges onto one global list so multi-phase helpers stay grapheme-coherent.
    const allUnits: TypingUnit[] = []
    const graphemes: string[] = []
    const graphemeUnitRanges: [number, number][] = []
    let unitCursor = 0
    let graphemeOffset = 0
    for (const sequence of unitsByPhase) {
        const phaseUnitBase = unitCursor
        for (const unit of sequence.units) {
            allUnits.push({
                ...unit,
                index: unitCursor,
                graphemeIndex: unit.graphemeIndex + graphemeOffset,
            })
            unitCursor += 1
        }
        for (const token of sequence.graphemes) {
            graphemes.push(token)
        }
        for (const [start, end] of sequence.graphemeUnitRanges) {
            graphemeUnitRanges.push([start + phaseUnitBase, end + phaseUnitBase])
        }
        graphemeOffset += sequence.graphemes.length
    }

    const concatTexts = allPhases.map((phase) => phase.text)

    const sequence: BuiltSequence = {
        units: allUnits,
        graphemes,
        graphemeUnitRanges,
        text: concatTexts.join(' '),
        charCount: allUnits.length,
    }

    return {
        ...data,
        sequence,
        totalUnits: allUnits.length,
        totalCharacters: allUnits.length,
        phases: allPhases,
    }
}

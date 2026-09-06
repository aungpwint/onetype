import type { TypingEngine } from '@/core/typing-engine/engine'
import { rangeHasIncorrect } from '@/core/typing-engine/char-state'

export interface MissedWordsResult {
    /** Distinct words that contain at least one currently-wrong unit. */
    words: string[]
    /** Words joined with a single space, ready for practice material. */
    text: string
    count: number
}

const MAX_MISSED_WORDS = 40

/**
 * Extract the words the learner is still getting wrong from a finished session.
 *
 * The engine clears a unit's outcome on backspace, so only units that are
 * wrong *at the end* of a round surface here — a transient slip that was fixed
 * is not re-drilled. Words are delimited the same way practice material sees
 * them (space-separated tokens, keeping their original punctuation/typing
 * units), so the result feeds straight back into `buildPracticeMaterial`.
 */
export function extractMissedWords(engine: TypingEngine): MissedWordsResult {
    const words: string[] = []
    const seen = new Set<string>()
    const totalUnits = engine.sequence.units.length

    let buffer = ''
    let startUnit = -1

    const close = (wordEndUnit: number) => {
        const word = buffer.trim()
        if (word && !seen.has(word) && startUnit >= 0) {
            if (rangeHasIncorrect(engine, startUnit, wordEndUnit)) {
                seen.add(word)
                words.push(word)
            }
        }
        buffer = ''
        startUnit = -1
    }

    for (const unit of engine.sequence.units) {
        if (words.length >= MAX_MISSED_WORDS) break
        if (unit.text === ' ') {
            if (startUnit !== -1) close(unit.index)
        } else if (startUnit === -1) {
            startUnit = unit.index
            buffer = unit.text
        } else {
            buffer += unit.text
        }
    }
    if (buffer && startUnit !== -1 && words.length < MAX_MISSED_WORDS) {
        close(totalUnits)
    }

    return { words, text: words.join(' '), count: words.length }
}
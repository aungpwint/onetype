import type { TypingEngine } from '@/core/typing-engine/engine'
import { rangeHasIncorrect } from '@/core/typing-engine/char-state'

export interface MissedWordsResult {
    words: string[]
    text: string
    count: number
}

const MAX_MISSED_WORDS = 40

// Backspace clears a unit's outcome, so only units wrong at round end surface here.
export function extractMissedWords(engine: TypingEngine): MissedWordsResult {
    const words: string[] = []
    const seen = new Set<string>()
    let buffer = ''
    let startUnit = -1

    const close = (wordEndUnit: number, displayWord: string) => {
        const word = displayWord.trim()
        if (word && !seen.has(word) && startUnit >= 0) {
            if (rangeHasIncorrect(engine, startUnit, wordEndUnit)) {
                seen.add(word)
                words.push(word)
            }
        }
        buffer = ''
        startUnit = -1
    }

    for (let gi = 0; gi < engine.sequence.graphemes.length; gi += 1) {
        if (words.length >= MAX_MISSED_WORDS) break
        const grapheme = engine.sequence.graphemes[gi]!
        const [start] = engine.sequence.graphemeUnitRanges[gi]!
        if (grapheme === ' ') {
            if (startUnit !== -1) close(start, buffer)
            buffer = ''
            startUnit = -1
        } else if (startUnit === -1) {
            startUnit = start
            buffer = grapheme
        } else {
            buffer += grapheme
        }
    }
    if (buffer && startUnit !== -1 && words.length < MAX_MISSED_WORDS) {
        close(engine.sequence.units.length, buffer)
    }

    return { words, text: words.join(' '), count: words.length }
}

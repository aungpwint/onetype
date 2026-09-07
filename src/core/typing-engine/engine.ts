import type { Modifier, TypingMode } from '@/types'
import { KeyboardLayout } from '@/core/keyboard-layout/layout'
import { BuiltSequence, TypingUnit, keyboardOrderForCluster } from './sequence'
import { computeScore, ScoreMetrics } from '@/core/scoring/score'
import { Stopwatch } from '@/core/timing/stopwatch'
import { ClusterDiagnosis, diagnoseClusterComparison } from '@/core/unicode/comparison'
import { containsMyanmar } from '@/core/unicode/myanmar'

export type EngineStatus = 'ready' | 'running' | 'paused' | 'finished'
export type FinishReason = 'completed' | 'time-up' | 'stopped' | 'failed'

export interface KeyOutcome {
    correct: number
    incorrect: number
}

export interface TypingEngineEvent {
    type: 'start' | 'pause' | 'resume' | 'correct' | 'incorrect' | 'backspace' | 'restart' | 'finish' | 'time-up'
    unitIndex: number
    keyCode?: string
    modifier?: Modifier
    expected?: TypingUnit
    metrics?: ScoreMetrics
    reason?: FinishReason
    errorKind?: 'key' | 'modifier'
}

export type EngineListener = (event: TypingEngineEvent) => void

export interface TypingEngineOptions {
    sequence: BuiltSequence
    layout: KeyboardLayout
    mode?: TypingMode
    durationSeconds?: number
    now?: () => number
    onEvent?: EngineListener
}

export class TypingEngine {
    readonly sequence: BuiltSequence
    readonly layout: KeyboardLayout
    readonly mode: TypingMode
    readonly durationSeconds: number | null

    status: EngineStatus = 'ready'
    unitIndex = 0
    correctCount = 0
    incorrectCount = 0
    backspaceCount = 0
    shiftErrorCount = 0
    totalKeys = 0
    lastEvent: TypingEngineEvent | null = null
    finishReason: FinishReason | null = null
    readonly keyOutcomes = new Map<string, KeyOutcome>()
    readonly wrongPresses = new Map<string, Map<string, number>>()
    private readonly unitOutcomes = new Map<number, boolean>()
    private readonly stopwatch: Stopwatch
    private readonly listeners: EngineListener[] = []
    readonly correctTimes: number[] = []
    readonly clusterDiagnoses = new Map<number, ClusterDiagnosis>()
    private readonly clusterTypedChars = new Map<number, string[]>()

    constructor(options: TypingEngineOptions) {
        this.sequence = options.sequence
        this.layout = options.layout
        this.mode = options.mode ?? 'guided'
        this.durationSeconds = options.durationSeconds ?? null
        this.stopwatch = new Stopwatch(options.now)
        if (options.onEvent) this.listeners.push(options.onEvent)
    }

    on(listener: EngineListener): () => void {
        this.listeners.push(listener)
        return () => {
            const i = this.listeners.indexOf(listener)
            if (i >= 0) this.listeners.splice(i, 1)
        }
    }

    private emit(event: TypingEngineEvent) {
        this.lastEvent = event
        for (const listener of this.listeners) {
            listener(event)
        }
    }

    get expectedUnit(): TypingUnit | null {
        return this.sequence.units[this.unitIndex] ?? null
    }

    get isComplete(): boolean {
        return this.unitIndex >= this.sequence.units.length
    }

    get attempts(): number {
        return this.correctCount + this.incorrectCount
    }

    unitOutcomeAt(index: number): 'correct' | 'incorrect' | null {
        const result = this.unitOutcomes.get(index)
        return result === undefined ? null : result ? 'correct' : 'incorrect'
    }

    start() {
        if (this.status === 'running' || this.status === 'finished') return
        if (this.status === 'paused') {
            this.resume()
            return
        }
        this.status = 'running'
        this.stopwatch.start()
        this.emit({ type: 'start', unitIndex: this.unitIndex })
    }

    pause() {
        if (this.status !== 'running') return
        this.status = 'paused'
        this.stopwatch.pause()
        this.emit({ type: 'pause', unitIndex: this.unitIndex })
    }

    resume() {
        if (this.status !== 'paused') return
        this.status = 'running'
        this.stopwatch.start()
        this.emit({ type: 'resume', unitIndex: this.unitIndex })
    }

    elapsedMs(): number {
        return this.stopwatch.elapsedMs()
    }

    elapsedSeconds(): number {
        return this.stopwatch.elapsedSeconds()
    }

    currentMetrics(): ScoreMetrics {
        return computeScore({
            correctAttempts: this.correctCount,
            incorrectAttempts: this.incorrectCount,
            backspaceCount: this.backspaceCount,
            elapsedSeconds: this.elapsedSeconds(),
            language: this.layout.language === 'english' ? 'english' : this.layout.language,
            clusters: this.completedClusters(),
            correctTimes: this.correctTimes,
        })
    }

    completedClusters(): number {
        let count = 0
        const ranges = this.sequence.graphemeUnitRanges
        for (const [, end] of ranges) {
            if (end <= this.unitIndex) count += 1
        }
        return count
    }

    clusterDiagnosisFor(graphemeIndex: number): ClusterDiagnosis | null {
        return this.clusterDiagnoses.get(graphemeIndex) ?? null
    }

    diagnoseClusters(): ClusterDiagnosis[] {
        const out: ClusterDiagnosis[] = []
        for (let gi = 0; gi < this.sequence.graphemes.length; gi++) {
            const d = this.clusterDiagnoses.get(gi)
            if (d) out.push(d)
        }
        return out
    }

    processKey(code: string, modifier: Modifier, character?: string | null): TypingEngineEvent | null {
        if (this.status === 'ready') {
            this.start()
        }
        if (this.status !== 'running') return null
        if (this.durationSeconds !== null && this.elapsedSeconds() >= this.durationSeconds) {
            this.finish('time-up')
            return this.lastEvent
        }

        const expected = this.expectedUnit
        if (!expected) {
            this.finish('completed')
            return this.lastEvent
        }

        if (code === 'Backspace') {
            this.backspaceCount += 1
            // Backspace undoes exactly one typing unit: the current unit when it
            // holds a wrong attempt, otherwise the last consumed unit — so a
            // multi-unit Myanmar grapheme unwinds unit-by-unit.
            if (this.unitIndex > 0 || this.unitOutcomes.has(this.unitIndex)) {
                const target = this.unitOutcomes.has(this.unitIndex) ? this.unitIndex : this.unitIndex - 1
                this.unitOutcomes.delete(target)
                this.clearClusterStateFromUnit(target)
                this.unitIndex = target
            }
            this.emit({ type: 'backspace', unitIndex: this.unitIndex, expected })
            return this.lastEvent
        }

        const keyKey = `${code}:${modifier}`
        const outcome = this.keyOutcomes.get(keyKey) ?? { correct: 0, incorrect: 0 }
        this.totalKeys += 1

        // Grade by the ACTUAL typed character when it is registered in the
        // layout's charMap (required so a mixed English+Myanmar exercise can
        // tell `u` from `က` even though both ride the same physical KeyU).
        // When the typed character is NOT in the charMap the OS keyboard is
        // producing characters from a different script (e.g. English OS
        // keyboard while the app Myanmar layout is active) — fall back to
        // physical key code so the app-level layout still works.
        const normalizedChar = character != null && character.length > 0 ? character.normalize('NFC') : null
        const expectedChar = expected.text.normalize('NFC')
        const charMatches = normalizedChar === expectedChar
        const codeMatches = code === expected.keyCode
        const charIsInLayout = normalizedChar != null && this.layout.lookupChar(normalizedChar) != null
        const correctInput = charIsInLayout ? charMatches : codeMatches
        const isCorrect = correctInput && modifier === expected.modifier

        if (isCorrect) {
            outcome.correct += 1
            this.keyOutcomes.set(keyKey, outcome)
            this.correctCount += 1
            this.unitOutcomes.set(expected.index, true)
            this.correctTimes.push(this.stopwatch.elapsedMs())
            this.unitIndex += 1
            // Record after the advance so a fully-consumed cluster is classified
            // immediately; wrong presses accumulate without consuming the unit.
            this.recordClusterPress(expected.graphemeIndex, code, modifier, normalizedChar)
            this.emit({ type: 'correct', unitIndex: expected.index, keyCode: code, modifier, expected })
            if (this.isComplete) {
                this.finish('completed')
            }
        } else {
            outcome.incorrect += 1
            this.keyOutcomes.set(keyKey, outcome)
            this.incorrectCount += 1
            if (!this.unitOutcomes.has(expected.index)) {
                this.unitOutcomes.set(expected.index, false)
            }
            this.recordClusterPress(expected.graphemeIndex, code, modifier, normalizedChar)
            // A modifier/shift error is the right physical key with the wrong
            // Shift state (e.g. lowercase when uppercase was expected). A same-key
            // wrong-script press (typed `u` for expected `က`) is a content error.
            const errorKind: 'key' | 'modifier' = codeMatches && modifier !== expected.modifier ? 'modifier' : 'key'
            if (errorKind === 'modifier') {
                this.shiftErrorCount += 1
            }
            this.recordWrongPress(expected, code, modifier)
            this.emit({ type: 'incorrect', unitIndex: expected.index, keyCode: code, modifier, expected, errorKind })
        }
        return this.lastEvent
    }

    finish(reason: FinishReason) {
        if (this.status === 'finished') return
        this.status = 'finished'
        this.finishReason = reason
        this.stopwatch.finish()
        const metrics = this.currentMetrics()
        this.emit({ type: reason === 'time-up' ? 'time-up' : 'finish', unitIndex: this.unitIndex, metrics, reason })
    }

    resetMetrics() {
        this.unitIndex = 0
        this.correctCount = 0
        this.incorrectCount = 0
        this.backspaceCount = 0
        this.shiftErrorCount = 0
        this.totalKeys = 0
        this.unitOutcomes.clear()
        this.keyOutcomes.clear()
        this.wrongPresses.clear()
        this.correctTimes.length = 0
        this.clusterDiagnoses.clear()
        this.clusterTypedChars.clear()
        this.stopwatch.reset()
        this.status = 'ready'
        this.finishReason = null
        this.lastEvent = null
    }

    restart() {
        this.resetMetrics()
        this.emit({ type: 'restart', unitIndex: 0 })
    }

    private recordWrongPress(expected: TypingUnit, code: string, modifier: Modifier) {
        const expectedId = `${expected.keyCode}:${expected.modifier}`
        const pressedId = `${code}:${modifier}`
        let perPressed = this.wrongPresses.get(expectedId)
        if (!perPressed) {
            perPressed = new Map()
            this.wrongPresses.set(expectedId, perPressed)
        }
        perPressed.set(pressedId, (perPressed.get(pressedId) ?? 0) + 1)
    }

    private recordClusterPress(graphemeIndex: number, code: string, modifier: Modifier, character?: string | null) {
        if (this.layout.language === 'english') return
        const expectedGrapheme = this.sequence.graphemes[graphemeIndex]
        if (!containsMyanmar(expectedGrapheme)) return
        // Use the actually-typed character when available (the only reliable
        // signal for mixed-script work), otherwise fall back to layout output.
        const text = character != null && character.length > 0 ? character : this.layout.outputFor(code, modifier)?.text
        if (text == null || text.length === 0) return
        const chars = this.clusterTypedChars.get(graphemeIndex) ?? []
        chars.push(text)
        this.clusterTypedChars.set(graphemeIndex, chars)
        // Once the cluster is fully consumed, classify what was actually typed
        // so the result screen can explain recurring slips.
        const [, end] = this.sequence.graphemeUnitRanges[graphemeIndex]
        if (this.unitIndex >= end && !this.clusterDiagnoses.has(graphemeIndex)) {
            const expected = expectedGrapheme
            const typed = chars.join('')
            const expectedInput = containsMyanmar(expected) ? keyboardOrderForCluster(expected) : expected
            this.clusterDiagnoses.set(graphemeIndex, diagnoseClusterComparison(expectedInput, typed))
        }
    }

    // Drop per-cluster diagnosis/chars for every grapheme containing or after
    // a rewritten unit so a partially rewound grapheme keeps no stale press run.
    private clearClusterStateFromUnit(fromUnit: number) {
        const ranges = this.sequence.graphemeUnitRanges
        for (let gi = 0; gi < ranges.length; gi++) {
            const [, end] = ranges[gi]
            if (end > fromUnit) {
                this.clusterDiagnoses.delete(gi)
                this.clusterTypedChars.delete(gi)
            }
        }
    }
}

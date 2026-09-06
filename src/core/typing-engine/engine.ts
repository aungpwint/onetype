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
    /** Expected key id → (pressed key id → count), for the result screen's miskey pairs. */
    readonly wrongPresses = new Map<string, Map<string, number>>()
    private readonly unitOutcomes = new Map<number, boolean>()
    private readonly stopwatch: Stopwatch
    private readonly listeners: EngineListener[] = []
    /** Elapsed-ms timestamp of every correct keystroke, for pacing consistency. */
    readonly correctTimes: number[] = []
    /** Per-grapheme Myanmar comparison diagnosis once a cluster is fully typed. */
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
            language: this.layout.language === 'myanmar' ? 'myanmar' : 'english',
            clusters: this.completedClusters(),
            correctTimes: this.correctTimes,
        })
    }

    /** Number of grapheme clusters fully consumed by the caret. */
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

    /** Diagnoses in display (grapheme) order. */
    diagnoseClusters(): ClusterDiagnosis[] {
        const out: ClusterDiagnosis[] = []
        for (let gi = 0; gi < this.sequence.graphemes.length; gi++) {
            const d = this.clusterDiagnoses.get(gi)
            if (d) out.push(d)
        }
        return out
    }

    processKey(code: string, modifier: Modifier): TypingEngineEvent | null {
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
            // Backspace is unit-granular: it reverses exactly ONE typing unit —
            // the current unit when it holds a (recoverable) wrong attempt,
            // otherwise the last consumed unit. A multi-unit Myanmar grapheme
            // therefore unwinds unit-by-unit: its consumed slots flip back to
            // current/pending immediately and no stale outcome is left behind.
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

        const keyMatches = code === expected.keyCode
        const isCorrect = keyMatches && modifier === expected.modifier

        if (isCorrect) {
            outcome.correct += 1
            this.keyOutcomes.set(keyKey, outcome)
            this.correctCount += 1
            this.unitOutcomes.set(expected.index, true)
            this.correctTimes.push(this.stopwatch.elapsedMs())
            this.unitIndex += 1
            // Recorded after the advance so a fully-consumed cluster can be
            // classified immediately; wrong presses meanwhile accumulate into
            // the cluster's typed run without consuming it.
            this.recordClusterPress(expected.graphemeIndex, code, modifier)
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
            this.recordClusterPress(expected.graphemeIndex, code, modifier)
            // Classify the error. A modifier/shift error happens when the learner
            // pressed the correct physical key but with the wrong Shift state
            // (e.g. lowercase when uppercase was expected). This is a distinct,
            // trackable weakness.
            const errorKind: 'key' | 'modifier' = keyMatches && modifier !== expected.modifier ? 'modifier' : 'key'
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

    /** Restart the current run in place: exact same text, fully fresh metrics. */
    restart() {
        this.resetMetrics()
        this.emit({ type: 'restart', unitIndex: 0 })
    }

    /** Expect-to-pressed pairing for a wrong keystroke. */
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

    private recordClusterPress(graphemeIndex: number, code: string, modifier: Modifier) {
        if (this.layout.language !== 'myanmar') return
        const output = this.layout.outputFor(code, modifier)
        if (!output) return
        const chars = this.clusterTypedChars.get(graphemeIndex) ?? []
        chars.push(output.text)
        this.clusterTypedChars.set(graphemeIndex, chars)
        // Once the whole cluster has been consumed, classify what the learner
        // actually produced for that cluster so the result screen can explain
        // the recurring slips (missing tone mark, extra medial, swapped order…).
        const [, end] = this.sequence.graphemeUnitRanges[graphemeIndex]
        if (this.unitIndex >= end && !this.clusterDiagnoses.has(graphemeIndex)) {
            const expected = this.sequence.graphemes[graphemeIndex]
            const typed = chars.join('')
            const expectedInput = containsMyanmar(expected) ? keyboardOrderForCluster(expected) : expected
            this.clusterDiagnoses.set(graphemeIndex, diagnoseClusterComparison(expectedInput, typed))
        }
    }

    /** Drop per-cluster diagnosis/chars for every grapheme containing or after
        a rewritten unit. A partially rewound grapheme must not keep a stale
        diagnosis or old press run (the unit's erased press is gone for good). */
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

import { describe, expect, it } from 'vitest'
import { computeScore, speedSeries, type ScoreMetrics } from '@/core/scoring/score'

import { buildSequence, graphemeUnitRuns } from '@/core/typing-engine/sequence'
import { TypingEngine } from '@/core/typing-engine/engine'
import { englishQwerty } from '@/core/keyboard-layout/english-qwerty'
import { myanmar } from '@/core/keyboard-layout/myanmar'
import { shiftHandFor } from '@/core/keyboard-layout/layout'
import { resolveLessonById } from '@/data/curriculum'

describe('scoring', () => {
    it('computes accuracy and WPM', () => {
        const metrics = computeScore({
            correctAttempts: 50,
            incorrectAttempts: 5,
            backspaceCount: 0,
            elapsedSeconds: 60,
        })
        expect(metrics.accuracy).toBeCloseTo((50 / 55) * 100, 5)
        expect(metrics.grossWpm).toBeCloseTo(50 / 5, 5)
        expect(metrics.cpm).toBeCloseTo(50, 5)
    })

    it('marks passing/failing against rules', () => {
        const ok = computeScore({ correctAttempts: 150, incorrectAttempts: 2, backspaceCount: 0, elapsedSeconds: 60 })
        expect(ok.accuracy).toBeGreaterThanOrEqual(90)
        expect(ok.grossWpm).toBeGreaterThan(20)
        expect(ok.grossWpm).toBeCloseTo(30, 5)
    })

    it('builds a per-second pacing series in WPM for English', () => {
        const times = [100, 300, 1500, 2200, 4100]
        const series = speedSeries({ correctAttempts: 5, incorrectAttempts: 0, backspaceCount: 0, elapsedSeconds: 5, language: 'english', correctTimes: times })
        expect(series).toHaveLength(5)
        expect(series[0]).toBeCloseTo(24, 5) // 2 correct in the first second → 120 raw wpm / 5
        expect(series[1]).toBeCloseTo(12, 5) // 1500
        expect(series[2]).toBeCloseTo(12, 5) // 2200
        expect(series[3]).toBe(0)
        expect(series[4]).toBeCloseTo(12, 5) // 4100
    })

    it('builds a per-second pacing series in typing units for Myanmar', () => {
        const times = [100, 300, 1500, 2200, 4100]
        const series = speedSeries({ correctAttempts: 5, incorrectAttempts: 0, backspaceCount: 0, elapsedSeconds: 5, language: 'myanmar', correctTimes: times })
        expect(series[0]).toBeCloseTo(120, 5) // 2 units in the first second → 120 units/min
        expect(series[1]).toBeCloseTo(60, 5)
        expect(series[2]).toBeCloseTo(60, 5)
        expect(series[3]).toBe(0)
        expect(series[4]).toBeCloseTo(60, 5)
    })

    it('keeps a sub-second run to a single populated bucket', () => {
        const times = [100]
        const series = speedSeries({ correctAttempts: 1, incorrectAttempts: 0, backspaceCount: 0, elapsedSeconds: 0.4, language: 'english', correctTimes: times })
        expect(series).toHaveLength(1)
        expect(series[0]).toBeCloseTo(30, 5)
    })
})

describe('sequence building', () => {
    it('builds units for English text', () => {
        const seq = buildSequence('cat', englishQwerty)
        expect(seq.units.map((u) => u.keyCode)).toEqual(['KeyC', 'KeyA', 'KeyT'])
        expect(seq.charCount).toBe(3)
    })

    it('builds units for a Myanmar word', () => {
        const word = '\u1031\u1000\u103B\u102C\u1004\u103A\u1038'
        const seq = buildSequence(word, myanmar)
        expect(seq.units.map((u) => u.keyCode)).toEqual(['KeyA', 'KeyU', 'KeyS', 'KeyM', 'KeyI', 'KeyF', 'Semicolon'])
        expect(seq.units.map((u) => u.text).join('')).toBe(word)
    })
})

describe('typing unit model', () => {
    it('maps English lowercase to single units with correct hand/finger', () => {
        const seq = buildSequence('fj', englishQwerty)
        expect(seq.units).toHaveLength(2)
        expect(seq.units[0].hand).toBe('left')
        expect(seq.units[0].finger).toBe('left-index')
        expect(seq.units[1].hand).toBe('right')
        expect(seq.units[1].finger).toBe('right-index')
        expect(seq.units[0].shiftHand).toBeNull()
        expect(seq.units[1].shiftHand).toBeNull()
    })

    it('reports correct shiftHand for uppercase letters', () => {
        const seq = buildSequence('A', englishQwerty)
        const unit = seq.units[0]
        expect(unit.modifier).toBe('shift')
        expect(unit.hand).toBe('left')
        expect(unit.shiftHand).toBe('right')
    })

    it('derives shiftHand consistently with shiftHandFor', () => {
        const seq = buildSequence('Aa', englishQwerty)
        expect(seq.units[0].shiftHand).toBe(shiftHandFor('left'))
        expect(seq.units[1].shiftHand).toBeNull()
        const right = buildSequence('Z', englishQwerty)
        expect(right.units[0].shiftHand).toBe(shiftHandFor('left'))
        const left = buildSequence('M', englishQwerty)
        expect(left.units[0].shiftHand).toBe(shiftHandFor('right'))
    })

    it('maps Myanmar combining sequences onto one typing unit per code point', () => {
        const word = '\u1031\u1000\u103B\u102C\u1004\u103A\u1038'
        const seq = buildSequence(word, myanmar)
        expect(seq.units.map((u) => u.text).join('')).toBe(word)
        expect(seq.graphemes.join('')).toBe(word)
        expect(seq.units).toHaveLength(seq.graphemes.join('').length)
        for (const unit of seq.units) {
            expect(unit.hand === 'left' || unit.hand === 'right').toBe(true)
        }
    })

    it('handles stacked Myanmar consonants as separate units', () => {
        const stacked = '\u1018\u1039\u1018\u102C' as const
        const seq = buildSequence(stacked, myanmar)
        expect(seq.units.length).toBeGreaterThanOrEqual(4)
        for (const unit of seq.units) {
            expect(unit.keyCode).toBeTruthy()
            expect(unit.hand === 'left' || unit.hand === 'right').toBe(true)
            expect(unit.finger).toBeTruthy()
        }
    })
})

describe('grapheme unit runs', () => {
    it('covers every unit of a resolved multi-phase lesson without going out of bounds', () => {
        for (const id of ['lesson-my-beginner-1', 'lesson-my-beginner-5', 'lesson-en-beginner-18']) {
            const resolved = resolveLessonById(id)
            const runs = graphemeUnitRuns(resolved.sequence)
            expect(runs.length).toBe(resolved.sequence.graphemes.length)
            expect(runs[0].startUnit).toBe(0)
            expect(runs[runs.length - 1].endUnit).toBe(resolved.sequence.units.length)
            for (const run of runs) {
                expect(run.startUnit).toBeGreaterThanOrEqual(0)
                expect(run.endUnit).toBeGreaterThanOrEqual(run.startUnit)
            }
        }
    })

    it('groups Myanmar composite graphemes so each unit maps to exactly one run', () => {
        const word = '\u1031\u1000\u103B\u102C\u1004\u103A\u1038'
        const seq = buildSequence(word, myanmar)
        const runs = graphemeUnitRuns(seq)
        expect(runs.length).toBe(seq.graphemes.length)
        expect(runs[0].startUnit).toBe(0)
        expect(runs[runs.length - 1].endUnit).toBe(seq.units.length)
        for (let i = 0; i < runs.length; i++) {
            if (i > 0) expect(runs[i].startUnit).toBe(runs[i - 1].endUnit)
            expect(runs[i].text).toBe(seq.graphemes[runs[i].index])
        }
        expect(runs.map((r) => r.text).join('')).toBe(word)
        expect(runs.reduce((acc, r) => acc + (r.endUnit - r.startUnit), 0)).toBe(seq.units.length)
    })

    it('keeps runs inside a single grapheme so phase text renders intact', () => {
        // Regression: a run must be bounded by its grapheme's unit range, not by
        // text equality. When one phase ends with ";" and the next starts with ";",
        // grouping by text merged the two into a run that spilled past the phase
        // boundary (endUnit > endUnit), so TargetText's phase filter dropped the
        // trailing ";" and the learner could not see the final character.
        const resolved = resolveLessonById('lesson-en-beginner-3')
        for (const phase of resolved.phases) {
            const runs = graphemeUnitRuns(resolved.sequence).filter((g) => g.startUnit >= phase.startUnit && g.endUnit <= phase.endUnit)
            expect(runs.map((r) => r.text).join('')).toBe(phase.text)
            const minStart = Math.min(...runs.map((r) => r.startUnit))
            const maxEnd = Math.max(...runs.map((r) => r.endUnit))
            expect(minStart).toBe(phase.startUnit)
            expect(maxEnd).toBe(phase.endUnit)
        }
    })

    it('produces one run per repeated grapheme instead of merging them', () => {
        const seq = buildSequence('hello', englishQwerty)
        const runs = graphemeUnitRuns(seq)
        expect(runs.map((r) => r.text)).toEqual(['h', 'e', 'l', 'l', 'o'])
        for (const run of runs) {
            expect(run.endUnit).toBeGreaterThan(run.startUnit)
        }
    })
})

describe('typing engine', () => {
    it('advances on correct keys and ignores wrong keys', () => {
        const seq = buildSequence('cat', englishQwerty)
        const engine = new TypingEngine({ sequence: seq, layout: englishQwerty })
        engine.processKey('KeyX', 'none')
        expect(engine.unitIndex).toBe(0)
        expect(engine.incorrectCount).toBe(1)
        engine.processKey('KeyC', 'none')
        engine.processKey('KeyA', 'none')
        engine.processKey('KeyT', 'none')
        expect(engine.unitIndex).toBe(3)
        expect(engine.status).toBe('finished')
        expect(engine.finishReason).toBe('completed')
    })

    it('requires shift for uppercase letters', () => {
        const seq = buildSequence('Cat', englishQwerty)
        const engine = new TypingEngine({ sequence: seq, layout: englishQwerty })
        engine.processKey('KeyC', 'shift')
        engine.processKey('KeyA', 'none')
        engine.processKey('KeyT', 'none')
        expect(engine.status).toBe('finished')
        expect(engine.correctCount).toBe(3)
    })

    it('counts backspaces and steps back one unit for correction', () => {
        const seq = buildSequence('cat', englishQwerty)
        const engine = new TypingEngine({ sequence: seq, layout: englishQwerty })
        engine.processKey('KeyC', 'none')
        expect(engine.unitIndex).toBe(1)
        engine.processKey('Backspace', 'none')
        expect(engine.backspaceCount).toBe(1)
        expect(engine.unitIndex).toBe(0)
        // Re-typing after stepping back works
        engine.processKey('KeyC', 'none')
        engine.processKey('KeyA', 'none')
        engine.processKey('KeyT', 'none')
        expect(engine.unitIndex).toBe(3)
        expect(engine.status).toBe('finished')
        expect(engine.finishReason).toBe('completed')
    })

    it('backspace at the start is a no-op and does not crash', () => {
        const seq = buildSequence('cat', englishQwerty)
        const engine = new TypingEngine({ sequence: seq, layout: englishQwerty })
        engine.processKey('Backspace', 'none')
        expect(engine.backspaceCount).toBe(1)
        expect(engine.unitIndex).toBe(0)
        expect(engine.status).toBe('running')
    })

    it('backspace clears the errored state so a correction is not recounted as an error', () => {
        const seq = buildSequence('cat', englishQwerty)
        const engine = new TypingEngine({ sequence: seq, layout: englishQwerty })
        engine.processKey('KeyX', 'none') // wrong, unitIndex stays 0, marked incorrect
        expect(engine.incorrectCount).toBe(1)
        expect(engine.unitOutcomeAt(0)).toBe('incorrect')
        engine.processKey('Backspace', 'none') // correction gesture
        engine.processKey('KeyC', 'none') // now correct
        expect(engine.incorrectCount).toBe(1) // the original error is retained
        expect(engine.correctCount).toBe(1)
        expect(engine.unitOutcomeAt(0)).toBe('correct') // re-typed => correct outcome
        expect(engine.unitIndex).toBe(1)
    })

    it('backspace is cluster-aware for Myanmar: deletes a whole syllable cluster', () => {
        // "ကိျာ" is one syllable cluster (base + medial + vowels) -> 4 units.
        const word = '\u1000\u102D\u103B\u102C'
        const seq = buildSequence(word, myanmar)
        expect(seq.units.length).toBe(4)
        expect(seq.graphemes).toHaveLength(1) // one cluster
        const engine = new TypingEngine({ sequence: seq, layout: myanmar })
        engine.processKey('KeyU', 'none')
        engine.processKey('KeyD', 'none')
        engine.processKey('KeyS', 'none')
        expect(engine.unitIndex).toBe(3)
        // A single Backspace removes the entire cluster, not one mark.
        engine.processKey('Backspace', 'none')
        expect(engine.unitIndex).toBe(0)
        // Rebuild fully to completion (remaining keys are KeyU, KeyD, KeyS, KeyM)
        engine.processKey('KeyU', 'none')
        engine.processKey('KeyD', 'none')
        engine.processKey('KeyS', 'none')
        engine.processKey('KeyM', 'none')
        expect(engine.unitIndex).toBe(4)
        expect(engine.correctCount).toBe(7)
        expect(engine.status).toBe('finished')
    })

    it('backspace steps back to the previous cluster boundary for multi-cluster Myanmar', () => {
        // "ကာ သုံ" -> three clusters: [ကာ][space][သုံ]
        const two = buildSequence('\u1000\u102C \u101E\u102F\u1036', myanmar)
        expect(two.graphemes).toHaveLength(3) // "ကာ", " ", "သုံ"
        const engine = new TypingEngine({ sequence: two, layout: myanmar })
        // Type the first cluster: ကာ (KeyU, KeyM)
        engine.processKey('KeyU', 'none')
        engine.processKey('KeyM', 'none')
        // Space unit
        engine.processKey('Space', 'none')
        // Partial start of second cluster: သု (KeyO, KeyK)
        engine.processKey('KeyO', 'none')
        engine.processKey('KeyK', 'none')
        expect(engine.unitIndex).toBe(5)
        // Backspace removes the partial/whole second cluster back to the space.
        engine.processKey('Backspace', 'none')
        expect(engine.unitIndex).toBe(3)
    })

    it('supports timed tests that finish when the timer expires', () => {
        let now = 0
        const clock = () => {
            now += 25
            return now
        }
        const seq = buildSequence('cat', englishQwerty)
        const engine = new TypingEngine({ sequence: seq, layout: englishQwerty, durationSeconds: 10, now: clock })
        engine.processKey('KeyC', 'none')
        // Slow-timer resilience: a backgrounded/frozen tab's wall clock cannot
        // silently inflate a round. A single frozen 60s jump credits only the
        // burst budget, so the round stays running until honest time accrues.
        now = 60_000
        engine.processKey('KeyA', 'none')
        expect(engine.status).toBe('running')
        // Honest time now accrues in normal small steps until the timer expires.
        while (engine.status !== 'finished') {
            now += 500
            engine.processKey('Space', 'none')
        }
        expect(engine.finishReason).toBe('time-up')
        expect(engine.unitIndex).toBe(2)
    })

    it('classifies a modifier error when pressing the right key with the wrong Shift state', () => {
        const seq = buildSequence('A', englishQwerty)
        const engine = new TypingEngine({ sequence: seq, layout: englishQwerty })
        // lowercase when uppercase expected -> modifier (shift) error
        engine.processKey('KeyA', 'none')
        expect(engine.incorrectCount).toBe(1)
        expect(engine.shiftErrorCount).toBe(1)
        expect(engine.lastEvent?.errorKind).toBe('modifier')
        expect(engine.unitIndex).toBe(0)
        // Now correct press
        engine.processKey('KeyA', 'shift')
        expect(engine.correctCount).toBe(1)
        expect(engine.unitIndex).toBe(1)
        expect(engine.status).toBe('finished')
    })

    it('does not count a wrong key as a shift error', () => {
        const seq = buildSequence('A', englishQwerty)
        const engine = new TypingEngine({ sequence: seq, layout: englishQwerty })
        engine.processKey('KeyB', 'none')
        expect(engine.shiftErrorCount).toBe(0)
        expect(engine.lastEvent?.errorKind).toBe('key')
    })

    it('requires shift for a symbol produced by a shift modifier', () => {
        const seq = buildSequence('@', englishQwerty)
        const engine = new TypingEngine({ sequence: seq, layout: englishQwerty })
        // Shift+Digit2 produces @
        engine.processKey('Digit2', 'shift')
        expect(engine.correctCount).toBe(1)
        expect(engine.unitIndex).toBe(1)
        expect(engine.status).toBe('finished')
    })

    it('rejects plain keypress when a shifted symbol is expected', () => {
        const seq = buildSequence('@', englishQwerty)
        const engine = new TypingEngine({ sequence: seq, layout: englishQwerty })
        engine.processKey('Digit2', 'none')
        expect(engine.shiftErrorCount).toBe(1)
        expect(engine.unitIndex).toBe(0)
    })

    it('handles mixed-case words requiring separate shift presses', () => {
        const seq = buildSequence('Aa', englishQwerty)
        const engine = new TypingEngine({ sequence: seq, layout: englishQwerty })
        engine.processKey('KeyA', 'shift')
        engine.processKey('KeyA', 'none')
        expect(engine.correctCount).toBe(2)
        expect(engine.unitIndex).toBe(2)
        expect(engine.status).toBe('finished')
    })

    it('ignores keys when paused and resumes cleanly', () => {
        const seq = buildSequence('cat', englishQwerty)
        const engine = new TypingEngine({ sequence: seq, layout: englishQwerty })
        engine.processKey('KeyC', 'none') // auto-starts
        expect(engine.status).toBe('running')
        engine.pause()
        expect(engine.status).toBe('paused')
        engine.processKey('KeyA', 'none') // should be ignored while paused
        expect(engine.unitIndex).toBe(1)
        expect(engine.correctCount).toBe(1)
        engine.resume()
        engine.processKey('KeyA', 'none')
        engine.processKey('KeyT', 'none')
        expect(engine.status).toBe('finished')
        expect(engine.unitIndex).toBe(3)
    })

    it('excludes paused time from elapsed seconds', () => {
        let now = 1000
        const clock = () => now
        const seq = buildSequence('cat', englishQwerty)
        const engine = new TypingEngine({ sequence: seq, layout: englishQwerty, now: clock })
        engine.start()
        now = 3000
        engine.pause()
        now = 13_000 // 10s of paused time
        engine.resume()
        expect(engine.elapsedSeconds()).toBe(2)
    })

    it('records per-key outcomes with the correct modifier', () => {
        const seq = buildSequence('Cat', englishQwerty)
        const engine = new TypingEngine({ sequence: seq, layout: englishQwerty })
        engine.processKey('KeyC', 'shift') // correct
        engine.processKey('KeyA', 'none') // correct
        engine.processKey('KeyT', 'none') // correct
        expect(engine.keyOutcomes.get('KeyC:shift')).toEqual({ correct: 1, incorrect: 0 })
        expect(engine.keyOutcomes.get('KeyA:none')).toEqual({ correct: 1, incorrect: 0 })
        expect(engine.totalKeys).toBe(3)
    })

    it('tracks wrong-key outcomes under their own key/modifier', () => {
        const seq = buildSequence('cat', englishQwerty)
        const engine = new TypingEngine({ sequence: seq, layout: englishQwerty })
        engine.processKey('KeyX', 'none') // wrong
        engine.processKey('KeyC', 'none') // correct
        expect(engine.keyOutcomes.get('KeyX:none')).toEqual({ correct: 0, incorrect: 1 })
        expect(engine.keyOutcomes.get('KeyC:none')).toEqual({ correct: 1, incorrect: 0 })
        expect(engine.totalKeys).toBe(2)
    })

    it('exposes attempts as the sum of correct and incorrect', () => {
        const seq = buildSequence('cat', englishQwerty)
        const engine = new TypingEngine({ sequence: seq, layout: englishQwerty })
        engine.processKey('KeyX', 'none')
        engine.processKey('KeyC', 'none')
        expect(engine.attempts).toBe(2)
    })

    it('emits a finish event carrying final metrics', () => {
        const seq = buildSequence('cat', englishQwerty)
        let finishMetrics: ScoreMetrics | undefined
        const events: string[] = []
        const engine = new TypingEngine({
            sequence: seq,
            layout: englishQwerty,
            onEvent: (ev) => {
                events.push(ev.type)
                if (ev.type === 'finish') finishMetrics = ev.metrics
            },
        })
        engine.processKey('KeyC', 'none')
        engine.processKey('KeyA', 'none')
        engine.processKey('KeyT', 'none')
        expect(events).toContain('correct')
        expect(events).toContain('finish')
        expect(finishMetrics).toBeDefined()
        expect(finishMetrics!.correctAttempts).toBe(3)
        expect(finishMetrics!.incorrectAttempts).toBe(0)
    })

    it('does not double-fire events after completion', () => {
        const seq = buildSequence('a', englishQwerty)
        let finishCount = 0
        const engine = new TypingEngine({
            sequence: seq,
            layout: englishQwerty,
            onEvent: (ev) => {
                if (ev.type === 'finish') finishCount += 1
            },
        })
        engine.processKey('KeyA', 'none')
        engine.processKey('KeyA', 'none')
        engine.processKey('KeyA', 'none')
        expect(finishCount).toBe(1)
        expect(engine.status).toBe('finished')
    })

    it('resetMetrics restores a fresh engine ready for a new run', () => {
        const seq = buildSequence('cat', englishQwerty)
        const engine = new TypingEngine({ sequence: seq, layout: englishQwerty })
        engine.processKey('KeyC', 'none')
        engine.processKey('KeyA', 'none')
        engine.processKey('KeyT', 'none')
        expect(engine.status).toBe('finished')
        engine.resetMetrics()
        expect(engine.status).toBe('ready')
        expect(engine.unitIndex).toBe(0)
        expect(engine.correctCount).toBe(0)
        expect(engine.shiftErrorCount).toBe(0)
        expect(engine.totalKeys).toBe(0)
        expect(engine.keyOutcomes.size).toBe(0)
    })

    it('handles an empty sequence gracefully', () => {
        const seq = buildSequence('', englishQwerty)
        const engine = new TypingEngine({ sequence: seq, layout: englishQwerty })
        engine.processKey('KeyA', 'none')
        expect(engine.status).toBe('finished')
        expect(engine.finishReason).toBe('completed')
        expect(engine.unitIndex).toBe(0)
    })
})

describe('engine language-aware metrics', () => {
    it('reports Myanmar speed in typing units with cluster count', () => {
        const seq = buildSequence('\u1039\u1000\u103B\u102C\u1019\u103A\u1038', myanmar)
        const engine = new TypingEngine({ sequence: seq, layout: myanmar })
        for (const unit of seq.units) {
            engine.processKey(unit.keyCode, unit.modifier)
        }
        const metrics = engine.currentMetrics()
        expect(metrics.language).toBe('myanmar')
        expect(metrics.speedUnit).toBe('units/min')
        expect(metrics.graphemeClusters).toBe(seq.graphemes.length)
        expect(metrics.correctAttempts).toBe(seq.units.length)
    })

    it('tracks pacing consistency from correct keystroke times', () => {
        let clock = 0
        const now = () => clock
        const seq = buildSequence('steady typing test', englishQwerty)
        const engine = new TypingEngine({ sequence: seq, layout: englishQwerty, now })
        for (const unit of seq.units) {
            clock += 80
            engine.processKey(unit.keyCode, unit.modifier)
        }
        const metrics = engine.currentMetrics()
        expect(metrics.consistency).toBeGreaterThanOrEqual(60)
    })
})

describe('engine Myanmar cluster diagnosis', () => {
    it('classifies a correctly typed cluster as ok', () => {
        // မြ = U+1019 (မ, KeyR) + U+103C (ြ, KeyJ)
        const seq = buildSequence('\u1019\u103C', myanmar)
        const engine = new TypingEngine({ sequence: seq, layout: myanmar })
        engine.processKey('KeyR', 'none')
        engine.processKey('KeyJ', 'none')
        const diagnosis = engine.clusterDiagnosisFor(0)
        expect(diagnosis?.kind).toBe('ok')
    })

    it('flags a corrected wrong medial press as an extra mark', () => {
        // Expected မြ, learner first pressed ျ (KeyS) then corrected with ြ (KeyJ).
        // The stray press is preserved in the cluster's typed run and surfaces
        // as an extra medial in the diagnosis.
        const seq = buildSequence('\u1019\u103C', myanmar)
        const engine = new TypingEngine({ sequence: seq, layout: myanmar })
        engine.processKey('KeyR', 'none')
        engine.processKey('KeyS', 'none')
        expect(engine.clusterDiagnosisFor(0)).toBeNull()
        engine.processKey('KeyJ', 'none')
        const diagnosis = engine.clusterDiagnosisFor(0)
        expect(diagnosis?.kind).toBe('extra-mark')
        expect(diagnosis?.extra.join('')).toBe('\u103B')
    })

    it('clears a cluster diagnosis when backspace rewinds it', () => {
        // Two identical clusters to keep the run alive while we rewind.
        const seq = buildSequence('\u1019\u103C\u1019\u103C', myanmar)
        const engine = new TypingEngine({ sequence: seq, layout: myanmar })
        engine.processKey('KeyR', 'none')
        engine.processKey('KeyS', 'none')
        engine.processKey('KeyJ', 'none')
        expect(engine.clusterDiagnosisFor(0)?.kind).toBe('extra-mark')
        expect(engine.unitIndex).toBe(2)
        engine.processKey('Backspace', 'none')
        expect(engine.clusterDiagnosisFor(0)).toBeNull()
        expect(engine.unitIndex).toBe(0)
        engine.processKey('KeyR', 'none')
        engine.processKey('KeyJ', 'none')
        expect(engine.clusterDiagnosisFor(0)?.kind).toBe('ok')
    })

    it('grades a pre-base vowel cluster correctly in keyboard press order', () => {
        // Stored logical ရေ = U+101B U+1031; press order is U+1031 (KeyA) then U+101B (Shift+Digit7).
        const seq = buildSequence('\u101B\u1031', myanmar)
        expect(seq.units.map((u) => u.keyCode)).toEqual(['KeyA', 'Digit7'])
        expect(seq.units[1].modifier).toBe('shift')
        const engine = new TypingEngine({ sequence: seq, layout: myanmar })
        engine.processKey('KeyA', 'none')
        engine.processKey('Digit7', 'shift')
        expect(engine.clusterDiagnosisFor(0)?.kind).toBe('ok')
    })

    it('restart resets every metric and emits a restart event', () => {
        const seq = buildSequence('cat', englishQwerty)
        const events: string[] = []
        const engine = new TypingEngine({
            sequence: seq,
            layout: englishQwerty,
            onEvent: (event) => events.push(event.type),
        })
        engine.processKey('KeyX', 'none')
        engine.processKey('KeyC', 'none')
        expect(engine.unitIndex).toBe(1)
        expect(engine.correctCount).toBe(1)
        expect(engine.incorrectCount).toBe(1)

        engine.restart()
        expect(events[events.length - 1]).toBe('restart')
        expect(engine.status).toBe('ready')
        expect(engine.finishReason).toBeNull()
        expect(engine.unitIndex).toBe(0)
        expect(engine.correctCount).toBe(0)
        expect(engine.incorrectCount).toBe(0)
        expect(engine.backspaceCount).toBe(0)
        expect(engine.shiftErrorCount).toBe(0)
        expect(engine.totalKeys).toBe(0)
        expect(engine.correctTimes).toHaveLength(0)

        // The same engine is fully usable after restart.
        engine.processKey('KeyC', 'none')
        engine.processKey('KeyA', 'none')
        engine.processKey('KeyT', 'none')
        expect(engine.status).toBe('finished')
        expect(engine.correctCount).toBe(3)
    })

    it('restart snaps the stopwatch back to zero instead of keeping the old run base', () => {
        let now = 0
        const clock = () => now
        const seq = buildSequence('cat', englishQwerty)
        const engine = new TypingEngine({ sequence: seq, layout: englishQwerty, now: clock })
        now = 1_000
        engine.processKey('KeyX', 'none')
        engine.processKey('KeyC', 'none')
        expect(engine.correctTimes).toHaveLength(1)
        expect(engine.correctTimes[0]).toBe(0)

        engine.restart()
        expect(engine.correctTimes).toHaveLength(0)

        // If the stopwatch were not reset, the correct timing would land at
        // 10_000 (relative to the first run's start); a fresh base starts at 0.
        now = 10_000
        engine.processKey('KeyC', 'none')
        engine.processKey('KeyA', 'none')
        engine.processKey('KeyT', 'none')
        expect(engine.status).toBe('finished')
        expect(engine.correctTimes).toHaveLength(3)
        expect(engine.correctTimes[0]).toBeLessThan(100)
    })
})

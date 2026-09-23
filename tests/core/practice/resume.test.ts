import { describe, it, expect } from 'vitest'
import {
    chooseLessonResumePoint,
    computeResumeCheckpoint,
    phaseContainingUnit,
    type LessonPhaseShape,
    type ResumeCheckpoint,
} from '@/core/practice/resume'

const phases: LessonPhaseShape[] = [
    { id: 'p1', startUnit: 0, endUnit: 20 },
    { id: 'p2', startUnit: 20, endUnit: 40 },
    { id: 'p3', startUnit: 40, endUnit: 60 },
]

const neverPassed = () => false

function checkpoint(mut: Partial<ResumeCheckpoint> = {}): ResumeCheckpoint {
    return {
        unit: 25,
        phaseId: 'p2',
        correct: 3,
        incorrect: 1,
        backspace: 2,
        startedAt: 1000,
        updatedAt: 2000,
        ...mut,
    }
}

describe('phaseContainingUnit', () => {
    it('locates the phase owning a unit, including exact boundaries', () => {
        expect(phaseContainingUnit(phases, 0)?.id).toBe('p1')
        expect(phaseContainingUnit(phases, 20)?.id).toBe('p2')
        expect(phaseContainingUnit(phases, 59)?.id).toBe('p3')
        expect(phaseContainingUnit(phases, 60)).toBeNull()
        expect(phaseContainingUnit(phases, -1)).toBeNull()
    })
})

describe('chooseLessonResumePoint', () => {
    it('starts a fresh lesson at unit zero without a checkpoint', () => {
        const choice = chooseLessonResumePoint({ phases, passes: neverPassed, checkpoint: null })
        expect(choice.startUnit).toBe(0)
        expect(choice.seed).toBeNull()
    })

    it('starts at the first not-yet-passed phase', () => {
        const choice = chooseLessonResumePoint({
            phases,
            passes: (id) => id === 'p1',
            checkpoint: null,
        })
        expect(choice.startUnit).toBe(20)
        expect(choice.seed).toBeNull()
    })

    it('resumes at an explicit exercise index, ignoring the checkpoint', () => {
        const choice = chooseLessonResumePoint({ phases, passes: neverPassed, checkpoint: checkpoint(), atIndex: 2 })
        expect(choice.startUnit).toBe(40)
        expect(choice.seed).toBeNull()
    })

    it('resumes at the checkpoint unit with its merged counts as the seed', () => {
        const cp = checkpoint()
        const choice = chooseLessonResumePoint({ phases, passes: neverPassed, checkpoint: cp })
        expect(choice.startUnit).toBe(25)
        expect(choice.seed).toEqual({ phaseId: 'p2', correct: 3, incorrect: 1, backspace: 2, startedAt: 1000 })
    })

    it('ignores a checkpoint inside an already-passed phase', () => {
        const choice = chooseLessonResumePoint({ phases, passes: (id) => id === 'p1' || id === 'p2', checkpoint: checkpoint() })
        expect(choice.startUnit).toBe(40)
        expect(choice.seed).toBeNull()
    })

    it('ignores a checkpoint when every phase already passed', () => {
        const choice = chooseLessonResumePoint({ phases, passes: () => true, checkpoint: checkpoint() })
        expect(choice.startUnit).toBe(0)
        expect(choice.seed).toBeNull()
    })

    it('falls back when the checkpoint phase id no longer matches its unit', () => {
        const choice = chooseLessonResumePoint({ phases, passes: neverPassed, checkpoint: checkpoint({ phaseId: 'p1' }) })
        expect(choice.startUnit).toBe(0)
        expect(choice.seed).toBeNull()
    })

    it('falls back when the checkpoint sits past the end of the lesson', () => {
        const choice = chooseLessonResumePoint({ phases, passes: neverPassed, checkpoint: checkpoint({ unit: 70 }) })
        expect(choice.startUnit).toBe(0)
        expect(choice.seed).toBeNull()
    })

    it('uses the checkpoint even when the unit sits in a later, still-pending phase', () => {
        // Learner continued past a failed phase inside a later exercise.
        const choice = chooseLessonResumePoint({ phases, passes: (id) => id === 'p1', checkpoint: checkpoint({ unit: 45, phaseId: 'p3' }) })
        expect(choice.startUnit).toBe(45)
        expect(choice.seed).not.toBeNull()
    })

    it('returns unit zero for an empty phase list', () => {
        const choice = chooseLessonResumePoint({ phases: [], passes: neverPassed, checkpoint: checkpoint() })
        expect(choice.startUnit).toBe(0)
        expect(choice.seed).toBeNull()
    })
})

describe('computeResumeCheckpoint', () => {
    const base = () => ({
        sessionCounters: { correct: 10, incorrect: 2, backspace: 1 },
        phaseBaseCounters: { correct: 0, incorrect: 0, backspace: 0 },
        seed: null,
        sessionStartedAt: 500,
        updatedAt: 9000,
    })

    it('returns null at the very start of a fresh run (no progress)', () => {
        const cp = computeResumeCheckpoint({
            unitIndex: 0,
            startUnit: 0,
            phase: phases[0],
            ...base(),
        })
        expect(cp).toBeNull()
    })

    it('persists the position and this-run counters', () => {
        const cp = computeResumeCheckpoint({
            unitIndex: 7,
            startUnit: 0,
            phase: phases[0],
            ...base(),
        })
        expect(cp).toEqual({
            unit: 7,
            phaseId: 'p1',
            correct: 10,
            incorrect: 2,
            backspace: 1,
            startedAt: 500,
            updatedAt: 9000,
        })
    })

    it('subtracts the counts captured at the preceding phase boundary', () => {
        const cp = computeResumeCheckpoint({
            unitIndex: 32,
            startUnit: 20,
            phase: phases[1],
            sessionCounters: { correct: 25, incorrect: 4, backspace: 3 },
            phaseBaseCounters: { correct: 20, incorrect: 2, backspace: 1 }, // phase p1 boundary
            seed: null,
            sessionStartedAt: 500,
            updatedAt: 9000,
        })
        expect(cp?.correct).toBe(5)
        expect(cp?.incorrect).toBe(2)
        expect(cp?.backspace).toBe(2)
        expect(cp?.unit).toBe(32)
    })

    it('merges a carried-over seed with this-run counters', () => {
        const cp = computeResumeCheckpoint({
            unitIndex: 30,
            startUnit: 25,
            phase: phases[1],
            sessionCounters: { correct: 4, incorrect: 1, backspace: 0 },
            phaseBaseCounters: { correct: 0, incorrect: 0, backspace: 0 },
            seed: { phaseId: 'p2', correct: 3, incorrect: 1, backspace: 2, startedAt: 1000 },
            sessionStartedAt: 500,
            updatedAt: 9000,
        })
        expect(cp?.correct).toBe(7)
        expect(cp?.incorrect).toBe(2)
        expect(cp?.backspace).toBe(2)
        expect(cp?.startedAt).toBe(1000)
    })

    it('returns null when already at the run start with no seed and no keys typed', () => {
        const cp = computeResumeCheckpoint({
            unitIndex: 25,
            startUnit: 25,
            phase: phases[1],
            sessionCounters: { correct: 0, incorrect: 0, backspace: 0 },
            phaseBaseCounters: { correct: 0, incorrect: 0, backspace: 0 },
            seed: null,
            sessionStartedAt: 500,
            updatedAt: 9000,
        })
        expect(cp).toBeNull()
    })

    it('returns null when the unit is outside the given phase', () => {
        const cp = computeResumeCheckpoint({
            unitIndex: 35,
            startUnit: 0,
            phase: phases[0],
            ...base(),
        })
        expect(cp).toBeNull()
    })
})
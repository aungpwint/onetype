export interface LessonPhaseShape {
    id: string
    startUnit: number
    endUnit: number
}

export interface ResumeCounters {
    correct: number
    incorrect: number
    backspace: number
}

/** Merged counts carried across sessions for the in-progress exercise. */
export interface ResumeSeed extends ResumeCounters {
    phaseId: string
    startedAt: number | null
}

/** A persisted mid-exercise position. */
export interface ResumeCheckpoint {
    unit: number
    phaseId: string | null
    correct: number
    incorrect: number
    backspace: number
    startedAt: number | null
    updatedAt: number
}

export function phaseContainingUnit(phases: LessonPhaseShape[], unit: number): LessonPhaseShape | null {
    return phases.find((p) => unit >= p.startUnit && unit < p.endUnit) ?? null
}

/**
 * Build the checkpoint to persist for the current engine position. Counters are
 * additive: this session's segment (engine totals minus the counts captured at
 * this phase's boundary) merges on top of any seed from an earlier segment, so
 * an exercise completed across sessions scores its full typed span.
 *
 * Returns null when there is nothing worth saving (no in-phase progress yet), so
 * fresh, never-touched lessons stay checkpoint-free.
 */
export function computeResumeCheckpoint(args: {
    unitIndex: number
    startUnit: number
    phase: LessonPhaseShape
    sessionCounters: ResumeCounters
    phaseBaseCounters: ResumeCounters
    seed: ResumeSeed | null
    sessionStartedAt: number
    updatedAt: number
}): ResumeCheckpoint | null {
    const { unitIndex, startUnit, phase, sessionCounters, phaseBaseCounters, seed, sessionStartedAt, updatedAt } = args
    if (unitIndex === 0) return null
    if (unitIndex < phase.startUnit || unitIndex >= phase.endUnit) return null
    const inPhase = {
        correct: Math.max(0, sessionCounters.correct - phaseBaseCounters.correct),
        incorrect: Math.max(0, sessionCounters.incorrect - phaseBaseCounters.incorrect),
        backspace: Math.max(0, sessionCounters.backspace - phaseBaseCounters.backspace),
    }
    const noSessionProgress =
        inPhase.correct === 0 && inPhase.incorrect === 0 && inPhase.backspace === 0 && unitIndex <= startUnit
    if (noSessionProgress && seed === null) return null
    return {
        unit: unitIndex,
        phaseId: phase.id,
        correct: (seed?.correct ?? 0) + inPhase.correct,
        incorrect: (seed?.incorrect ?? 0) + inPhase.incorrect,
        backspace: (seed?.backspace ?? 0) + inPhase.backspace,
        startedAt: seed?.startedAt ?? (inPhase.correct + inPhase.incorrect > 0 ? sessionStartedAt : null),
        updatedAt,
    }
}

/**
 * Decide where a lesson run should begin. `atIndex` (explicit exercise pick)
 * always wins and starts at that phase's boundary. Otherwise the first
 * not-yet-passed phase is the fallback, and a stored mid-exercise checkpoint is
 * honored only when it sits inside a phase that is still pending.
 */
export function chooseLessonResumePoint(args: {
    phases: LessonPhaseShape[]
    passes: (phaseId: string) => boolean
    checkpoint: ResumeCheckpoint | null
    atIndex?: number
}): { startUnit: number; seed: ResumeSeed | null } {
    const { phases, checkpoint, atIndex } = args
    if (phases.length === 0) return { startUnit: 0, seed: null }

    if (atIndex !== undefined) {
        const clamped = Math.max(0, Math.min(atIndex, phases.length - 1))
        return { startUnit: phases[clamped].startUnit, seed: null }
    }

    const firstUnpassed = phases.findIndex((p) => !args.passes(p.id))
    const defaultStart = firstUnpassed === -1 ? 0 : phases[firstUnpassed].startUnit
    if (!checkpoint || checkpoint.unit <= 0 || firstUnpassed === -1) {
        return { startUnit: defaultStart, seed: null }
    }

    const phase = phaseContainingUnit(phases, checkpoint.unit)
    if (!phase) return { startUnit: defaultStart, seed: null }

    const phaseIndex = phases.findIndex((p) => p.id === phase.id)
    if (phaseIndex < firstUnpassed || args.passes(phase.id)) {
        return { startUnit: defaultStart, seed: null }
    }
    if (checkpoint.phaseId !== null && checkpoint.phaseId !== phase.id) {
        return { startUnit: defaultStart, seed: null }
    }

    return {
        startUnit: checkpoint.unit,
        seed: {
            phaseId: phase.id,
            correct: checkpoint.correct,
            incorrect: checkpoint.incorrect,
            backspace: checkpoint.backspace,
            startedAt: checkpoint.startedAt,
        },
    }
}
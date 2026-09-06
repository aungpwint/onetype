import type { FingerId, Hand } from '@/types'
import type { KeyboardLayout } from '@/core/keyboard-layout/layout'
import { englishQwerty } from '@/core/keyboard-layout/english-qwerty'
import { buildSequence, type BuiltSequence } from '@/core/typing-engine/sequence'
import { handForFinger } from '@/core/finger-mapping/finger-map'
import {
    generateRepetitionDrill,
    generatePairDrill,
    generateFingerIsolationDrill,
    generateAlternationDrill,
    generateSameHandDrill,
    generateShiftDrill,
    generateRowTransitionDrill,
    type GeneratedDrill,
} from './generator'
import type { DrillConstraints } from './types'

export type MuscleMemoryGoal = 'finger-isolation' | 'hand-alternation' | 'same-hand' | 'shift' | 'row-transition' | 'repetition' | 'pair'

interface MuscleMemoryOptions {
    length?: number
    seed?: number
    constraints?: Partial<DrillConstraints>
    layout?: KeyboardLayout
}

export interface MuscleMemoryPlan {
    goal: MuscleMemoryGoal
    keys: string[]
    focusesFingers: FingerId[]
    focusesHands: Hand[]
    spaces: number
    drill: GeneratedDrill
    sequence: BuiltSequence
}

function fingersFor(keys: string[], layout: KeyboardLayout): FingerId[] {
    const set = new Set<FingerId>()
    for (const k of keys) {
        const lookup = layout.lookupChar(k)
        if (lookup) set.add(lookup.finger)
    }
    return [...set]
}

function handsFor(keys: string[], layout: KeyboardLayout): Hand[] {
    const set = new Set<Hand>()
    for (const f of fingersFor(keys, layout)) set.add(handForFinger(f))
    return [...set]
}

function rowOf(ch: string, layout: KeyboardLayout): 'number' | 'top' | 'home' | 'bottom' | 'space' {
    return layout.getKey(layout.lookupChar(ch)?.code ?? '')?.row ?? 'home'
}

function buildPlan(goal: MuscleMemoryGoal, drill: GeneratedDrill, layout: KeyboardLayout): MuscleMemoryPlan {
    const keys = [...new Set(drill.keys)]
    const text = drill.text
    const sequence = buildSequence(text, layout)
    const spaces = (text.match(/ /g) ?? []).length
    return {
        goal,
        keys,
        focusesFingers: fingersFor(keys, layout),
        focusesHands: handsFor(keys, layout),
        spaces,
        drill,
        sequence,
    }
}

export function planMuscleMemorySession(goal: MuscleMemoryGoal, focusKeys: string[], opts: MuscleMemoryOptions = {}): MuscleMemoryPlan {
    const layout = opts.layout ?? englishQwerty
    const length = opts.length ?? 20

    for (const k of focusKeys) {
        if (!layout.lookupChar(k)) {
            throw new Error(`Focus key "${k}" is not supported by the ${layout === englishQwerty ? 'English' : layout.id} layout`)
        }
    }

    switch (goal) {
        case 'finger-isolation': {
            if (focusKeys.length === 0) {
                throw new Error('finger-isolation goal requires at least one focus key')
            }
            const first = layout.lookupChar(focusKeys[0])
            if (!first) throw new Error(`Focus key "${focusKeys[0]}" is not on the ${layout === englishQwerty ? 'English' : layout.id} layout`)
            const finger = first.finger
            const drill = generateFingerIsolationDrill(finger, focusKeys, charFingerMap(layout), length)
            return buildPlan(goal, drill, layout)
        }
        case 'hand-alternation': {
            if (focusKeys.length < 2) {
                throw new Error('hand-alternation goal requires at least two focus keys')
            }
            const left = focusKeys.filter((k) => layout.lookupChar(k)?.hand === 'left')
            const right = focusKeys.filter((k) => layout.lookupChar(k)?.hand === 'right')
            if (left.length === 0 || right.length === 0) {
                throw new Error('hand-alternation goal needs both a left-hand and a right-hand focus key')
            }
            const drill = generateAlternationDrill(left, right, Math.max(1, Math.floor(length / 2)))
            return buildPlan(goal, drill, layout)
        }
        case 'same-hand': {
            if (focusKeys.length === 0) {
                throw new Error('same-hand goal requires at least one focus key')
            }
            const drill = generateSameHandDrill(focusKeys, Math.max(1, opts.constraints?.maxConsecutive ?? 4), Math.max(1, Math.ceil(length / 4)))
            return buildPlan(goal, drill, layout)
        }
        case 'shift': {
            if (focusKeys.length === 0) {
                throw new Error('shift goal requires at least one focus key')
            }
            const drill = generateShiftDrill(focusKeys, Math.max(1, Math.ceil(length / (focusKeys.length * 2))), 'lower-upper')
            return buildPlan(goal, drill, layout)
        }
        case 'row-transition': {
            if (focusKeys.length === 0) {
                throw new Error('row-transition goal requires at least one focus key')
            }
            const home = focusKeys.filter((k) => rowOf(k, layout) === 'home')
            const other = focusKeys.filter((k) => rowOf(k, layout) !== 'home')
            if (home.length === 0 || other.length === 0) {
                throw new Error('row-transition goal needs both a home-row and a non-home-row focus key')
            }
            const drill = generateRowTransitionDrill(home, other, Math.max(1, Math.ceil(length / 2)))
            return buildPlan(goal, drill, layout)
        }
        case 'repetition': {
            if (focusKeys.length === 0) {
                throw new Error('repetition goal requires at least one focus key')
            }
            const perKey = Math.max(1, Math.ceil(length / focusKeys.length))
            const drill = generateRepetitionDrill(focusKeys, perKey)
            return buildPlan(goal, drill, layout)
        }
        case 'pair': {
            if (focusKeys.length < 2) {
                throw new Error('pair goal requires at least two focus keys')
            }
            const pairs: [string, string][] = []
            for (let i = 1; i < focusKeys.length; i++) {
                pairs.push([focusKeys[i - 1], focusKeys[i]])
            }
            const repeats = Math.max(1, Math.ceil(length / pairs.length) / 2)
            const drill = generatePairDrill(pairs, repeats)
            return buildPlan(goal, drill, layout)
        }
    }
}

function charFingerMap(layout: KeyboardLayout): Record<string, FingerId> {
    const map: Record<string, FingerId> = {}
    for (const row of layout.rows) {
        for (const key of row) {
            if (key.plain !== undefined) map[key.plain] = key.finger
        }
    }
    return map
}

export const MUSCLE_MEMORY_GOALS: MuscleMemoryGoal[] = [
    'finger-isolation',
    'hand-alternation',
    'same-hand',
    'shift',
    'row-transition',
    'repetition',
    'pair',
]

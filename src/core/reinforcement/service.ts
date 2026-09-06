import type { KeyboardLayout } from '@/core/keyboard-layout/layout'
import { englishQwerty } from '@/core/keyboard-layout/english-qwerty'
import { ENGLISH_FINGER_KEYS } from '@/core/drills/types'
import { planMuscleMemorySession, type MuscleMemoryGoal, type MuscleMemoryPlan } from '@/core/drills/engine'
import type { FingerId, ParsedKeyId, ReinforcedDrill, ReinforcementOptions, WeakKeyId } from './types'

export const DEFAULT_MAX_KEYS = 8

export function parseKeyId(id: string): ParsedKeyId {
    const idx = id.indexOf(':')
    if (idx === -1) return { code: id, modifier: 'none' }
    const code = id.slice(0, idx)
    const modifier = id.slice(idx + 1)
    return {
        code,
        modifier: modifier === 'shift' || modifier === 'none' ? modifier : 'none',
    }
}

export function keyIdToChar(id: string, layout: KeyboardLayout = englishQwerty): string | undefined {
    const { code, modifier } = parseKeyId(id)
    return layout.outputFor(code, modifier)?.text
}

/** Human-readable label for a weak key id: its character when resolvable, else the raw id. */
export function keyIdLabel(id: string, layout: KeyboardLayout = englishQwerty): string {
    return keyIdToChar(id, layout) ?? id
}

export function focusCharsFromWeakKeys(
    weakKeys: WeakKeyId[],
    opts: Pick<ReinforcementOptions, 'maxKeys'> = {},
    layout: KeyboardLayout = englishQwerty,
): string[] {
    const maxKeys = opts.maxKeys ?? DEFAULT_MAX_KEYS
    const sorted = [...weakKeys].sort((a, b) => a.lowerBound - b.lowerBound)
    const seen = new Set<string>()
    for (const wk of sorted) {
        if (seen.size >= maxKeys) break
        const ch = keyIdToChar(wk.key, layout)
        if (ch !== undefined && !seen.has(ch)) seen.add(ch)
    }
    return [...seen]
}

export function decideDrillGoal(focusKeys: string[]): MuscleMemoryGoal {
    const fingers = new Set<FingerId>()
    for (const ch of focusKeys) {
        const lookup = englishQwerty.lookupChar(ch)
        if (lookup) fingers.add(lookup.finger)
    }
    return fingers.size <= 1 ? 'finger-isolation' : 'repetition'
}

export function focusCharsFromWeakFingers(
    fingers: FingerId[],
    opts: Pick<ReinforcementOptions, 'maxKeys'> = {},
    layout: KeyboardLayout = englishQwerty,
): string[] {
    const maxKeys = opts.maxKeys ?? DEFAULT_MAX_KEYS
    const seen = new Set<string>()
    for (const finger of fingers) {
        for (const ch of ENGLISH_FINGER_KEYS[finger] ?? []) {
            if (seen.size >= maxKeys) break
            if (ch !== ' ' && layout.lookupChar(ch)) seen.add(ch)
        }
    }
    return [...seen]
}

function makeDrill(
    goal: MuscleMemoryGoal,
    focusKeys: string[],
    targeted: string[],
    source: 'keys' | 'fingers',
    length: number | undefined,
): ReinforcedDrill {
    const plan = planMuscleMemorySession(goal, focusKeys, { length })
    return { goal, source, targeted, focusKeys, plan }
}

export function reinforcementFromWeakKeys(weakKeys: WeakKeyId[], opts: ReinforcementOptions = {}): ReinforcedDrill {
    const goal = opts.goal ?? decideDrillGoal(focusCharsFromWeakKeys(weakKeys, opts))
    const focusKeys = focusCharsFromWeakKeys(weakKeys, opts)
    if (focusKeys.length === 0) {
        throw new Error('reinforcement: no weak keys mapped to a character on the layout')
    }
    return makeDrill(
        goal,
        focusKeys,
        weakKeys.map((w) => w.key),
        'keys',
        opts.length,
    )
}

export function reinforcementFromWeakFingers(weakFingers: FingerId[], opts: ReinforcementOptions = {}): ReinforcedDrill {
    const focusKeys = focusCharsFromWeakFingers(weakFingers, opts)
    const goal = opts.goal ?? decideDrillGoal(focusKeys)
    if (focusKeys.length === 0) {
        throw new Error('reinforcement: no weak fingers carry a usable key')
    }
    return makeDrill(goal, focusKeys, weakFingers, 'fingers', opts.length)
}

export function planWeakestReinforcement(ranks: { key: string; lowerBound: number }[], opts: ReinforcementOptions = {}): ReinforcedDrill {
    return reinforcementFromWeakKeys(ranks, opts)
}

export type { MuscleMemoryPlan }

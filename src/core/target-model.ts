import type { FingerId, Hand, Modifier } from '@/types'
import type { TypingEngine } from './typing-engine/engine'
import { shiftHandFor, type KeyboardLayout } from './keyboard-layout/layout'

export interface TargetState {
    keyCode: string | null
    modifier: Modifier
    finger: FingerId | null
    hand: Hand | null
    requiresShift: boolean
    shiftHand: Hand | null
}

export interface LastKeyState {
    keyCode: string | null
    correct: boolean
}

const IDLE_TARGET: TargetState = {
    keyCode: null,
    modifier: 'none',
    finger: null,
    hand: null,
    requiresShift: false,
    shiftHand: null,
}

const NO_LAST_KEY: LastKeyState = { keyCode: null, correct: false }

export function resolveTarget(engine: TypingEngine | null, _layout: KeyboardLayout | null): TargetState {
    const unit = engine?.expectedUnit ?? null
    if (!unit) return IDLE_TARGET
    const requiresShift = unit.modifier === 'shift'
    return {
        keyCode: unit.keyCode,
        modifier: unit.modifier,
        finger: unit.finger,
        hand: unit.hand,
        requiresShift,
        shiftHand: requiresShift ? shiftHandFor(unit.hand) : null,
    }
}

export function resolveLastKey(engine: TypingEngine | null): LastKeyState {
    const event = engine?.lastEvent ?? null
    if (!event) return NO_LAST_KEY
    if (event.type !== 'correct' && event.type !== 'incorrect') return NO_LAST_KEY
    return {
        keyCode: event.keyCode ?? null,
        correct: event.type === 'correct',
    }
}

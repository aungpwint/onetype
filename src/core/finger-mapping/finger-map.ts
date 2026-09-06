import type { FingerId } from '@/types'
import { shiftHandFor } from '@/core/keyboard-layout/layout'

const STANDARD: Record<string, FingerId> = {
    Backquote: 'left-pinky',
    Digit1: 'left-pinky',
    Digit2: 'left-ring',
    Digit3: 'left-middle',
    Digit4: 'left-index',
    Digit5: 'left-index',
    Digit6: 'right-index',
    Digit7: 'right-index',
    Digit8: 'right-middle',
    Digit9: 'right-ring',
    Digit0: 'right-pinky',
    Minus: 'right-pinky',
    Equal: 'right-pinky',
    Backspace: 'right-pinky',
    Tab: 'left-pinky',
    KeyQ: 'left-pinky',
    KeyW: 'left-ring',
    KeyE: 'left-middle',
    KeyR: 'left-index',
    KeyT: 'left-index',
    KeyY: 'right-index',
    KeyU: 'right-index',
    KeyI: 'right-middle',
    KeyO: 'right-ring',
    KeyP: 'right-pinky',
    BracketLeft: 'right-pinky',
    BracketRight: 'right-pinky',
    Backslash: 'right-pinky',
    CapsLock: 'left-pinky',
    KeyA: 'left-pinky',
    KeyS: 'left-ring',
    KeyD: 'left-middle',
    KeyF: 'left-index',
    KeyG: 'left-index',
    KeyH: 'right-index',
    KeyJ: 'right-index',
    KeyK: 'right-middle',
    KeyL: 'right-ring',
    Semicolon: 'right-pinky',
    Quote: 'right-pinky',
    Enter: 'right-pinky',
    ShiftLeft: 'left-pinky',
    KeyZ: 'left-pinky',
    KeyX: 'left-ring',
    KeyC: 'left-middle',
    KeyV: 'left-index',
    KeyB: 'left-index',
    KeyN: 'right-index',
    KeyM: 'right-index',
    Comma: 'right-middle',
    Period: 'right-ring',
    Slash: 'right-pinky',
    ShiftRight: 'right-pinky',
    ControlLeft: 'left-pinky',
    AltLeft: 'left-pinky',
    MetaLeft: 'left-pinky',
    ControlRight: 'right-pinky',
    AltRight: 'right-pinky',
    MetaRight: 'right-pinky',
    Space: 'left-thumb',
}

export function fingerForCode(code: string): FingerId {
    return STANDARD[code] ?? 'left-pinky'
}

/**
 * Resolve the finger responsible for a physical key code, or `null` when the
 * code has no defined finger. Unlike `fingerForCode`, this never falls back to
 * a pinky guess, so the hand overlay cannot highlight the wrong finger for an
 * unknown/synthetic code.
 */
export function fingerForCodeOrNull(code: string | null | undefined): FingerId | null {
    if (!code) return null
    const finger = STANDARD[code]
    return finger ?? null
}

export function handForFinger(finger: FingerId): 'left' | 'right' {
    return finger.startsWith('left') ? 'left' : 'right'
}

export const FINGER_LABELS: Record<FingerId, string> = {
    'left-pinky': 'Left Pinky',
    'left-ring': 'Left Ring',
    'left-middle': 'Left Middle',
    'left-index': 'Left Index',
    'left-thumb': 'Left Thumb',
    'right-thumb': 'Right Thumb',
    'right-index': 'Right Index',
    'right-middle': 'Right Middle',
    'right-ring': 'Right Ring',
    'right-pinky': 'Right Pinky',
}

/**
 * Optional human-readable label for wide keys whose layout `label` is too terse
 * to sit comfortably on a wide keycap (e.g. "Shift", "Enter", "Backspace").
 */
export const WIDE_KEY_LABEL: Record<string, string> = {
    Tab: 'Tab',
    CapsLock: 'Caps',
    Enter: 'Enter',
    Backspace: '⌫',
    ShiftLeft: 'Shift',
    ShiftRight: 'Shift',
    ControlLeft: 'Ctrl',
    AltLeft: 'Alt',
    MetaLeft: 'Cmd',
}

export interface FingerMapping {
    primary: FingerId | null
    shift: FingerId | null
}

/**
 * Resolve the primary finger (and, when `withShift`, the opposite-hand pinky
 * used for the Shift chord) responsible for a given key code.
 */
export function resolveFingerMapping(keyCode: string, withShift: boolean): FingerMapping {
    const primary = keyCode ? fingerForCode(keyCode) : null
    let shift: FingerId | null = null
    if (withShift && primary) {
        const keyHand = handForFinger(primary)
        const sHand = shiftHandFor(keyHand)
        shift = sHand === 'left' ? 'left-pinky' : 'right-pinky'
    }
    return { primary, shift }
}

/** A short uppercase label for a finger ("L-Pinky"), used in tidy chips. */
export function fingerShort(finger: FingerId | null): string {
    if (!finger) return ''
    const full = FINGER_LABELS[finger]
    const match = full.toLowerCase().match(/^(\w+)\s+(\w+)$/)
    if (!match) return full
    const side = match[1] === 'right' ? 'R' : 'L'
    const name = match[2]
    return name === 'Pinky' ? `${side}-Pink` : `${side}-${name}`
}

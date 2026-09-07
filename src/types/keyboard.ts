import type { FingerId, Hand } from './index'
import type { KeyboardRow } from '@/core/keyboard-layout/layout'

export type KeyboardId = 'qwerty' | 'myanmar' | 'mixed'

export const LESSON_KEYBOARD_IDS: readonly KeyboardId[] = ['qwerty', 'myanmar', 'mixed'] as const

export function isKeyboardId(value: unknown): value is KeyboardId {
    return typeof value === 'string' && (LESSON_KEYBOARD_IDS as readonly string[]).includes(value)
}

export type RuntimeLayoutId = 'english-qwerty' | 'myanmar' | 'english-myanmar-mixed'

export function toLayoutId(keyboard: KeyboardId): RuntimeLayoutId {
    switch (keyboard) {
        case 'qwerty':
            return 'english-qwerty'
        case 'myanmar':
            return 'myanmar'
        case 'mixed':
            return 'english-myanmar-mixed'
    }
}

export function fromLayoutId(layoutId: string): KeyboardId {
    if (layoutId === 'english-qwerty') return 'qwerty'
    if (layoutId === 'myanmar') return 'myanmar'
    if (layoutId === 'english-myanmar-mixed') return 'mixed'
    throw new Error(`Layout "${layoutId}" has no canonical lesson keyboard identifier`)
}

export interface KeyboardDefinitionJson {
    id: string
    name: string
    language: 'english' | 'myanmar' | 'mixed'
    version: number
    source: string
    rows: KeyboardKeyDefinitionJson[][]
    space?: KeyboardKeyDefinitionJson
    note?: string
}

export interface KeyboardKeyDefinitionJson {
    code: string
    label: string
    finger: FingerId
    hand: Hand
    row: KeyboardRow
    plain?: string
    shifted?: string
    width?: number
    kind?: 'key' | 'modifier'
    legend?: string
}

import type { KeyboardLayout } from '@/core/keyboard-layout/layout'
import { normalizeMyanmarText } from '@/core/unicode/myanmar'
import type { Modifier } from '@/types'

interface PressedKey {
    code: string
    modifier: Modifier
}

interface KeyEventLike {
    code?: string
    key?: string
    shiftKey?: boolean
}

export function resolvePressedKey(raw: KeyEventLike, layout: KeyboardLayout): PressedKey | null {
    const code = raw.code ?? ''
    const shift = raw.shiftKey === true

    const fromCode: PressedKey | null =
        code !== '' && code !== 'Unidentified' && layout.getKey(code) !== undefined ? { code, modifier: shift ? 'shift' : 'none' } : null

    const keyText = raw.key ?? ''
    if (keyText.length === 0) return fromCode

    const normalized = normalizeMyanmarText(keyText)
    if (normalized.length > 0) {
        const hit = layout.lookupChar(normalized)
        if (hit) {
            const fromKey: PressedKey = { code: hit.code, modifier: hit.modifier }
            if (!fromCode || fromCode.code !== fromKey.code || fromCode.modifier !== fromKey.modifier) {
                return fromKey
            }
        }
    }

    return fromCode
}

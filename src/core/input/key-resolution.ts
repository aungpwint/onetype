import type { KeyboardLayout } from '@/core/keyboard-layout/layout'
import { normalizeMyanmarText } from '@/core/unicode/myanmar'
import type { Modifier } from '@/types'

export interface PressedKey {
    code: string
    modifier: Modifier
    character: string | null
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
        code !== '' && code !== 'Unidentified' && layout.getKey(code) !== undefined ? { code, modifier: shift ? 'shift' : 'none', character: null } : null

    const keyText = raw.key ?? ''
    if (keyText.length === 0) return fromCode

    const normalized = normalizeMyanmarText(keyText)
    // The actual typed character is the ground truth for grading (it is what
    // the active IME produced); it is reported even when the layout has no
    // physical mapping for it so the engine can still score mixed-script work.
    const character = normalized.length > 0 ? normalized : null
    if (normalized.length > 0) {
        const hit = layout.lookupChar(normalized)
        if (hit) {
            const fromKey: PressedKey = { code: hit.code, modifier: hit.modifier, character }
            if (!fromCode || fromCode.code !== fromKey.code || fromCode.modifier !== fromKey.modifier) {
                return fromKey
            }
        }
    }

    if (fromCode) {
        return { ...fromCode, character }
    }
    return null
}
import type { KeyboardLayout } from '@/core/keyboard-layout/layout'
import { normalizeMyanmarText } from '@/core/unicode/myanmar'
import type { Modifier } from '@/types'

export interface PressedKey {
    code: string
    modifier: Modifier
}

/**
 * Minimal shape of a native keyboard event, so the resolver is testable
 * without a DOM. Mirrors the fields the window listener consumes.
 */
export interface KeyEventLike {
    code?: string
    key?: string
    shiftKey?: boolean
}

/**
 * Resolve the app-internal (code, modifier) of a physical key press.
 *
 * Primary path: the positional `event.code` (the app's own keymap key). When
 * that is unreliable we fall back to the OS-produced `event.key`, normalized
 * through `normalizeMyanmarText` and reverse-mapped through the layout:
 *
 *  - Windows WebViews report an empty / "Unidentified" `event.code` while a
 *    non-US keyboard layout is active (e.g. the Pyidaungsu MM layout).
 *  - The genuine Pyidaungsu OS layout emits the preposed vowel as
 *    `ေ` = U+200C + U+1031. Normalization folds that to the bare U+1031, so a
 *    learner typing "ရေ" on the physical Myanmar keyboard produces exactly the
 *    same internal key sequence as typing it on the QWERTY positions — and no
 *    invisible character ever reaches the store, engine, or renderer.
 *
 * When both paths resolve to different keys, the OS-produced character wins:
 * it reflects the key the learner actually pressed under the active layout.
 */
export function resolvePressedKey(raw: KeyEventLike, layout: KeyboardLayout): PressedKey | null {
    const code = raw.code ?? ''
    const shift = raw.shiftKey === true

    const fromCode: PressedKey | null =
        code !== '' && code !== 'Unidentified' && layout.getKey(code) !== undefined
            ? { code, modifier: shift ? 'shift' : 'none' }
            : null

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
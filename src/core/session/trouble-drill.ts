import type { KeyboardLayout } from '@/core/keyboard-layout/layout'
import { keyIdToChar } from '@/core/reinforcement'
import type { KeyTapSummary } from './key-outcomes'

/**
 * Physical key ids behind this round's worst keystrokes, ranked weakest-first
 * and capped for a drill. Keys the layout cannot actually write are skipped so
 * the drill is built entirely from writable characters.
 */
export function troubleKeyIds(summary: KeyTapSummary, layout: KeyboardLayout, limit = 8): string[] {
    const out: string[] = []
    for (const tap of summary.errorKeys) {
        if (out.length >= limit) break
        if (out.includes(tap.id)) continue
        if (keyIdToChar(tap.id, layout) === undefined) continue
        out.push(tap.id)
    }
    return out
}

/** Drill route carrying the target layout and trouble keys for DrillPage. */
export function troubleDrillHref(layoutId: string, keys: string[]): string {
    if (keys.length === 0) return '/drill'
    return `/drill?layout=${layoutId}&keys=${keys.join(',')}`
}
import type { KeyboardLayout } from '@/core/keyboard-layout/layout'
import { keyIdToChar } from '@/core/reinforcement'
import type { KeyTapSummary } from './key-outcomes'

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

export function troubleDrillHref(layoutId: string, keys: string[]): string {
    if (keys.length === 0) return '/drill'
    return `/drill?layout=${layoutId}&keys=${keys.join(',')}`
}

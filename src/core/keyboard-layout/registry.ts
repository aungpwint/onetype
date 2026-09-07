import { KeyboardLayout } from './layout'
import { englishQwerty } from './english-qwerty'
import { myanmar } from './myanmar'
import { mixedEnglishMyanmar } from './mixed'

const byId: Record<string, KeyboardLayout> = {}

const DEFAULT_LAYOUTS = [englishQwerty, myanmar, mixedEnglishMyanmar]

for (const layout of DEFAULT_LAYOUTS) {
    byId[layout.id] = layout
}

export function getLayout(id: string): KeyboardLayout | undefined {
    return byId[id]
}

export function getLayoutOrThrow(id: string): KeyboardLayout {
    const layout = byId[id]
    if (!layout) {
        throw new Error(`Unknown keyboard layout: "${id}"`)
    }
    return layout
}

export function listLayouts(): KeyboardLayout[] {
    return DEFAULT_LAYOUTS
}

export function isLayoutAvailable(id: string): boolean {
    return Boolean(byId[id])
}

export function layoutForLanguage(language: 'english' | 'myanmar' | 'mixed'): KeyboardLayout {
    if (language === 'myanmar') return myanmar
    if (language === 'mixed') return mixedEnglishMyanmar
    return englishQwerty
}

export { KeyboardLayout, englishQwerty, myanmar, mixedEnglishMyanmar }

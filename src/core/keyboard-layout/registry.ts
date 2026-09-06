import { KeyboardLayout } from './layout'
import { englishQwerty } from './english-qwerty'
import { myanmar } from './myanmar'

export const LAYOUT_REVISION = 1
export const LAYOUT_VERSION = 1

const registry = new Map<string, KeyboardLayout>()
const byId: Record<string, KeyboardLayout> = {}

export function registerLayout(layout: KeyboardLayout) {
    byId[layout.id] = layout
    registry.set(layout.id, layout)
}

const DEFAULT_LAYOUTS = [englishQwerty, myanmar]

for (const layout of DEFAULT_LAYOUTS) {
    registerLayout(layout)
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

export function layoutForLanguage(language: 'english' | 'myanmar'): KeyboardLayout {
    if (language === 'myanmar') return myanmar
    return englishQwerty
}

export const RESERVED_LAYOUT_IDS = new Set(['english-qwerty', 'myanmar'])

export { KeyboardLayout, englishQwerty, myanmar }
export default registry

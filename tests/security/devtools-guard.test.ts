import { describe, expect, it, vi } from 'vitest'

import { blockDevToolsShortcut, isDevToolsShortcut, type BlockableShortcutEvent } from '@/security/devtools-guard'

function event(overrides: Partial<BlockableShortcutEvent> = {}): BlockableShortcutEvent {
    return {
        key: 'a',
        ctrlKey: false,
        metaKey: false,
        altKey: false,
        shiftKey: false,
        preventDefault: () => {},
        ...overrides,
    }
}

describe('isDevToolsShortcut', () => {
    it('blocks F12 regardless of letter casing', () => {
        expect(isDevToolsShortcut(event({ key: 'F12' }))).toBe(true)
        expect(isDevToolsShortcut(event({ key: 'f12' }))).toBe(true)
    })

    it('blocks Ctrl+Shift+I / J / C', () => {
        for (const key of ['I', 'J', 'C']) {
            expect(isDevToolsShortcut(event({ key, ctrlKey: true, shiftKey: true }))).toBe(true)
        }
    })

    it('blocks Cmd+Option+I / J / C', () => {
        for (const key of ['I', 'J', 'C']) {
            expect(isDevToolsShortcut(event({ key, metaKey: true, altKey: true }))).toBe(true)
        }
    })

    it('ignores plain letter presses', () => {
        for (const key of ['i', 'j', 'c', 'I', 'J', 'C']) {
            expect(isDevToolsShortcut(event({ key }))).toBe(false)
        }
    })

    it('does not eat unrelated combos (Ctrl+K, Ctrl+1, Shift, Cmd+Jless)', () => {
        expect(isDevToolsShortcut(event({ key: 'k', ctrlKey: true }))).toBe(false)
        expect(isDevToolsShortcut(event({ key: '1', metaKey: true }))).toBe(false)
        expect(isDevToolsShortcut(event({ key: 'i', ctrlKey: true }))).toBe(false)
        expect(isDevToolsShortcut(event({ key: 'i', metaKey: true }))).toBe(false)
        expect(isDevToolsShortcut(event({ key: 'j', altKey: true }))).toBe(false)
    })

    it('only matches Ctrl+Shift or Cmd+Option for i/j/c, not Ctrl+Alt', () => {
        expect(isDevToolsShortcut(event({ key: 'i', ctrlKey: true, altKey: true }))).toBe(false)
        expect(isDevToolsShortcut(event({ key: 'i', shiftKey: true }))).toBe(false)
    })
})

describe('blockDevToolsShortcut', () => {
    it('prevents a recognized inspection shortcut and reports it', () => {
        const preventDefault = vi.fn()
        const handled = blockDevToolsShortcut(event({ key: 'f12', preventDefault }))
        expect(handled).toBe(true)
        expect(preventDefault).toHaveBeenCalledTimes(1)
    })

    it('leaves unrelated keys untouched', () => {
        const preventDefault = vi.fn()
        const handled = blockDevToolsShortcut(event({ key: 't', shiftKey: true, ctrlKey: true, preventDefault }))
        expect(handled).toBe(false)
        expect(preventDefault).not.toHaveBeenCalled()
    })
})

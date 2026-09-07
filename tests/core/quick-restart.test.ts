import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useTypingStore } from '@/stores/typing-store'
import { TypingEngine } from '@/core/typing-engine/engine'
import { buildSequence } from '@/core/typing-engine/sequence'
import { englishQwerty } from '@/core/keyboard-layout/english-qwerty'

// The store's clear() unbinds window/document key listeners. Provide the
// minimal DOM surface the store touches so the node-only test env is happy.
class FakeWindow {
    private handlers = new Map<string, Array<() => void>>()
    addEventListener(type: string, handler: () => void) {
        const arr = this.handlers.get(type) ?? []
        arr.push(handler)
        this.handlers.set(type, arr)
    }
    removeEventListener(type: string, handler: () => void) {
        const arr = (this.handlers.get(type) ?? []).filter((h) => h !== handler)
        this.handlers.set(type, arr)
    }
}
;(globalThis as Record<string, unknown>).window = new FakeWindow()
;(globalThis as Record<string, unknown>).document = { visibilityState: 'visible', addEventListener() {}, removeEventListener() {} }

/** Seed the store with a genuinely running engine, the rest beyond arm state. */
function seedRunningEngine() {
    const seq = buildSequence('cat dog fox', englishQwerty)
    const engine = new TypingEngine({ sequence: seq, layout: englishQwerty })
    engine.start()
    useTypingStore.setState({
        session: { resolved: { sequence: seq, phases: [] } } as never,
        engine,
        status: engine.status, // 'running'
        pendingRestartAt: null,
    })
}

describe('requestQuickRestart (double-press safety)', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        seedRunningEngine()
    })

    afterEach(() => {
        vi.useRealTimers()
        useTypingStore.getState().clear()
    })

    it('first press only arms the restart; it does not destroy the run', () => {
        const store = useTypingStore.getState()
        expect(store.status).toBe('running')
        const restarted = store.requestQuickRestart()
        expect(restarted).toBe(false)
        expect(useTypingStore.getState().status).toBe('running')
        expect(useTypingStore.getState().pendingRestartAt).not.toBeNull()
    })

    it('second press within the window restarts in place and disarms', () => {
        const store = useTypingStore.getState()
        expect(store.requestQuickRestart()).toBe(false)
        vi.advanceTimersByTime(200)
        expect(useTypingStore.getState().requestQuickRestart()).toBe(true)
        const after = useTypingStore.getState()
        expect(after.status).toBe('ready')
        expect(after.engine!.unitIndex).toBe(0)
        expect(after.pendingRestartAt).toBeNull()
    })

    it('a stale arm (past the 600ms window) re-arms instead of restarting', () => {
        const store = useTypingStore.getState()
        expect(store.requestQuickRestart()).toBe(false)
        vi.advanceTimersByTime(1_000)
        expect(useTypingStore.getState().requestQuickRestart()).toBe(false)
        expect(useTypingStore.getState().status).toBe('running')
    })

    it('does nothing when no round is active', () => {
        useTypingStore.setState({ status: 'idle', engine: null })
        expect(useTypingStore.getState().requestQuickRestart()).toBe(false)
        expect(useTypingStore.getState().status).toBe('idle')
    })
})

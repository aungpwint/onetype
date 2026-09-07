import { describe, expect, it, vi } from 'vitest'

import { bindWindowFocusGuard } from '@/stores/window-focus'

interface ListenerMap {
    blur: Array<() => void>
    focus: Array<() => void>
    visibilitychange: Array<() => void>
}

function makeTargets(visibilityState: 'hidden' | 'visible' = 'visible') {
    const listeners: ListenerMap = { blur: [], focus: [], visibilitychange: [] }
    const win = {
        addEventListener: (t: string, l: () => void) => {
            ;(listeners as unknown as Record<string, Array<() => void>>)[t].push(l)
        },
        removeEventListener: (t: string, l: () => void) => {
            ;(listeners as unknown as Record<string, Array<() => void>>)[t] = (listeners as unknown as Record<string, Array<() => void>>)[t].filter(
                (x) => x !== l,
            )
        },
    }
    const doc = {
        visibilityState,
        listeners: [] as Array<() => void>,
        addEventListener: (_t: 'visibilitychange', l: () => void) => {
            doc.listeners.push(l)
        },
        removeEventListener: (_t: 'visibilitychange', l: () => void) => {
            doc.listeners = doc.listeners.filter((x) => x !== l)
        },
    }
    const fire = (kind: keyof ListenerMap) => {
        if (kind === 'visibilitychange') for (const l of doc.listeners) l()
        else for (const l of listeners[kind]) l()
    }
    return { win, doc, fire, listeners }
}

describe('bindWindowFocusGuard', () => {
    it('fires onLostFocus on blur and onRegainedFocus with the gap on focus', () => {
        const { win, doc, fire } = makeTargets()
        const onLost = vi.fn()
        const onRegained = vi.fn()
        const cleanup = bindWindowFocusGuard({ onLostFocus: onLost, onRegainedFocus: onRegained, isSessionActive: () => true }, { win, doc })

        fire('blur')
        expect(onLost).toHaveBeenCalledTimes(1)

        fire('focus')
        expect(onRegained).toHaveBeenCalledTimes(1)
        expect(onRegained.mock.calls[0][0]).toBeGreaterThanOrEqual(0)

        cleanup()
        fire('blur')
        expect(onLost).toHaveBeenCalledTimes(1)
    })

    it('ignores blur while no session is active', () => {
        const { win, doc, fire } = makeTargets()
        const onLost = vi.fn()
        const onRegained = vi.fn()
        bindWindowFocusGuard({ onLostFocus: onLost, onRegainedFocus: onRegained, isSessionActive: () => false }, { win, doc })

        fire('blur')
        expect(onLost).not.toHaveBeenCalled()
        fire('focus')
        expect(onRegained).not.toHaveBeenCalled()
    })

    it('reports the AFK gap correctly after a visibility-hidden round trip', () => {
        const { win, doc, fire } = makeTargets()
        const onRegained = vi.fn()
        bindWindowFocusGuard({ onLostFocus: vi.fn(), onRegainedFocus: onRegained, isSessionActive: () => true }, { win, doc })

        doc.visibilityState = 'hidden'
        fire('visibilitychange')
        fire('focus')
        expect(onRegained).toHaveBeenCalledTimes(1)
        expect(onRegained.mock.calls[0][0]).toBeGreaterThanOrEqual(0)
    })

    it('starts in a lost state when the document begins hidden', () => {
        const { win, doc, fire } = makeTargets('hidden')
        const onRegained = vi.fn()
        bindWindowFocusGuard({ onLostFocus: vi.fn(), onRegainedFocus: onRegained, isSessionActive: () => true }, { win, doc })

        fire('focus')
        expect(onRegained).toHaveBeenCalledTimes(1)
    })

    it('requires an active session on regain', () => {
        const { win, doc, fire } = makeTargets()
        let active = true
        const onRegained = vi.fn()
        bindWindowFocusGuard(
            {
                onLostFocus: vi.fn(),
                onRegainedFocus: onRegained,
                isSessionActive: () => active,
            },
            { win, doc },
        )

        fire('blur')
        active = false
        fire('focus')
        expect(onRegained).not.toHaveBeenCalled()
    })
})

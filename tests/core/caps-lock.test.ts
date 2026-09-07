import { describe, expect, it } from 'vitest'

import { isCapsLockWarningVisible } from '@/core/session/caps-lock'

describe('isCapsLockWarningVisible', () => {
    it('shows the warning during an in-flight round', () => {
        expect(isCapsLockWarningVisible(true, 'running')).toBe(true)
        expect(isCapsLockWarningVisible(true, 'paused')).toBe(true)
    })

    it('hides the warning when caps lock is off', () => {
        expect(isCapsLockWarningVisible(false, 'running')).toBe(false)
    })

    it('hides the warning outside a live round', () => {
        for (const status of ['idle', 'ready', 'finished', 'warmup', '']) {
            expect(isCapsLockWarningVisible(true, status)).toBe(false)
        }
    })
})

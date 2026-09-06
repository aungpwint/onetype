import { describe, expect, it } from 'vitest'

import { previewWeaknessDrill, drillGoalLabel } from '@/core/reinforcement/preview'
import { keyIdLabel } from '@/core/reinforcement/service'

const WEAK = [
    { key: 'KeyA:none', accuracy: 60 },
    { key: 'KeyS:none', accuracy: 80 },
    { key: 'KeyD:none', accuracy: 95 },
]

describe('previewWeaknessDrill', () => {
    it('ranks the given keys weakest-first and previews a drill over them', () => {
        const preview = previewWeaknessDrill(WEAK)
        expect(preview).not.toBeNull()
        expect(preview?.keys).toContain('a')
        expect(preview?.count).toBe(3)
    })

    it('respects the key limit', () => {
        const preview = previewWeaknessDrill(WEAK, 2)
        expect(preview?.keys.length).toBeLessThanOrEqual(2)
    })

    it('returns null when no weak keys exist', () => {
        expect(previewWeaknessDrill([])).toBeNull()
    })

    it('returns null when no key maps to a character (no throw)', () => {
        expect(previewWeaknessDrill([{ key: 'F19:none', accuracy: 10 }])).toBeNull()
    })

    it('labels every muscle-memory goal', () => {
        expect(drillGoalLabel('finger-isolation')).toBe('Finger isolation')
        expect(drillGoalLabel('repetition')).toBe('Repetition')
        expect(drillGoalLabel('unknown' as never)).toBe('Strength')
    })
})

describe('keyIdLabel', () => {
    it('resolves a plain key id to its character', () => {
        expect(keyIdLabel('KeyA:none')).toBe('a')
        expect(keyIdLabel('KeyA:shift')).toBe('A')
        expect(keyIdLabel('Space:none')).toBe(' ')
    })

    it('falls back to the raw id when unresolvable', () => {
        expect(keyIdLabel('foo:bar')).toBe('foo:bar')
        expect(keyIdLabel('')).toBe('')
    })
})
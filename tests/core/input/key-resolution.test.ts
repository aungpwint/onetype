import { describe, expect, it } from 'vitest'

import { resolvePressedKey } from '@/core/input/key-resolution'
import { myanmar } from '@/core/keyboard-layout/myanmar'
import { englishQwerty } from '@/core/keyboard-layout/english-qwerty'
import { normalizeMyanmarText } from '@/core/unicode/myanmar'

describe('resolvePressedKey — positional code path', () => {
    it('prefers event.code when the layout knows the key', () => {
        expect(resolvePressedKey({ code: 'KeyZ', key: 'z', shiftKey: false }, myanmar)).toEqual({ code: 'KeyZ', modifier: 'none', character: 'z' })
        expect(resolvePressedKey({ code: 'Digit7', key: 'ရ', shiftKey: true }, myanmar)).toEqual({ code: 'Digit7', modifier: 'shift', character: 'ရ' })
        expect(resolvePressedKey({ code: 'Space', key: ' ', shiftKey: false }, myanmar)).toEqual({ code: 'Space', modifier: 'none', character: ' ' })
        expect(resolvePressedKey({ code: 'KeyA', key: 'a', shiftKey: false }, englishQwerty)).toEqual({ code: 'KeyA', modifier: 'none', character: 'a' })
    })
})

describe('resolvePressedKey — OS keyboard layout fallback', () => {
    it('falls back to the normalized event.key when event.code is missing or unidentified', () => {
        // The genuine Pyidaungsu MM OS layout emits the preposed vowel as
        // U+200C + U+1031 and Windows WebViews may report no usable code.
        const e = { code: 'Unidentified', key: '\u200C\u1031', shiftKey: false }
        expect(resolvePressedKey(e, myanmar)).toEqual({ code: 'KeyA', modifier: 'none', character: '\u1031' })
        expect(normalizeMyanmarText(e.key)).toBe('\u1031')
    })

    it('reverse-maps the OS-produced Myanmar character back to its hint key', () => {
        expect(resolvePressedKey({ code: '', key: 'ရ', shiftKey: false }, myanmar)).toEqual({ code: 'Digit7', modifier: 'shift', character: 'ရ' })
        expect(resolvePressedKey({ code: '', key: 'ေ', shiftKey: false }, myanmar)).toEqual({ code: 'KeyA', modifier: 'none', character: 'ေ' })
        expect(resolvePressedKey({ code: '', key: ' ', shiftKey: false }, myanmar)).toEqual({ code: 'Space', modifier: 'none', character: ' ' })
    })

    it('prefers the character the learner actually produced when code and key disagree', () => {
        // OS layout remaps the physical key, so the reported code is a different
        // app key than the character the learner produced.
        expect(resolvePressedKey({ code: 'KeyR', key: 'ေ', shiftKey: false }, myanmar)).toEqual({ code: 'KeyA', modifier: 'none', character: 'ေ' })
        expect(resolvePressedKey({ code: 'KeyA', key: 'ရ', shiftKey: true }, myanmar)).toEqual({ code: 'Digit7', modifier: 'shift', character: 'ရ' })
    })

    it('keeps the code path for plain keys whose character maps nowhere (e.g. dead keys)', () => {
        expect(resolvePressedKey({ code: 'KeyQ', key: 'Dead', shiftKey: false }, myanmar)).toEqual({ code: 'KeyQ', modifier: 'none', character: 'Dead' })
    })

    it('returns null when neither code nor key is usable', () => {
        expect(resolvePressedKey({ code: '', key: '', shiftKey: false }, myanmar)).toBeNull()
        expect(resolvePressedKey({}, myanmar)).toBeNull()
    })
})

describe('typing "ရေ" through OS-emitted events matches the app target exactly', () => {
    it('a Pyidaungsu-layout session emits the canonical sequence with no U+200C', () => {
        // Learner presses the OS keys for ရ then ေ. The OS may or may not report
        // a usable positional code; the ZWNJ must never reach the engine.
        const events = [
            { code: 'Digit7', key: 'ရ', shiftKey: true },
            { code: 'Unidentified', key: '\u200C\u1031', shiftKey: false },
        ]
        const keys = events.map((e) => resolvePressedKey(e, myanmar))
        expect(keys).toEqual([
            { code: 'Digit7', modifier: 'shift', character: 'ရ' },
            { code: 'KeyA', modifier: 'none', character: '\u1031' },
        ])
        const typed = keys.map((k) => k!.character ?? '').join('')
        expect(typed).toBe('ရေ')
        expect(typed).not.toContain('\u200C')
        expect([...typed].map((c) => c.codePointAt(0))).toEqual([0x101b, 0x1031])
    })
})
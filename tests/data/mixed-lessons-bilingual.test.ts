import { describe, expect, it } from 'vitest'

import { resolveLessonById, hasLesson } from '@/data/curriculum'
import { TypingEngine } from '@/core/typing-engine/engine'
import { getLayoutOrThrow } from '@/core/keyboard-layout/registry'
import { containsMyanmar } from '@/core/unicode/myanmar'

const MIXED_LESSON = 'lesson-my-advanced-11'

describe('mixed English + Myanmar curriculum lesson', () => {
    it('is present and resolves to the mixed layout', async () => {
        expect(await hasLesson(MIXED_LESSON)).toBe(true)
        const resolved = await resolveLessonById(MIXED_LESSON)
        expect(resolved.layoutId).toBe('english-myanmar-mixed')
    })

    it('targets text that naturally mixes both scripts on the same line', async () => {
        const resolved = await resolveLessonById(MIXED_LESSON)
        const joined = resolved.phases.map((p) => p.text).join(' ')
        expect(containsMyanmar(joined)).toBe(true)
        expect(/[A-Za-z]/.test(joined)).toBe(true)
        // The flagship greeting the brief names must appear verbatim, not as a
        // Myanmar transliteration of "hello".
        expect(joined).toContain('Hello မင်္ဂလာပါ')
    })

    it('builds a sequence with both English and Myanmar units', async () => {
        const resolved = await resolveLessonById(MIXED_LESSON)
        const units = resolved.sequence.units
        expect(units.some((u) => !containsMyanmar(u.text))).toBe(true)
        expect(units.some((u) => containsMyanmar(u.text))).toBe(true)
        for (const unit of units) {
            expect(getLayoutOrThrow(resolved.layoutId).getKey(unit.keyCode), `unit ${unit.index}`).toBeDefined()
            expect(unit.text.length).toBeGreaterThan(0)
        }
    })

    it('can be typed through end-to-end with actual characters', async () => {
        const resolved = await resolveLessonById(MIXED_LESSON)
        const engine = new TypingEngine({ sequence: resolved.sequence, layout: getLayoutOrThrow(resolved.layoutId) })
        // Typing the expected character on the expected code/modifier — the same
        // signal the browser emits per physical key — must finish the workshop.
        for (const unit of resolved.sequence.units) {
            const event = engine.processKey(unit.keyCode, unit.modifier, unit.text)
            expect(event?.errorKind, `unit ${unit.index} "${unit.text}"`).toBeUndefined()
        }
        expect(engine.isComplete).toBe(true)
        expect(engine.incorrectCount).toBe(0)
    })

    it('rejects English-only presses on Myanmar-expecting units', async () => {
        const resolved = await resolveLessonById(MIXED_LESSON)
        const engine = new TypingEngine({ sequence: resolved.sequence, layout: getLayoutOrThrow(resolved.layoutId) })
        for (const unit of resolved.sequence.units) {
            if (!containsMyanmar(unit.text)) continue
            // A Latin press on the same physical key must be flagged wrong.
            const event = engine.processKey(unit.keyCode, unit.modifier, 'a')
            expect(event?.errorKind, `unit ${unit.index}`).toBe('key')
            break
        }
    })
})

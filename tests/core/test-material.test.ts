import { describe, it, expect } from 'vitest'
import { buildTestMaterial } from '@/core/materials/test-material'
import { getLayoutOrThrow } from '@/core/keyboard-layout/registry'
import { containsMyanmar } from '@/core/unicode/myanmar'
import type { TypingTest } from '@/services/types'

function makeTest(overrides: Partial<TypingTest> = {}): TypingTest {
    return {
        id: 't-sandbox',
        code: 't-sandbox',
        name: 'Sandbox test',
        durationSeconds: 60,
        language: 'myanmar',
        layoutId: 'myanmar',
        minAccuracy: 80,
        minWpm: 20,
        contentVersion: 1,
        ...overrides,
    }
}

describe('buildTestMaterial', () => {
    it('builds a resolved lesson whose every unit maps to a key in the layout', () => {
        for (const language of ['myanmar', 'english', 'mixed'] as const) {
            const layoutId = language === 'english' ? 'english-qwerty' : language === 'mixed' ? 'english-myanmar-mixed' : 'myanmar'
            const material = buildTestMaterial(makeTest({ language, layoutId }))
            const layout = getLayoutOrThrow(layoutId)
            expect(material.totalUnits).toBeGreaterThan(0)
            for (const unit of material.sequence.units) {
                expect(layout.getKey(unit.keyCode)).toBeDefined()
                expect(unit.grapheme.length).toBeGreaterThan(0)
            }
            expect(material.phases.length).toBeGreaterThan(0)
        }
    })

    it('builds a mixed test on the mixed layout that contains BOTH scripts', () => {
        const material = buildTestMaterial(makeTest({ id: 't-mixed', language: 'mixed', layoutId: 'english-myanmar-mixed' }))
        expect(material.layoutId).toBe('english-myanmar-mixed')
        const text = material.phases.map((p) => p.text).join(' ')
        expect(containsMyanmar(text)).toBe(true)
        expect(/[A-Za-z]/.test(text)).toBe(true)
        for (const unit of material.sequence.units) {
            expect(material.sequence.graphemes[unit.graphemeIndex].length).toBeGreaterThan(0)
        }
    })

    it('scales material size with the test duration', () => {
        const short = buildTestMaterial(makeTest({ id: 't-short', durationSeconds: 60 }))
        const long = buildTestMaterial(makeTest({ id: 't-long', durationSeconds: 600 }))
        expect(long.sequence.units.length).toBeGreaterThan(short.sequence.units.length)
    })
})

import { describe, expect, it } from 'vitest'
import {
    diagnoseClusterComparison,
    summarizeClusterDiagnoses,
    type ClusterDiagnosis,
} from '@/core/unicode/comparison'
import { keyboardOrderForCluster } from '@/core/typing-engine/sequence'

function cp(text: string): string {
    return [...text].map((c) => `U+${c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}`).join(' ')
}

describe('Myanmar cluster comparison engine', () => {
    it('accepts identical clusters', () => {
        expect(diagnoseClusterComparison('က', 'က').kind).toBe('ok')
        expect(diagnoseClusterComparison('ရေ', 'ရေ').kind).toBe('ok')
        expect(diagnoseClusterComparison('ကြောင့်', 'ကြောင့်').kind).toBe('ok')
    })

    it('detects a missing medial', () => {
        // ကြ = က + ြ (U+103C medial-ra); typing only က drops the medial.
        const d = diagnoseClusterComparison('ကြ', 'က')
        expect(d.kind).toBe('missing-mark')
        expect(d.missing.join('')).toBe('ြ')
    })

    it('detects a missing tone mark', () => {
        const d = diagnoseClusterComparison('ကံ', 'က')
        expect(d.kind).toBe('missing-mark')
        expect(d.missing.join('')).toBe('ံ')
    })

    it('detects a missing asat', () => {
        const d = diagnoseClusterComparison('အိမ်', 'အိမ')
        expect(d.kind).toBe('missing-mark')
        expect(d.missing.join('')).toBe('်')
    })

    it('detects an extra mark', () => {
        const d = diagnoseClusterComparison('က', 'ကြ')
        expect(d.kind).toBe('extra-mark')
        expect(d.extra.join('')).toBe('ြ')
    })

    it('detects a wrong base character', () => {
        const d = diagnoseClusterComparison('က', 'ခ')
        expect(d.kind).toBe('wrong-character')
        expect(d.missing).toContain('က')
        expect(d.extra).toContain('ခ')
    })

    it('detects the same characters in the wrong order', () => {
        // Logical order: base ရ then pre-base vowel ေ. "ေရ" is a byte reorder.
        const d = diagnoseClusterComparison('ရေ', 'ေရ')
        expect(d.kind).toBe('wrong-order')
        expect(cp(d.expected)).toContain('U+101B')
        expect(cp(d.typed)).toContain('U+1031')
    })

    it('detects a mixed mark slip as wrong-sequence', () => {
        // ကီ = က + ီ (U+102E); expected medial ြ (U+103C) was replaced by ီ.
        const d = diagnoseClusterComparison('ကြ', 'ကီ')
        expect(d.kind).toBe('wrong-sequence')
        expect(d.missing.join('')).toBe('ြ')
        expect(d.extra.join('')).toBe('ီ')
    })

    it('accepts a correctly keyboard-ordered pre-base vowel cluster', () => {
        // Stored/logical ကျေ => keyboard press order ေကျ (pre-base first).
        const expectedKeyboard = keyboardOrderForCluster('ကျေ')
        expect(expectedKeyboard).toBe('ေကျ')
        expect(diagnoseClusterComparison(expectedKeyboard, expectedKeyboard).kind).toBe('ok')
    })

    it('classifies a wrong press inside a pre-base vowel cluster', () => {
        // Expected press order ေကျ; learner hit ေ က ိ (wrong medial key).
        const d = diagnoseClusterComparison('ေကျ', 'ေကီ')
        expect(d.kind).toBe('wrong-sequence')
    })

    it('accepts the multi-codepoint ၎င်း token as a single keystroke', () => {
        const token = '\u104E\u1004\u103A\u1038'
        expect(diagnoseClusterComparison(token, token).kind).toBe('ok')
        // Dropping the final း is a missing mark on ၎င်း.
        const short = '\u104E\u1004\u103A'
        const d = diagnoseClusterComparison(token, short)
        expect(d.kind).toBe('missing-mark')
    })

    it('normalises NFC/NFD equivalent input before comparing', () => {
        // U+1031 decomposes differently in older data; both forms must agree.
        expect(diagnoseClusterComparison('lowly-e', 'lowly-e').kind).toBe('ok')
    })

    it('rolls diagnoses up into recurring slips for the result screen', () => {
        const diagnoses: ClusterDiagnosis[] = [
            diagnoseClusterComparison('ကံ', 'က'),
            diagnoseClusterComparison('မံ', 'မ'),
            diagnoseClusterComparison('ကြ', 'ကီ'),
            diagnoseClusterComparison('ရေ', 'ေရ'),
            diagnoseClusterComparison('က', 'က'),
        ]
        const summary = summarizeClusterDiagnoses(diagnoses)
        const missing = summary.find((s) => s.kind === 'missing-mark')
        expect(missing?.count).toBe(2)
        const seq = summary.find((s) => s.kind === 'wrong-sequence')
        expect(seq?.count).toBe(1)
        const order = summary.find((s) => s.kind === 'wrong-order')
        expect(order?.count).toBe(1)
    })
})
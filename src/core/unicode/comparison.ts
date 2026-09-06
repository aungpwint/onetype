import { isMyanmarAttachingMark, isMyanmarSyllableHead, isPreBaseVowel } from './classification'

export type ClusterDiffKind = 'ok' | 'wrong-character' | 'missing-mark' | 'extra-mark' | 'wrong-order' | 'wrong-sequence'

export interface ClusterDiagnosis {
    kind: ClusterDiffKind
    expected: string
    typed: string
    missing: string[]
    extra: string[]
    message: string
}

type CpGroup = 'base' | 'mark' | 'other'

function groupOf(code: number): CpGroup {
    if (isMyanmarSyllableHead(code)) return 'base'
    if (isMyanmarAttachingMark(code) || isPreBaseVowel(code)) return 'mark'
    return 'other'
}

// Code point multiset difference (A minus B) in source order, deduplicated.
function diffChars(a: string, b: string): string[] {
    const counts = new Map<number, number>()
    for (const ch of b) {
        const cp = ch.codePointAt(0) ?? 0
        counts.set(cp, (counts.get(cp) ?? 0) + 1)
    }
    const out: string[] = []
    const seen = new Set<number>()
    for (const ch of a) {
        const cp = ch.codePointAt(0) ?? 0
        if (seen.has(cp)) continue
        seen.add(cp)
        const remaining = (counts.get(cp) ?? 0) - 1
        if (remaining < 0) {
            out.push(ch)
        }
    }
    return out
}

function hasSameMultiset(a: string, b: string): boolean {
    if ([...a].length !== [...b].length) return false
    const countA = new Map<number, number>()
    for (const ch of a) {
        const cp = ch.codePointAt(0) ?? 0
        countA.set(cp, (countA.get(cp) ?? 0) + 1)
    }
    for (const ch of b) {
        const cp = ch.codePointAt(0) ?? 0
        const remaining = (countA.get(cp) ?? 0) - 1
        if (remaining < 0) return false
        countA.set(cp, remaining)
    }
    for (const count of countA.values()) {
        if (count !== 0) return false
    }
    return true
}

const KIND_ORDER: ClusterDiffKind[] = ['ok', 'wrong-character', 'missing-mark', 'extra-mark', 'wrong-order', 'wrong-sequence']

export function diagnosisSortKey(diagnosis: ClusterDiagnosis): number {
    return Math.max(0, KIND_ORDER.indexOf(diagnosis.kind))
}

// Compare an expected Myanmar cluster against what the learner actually typed.
// Both strings must be in the SAME order convention (logical Unicode or press
// order); the caller decides. Not a naive code-point equality: the slip *kind*
// (missing tone mark, extra medial, swapped pre-base vowel, …) is classified so
// the app can tell the learner exactly what to fix.
export function diagnoseClusterComparison(expectedRaw: string, typedRaw: string): ClusterDiagnosis {
    const expected = expectedRaw.normalize('NFC')
    const typed = typedRaw.normalize('NFC')

    const common = { expected: expectedRaw, typed: typedRaw, missing: [] as string[], extra: [] as string[] }

    if (expected === typed) {
        return { ...common, kind: 'ok', message: '' }
    }

    if (hasSameMultiset(expected, typed)) {
        return {
            ...common,
            kind: 'wrong-order',
            message: 'Correct letters, wrong order — rehearse the stacking order of this syllable.',
        }
    }

    const missingAll = diffChars(expected, typed)
    const extraAll = diffChars(typed, expected)

    const baseMissing = missingAll.filter((ch) => groupOf(ch.codePointAt(0) ?? 0) === 'base')
    const baseExtra = extraAll.filter((ch) => groupOf(ch.codePointAt(0) ?? 0) === 'base')
    const markMissing = missingAll.filter((ch) => groupOf(ch.codePointAt(0) ?? 0) === 'mark')
    const markExtra = extraAll.filter((ch) => groupOf(ch.codePointAt(0) ?? 0) === 'mark')

    if (baseMissing.length > 0 || baseExtra.length > 0) {
        return {
            ...common,
            kind: 'wrong-character',
            missing: missingAll,
            extra: extraAll,
            message:
                baseMissing.length > 0 && baseExtra.length > 0
                    ? `Wrong base character — expected ${quote(baseMissing)} but you typed ${quote(baseExtra)}.`
                    : baseMissing.length > 0
                      ? `Missing base character ${quote(baseMissing)}.`
                      : `Extra base character ${quote(baseExtra)} — it does not belong here.`,
        }
    }

    if (markMissing.length > 0 && markExtra.length === 0) {
        return {
            ...common,
            kind: 'missing-mark',
            missing: markMissing,
            extra: [],
            message: `Missing diacritic ${quote(markMissing)}.`,
        }
    }

    if (markExtra.length > 0 && markMissing.length === 0) {
        return {
            ...common,
            kind: 'extra-mark',
            missing: [],
            extra: markExtra,
            message: `Extra diacritic ${quote(markExtra)} — remove it.`,
        }
    }

    if (markMissing.length > 0 && markExtra.length > 0) {
        return {
            ...common,
            kind: 'wrong-sequence',
            missing: markMissing,
            extra: markExtra,
            message: `Mixed diacritics — drop ${quote(markExtra)} and add ${quote(markMissing)}.`,
        }
    }

    if (missingAll.length > 0 || extraAll.length > 0) {
        return {
            ...common,
            kind: 'wrong-sequence',
            missing: missingAll,
            extra: extraAll,
            message: 'The characters do not line up — check the whole syllable.',
        }
    }

    return {
        ...common,
        kind: 'wrong-sequence',
        message: 'Different syllable — check the full sequence.',
    }
}

function quote(chars: string[]): string {
    return chars.map((c) => `"${c}"`).join(', ')
}

export interface ClusterSlipSummary {
    kind: Exclude<ClusterDiffKind, 'ok'>
    count: number
    example: string
}

// Roll per-cluster diagnoses into the recurring slip types worth surfacing on
// the result screen (missing marks, swapped order, wrong characters, …).
export function summarizeClusterDiagnoses(diagnoses: readonly ClusterDiagnosis[]): ClusterSlipSummary[] {
    const byKind = new Map<Exclude<ClusterDiffKind, 'ok'>, { count: number; example: string }>()
    const priority: Exclude<ClusterDiffKind, 'ok'>[] = ['wrong-character', 'missing-mark', 'extra-mark', 'wrong-order', 'wrong-sequence']
    for (const d of diagnoses) {
        if (d.kind === 'ok') continue
        const entry = byKind.get(d.kind) ?? { count: 0, example: '' }
        entry.count += 1
        if (entry.example === '') entry.example = `${d.expected} → ${d.typed}`
        byKind.set(d.kind, entry)
    }
    const out: ClusterSlipSummary[] = []
    for (const kind of priority) {
        const entry = byKind.get(kind)
        if (entry) out.push({ kind, count: entry.count, example: entry.example })
    }
    return out
}

export function isClusterCorrect(diagnosis: ClusterDiagnosis): boolean {
    return diagnosis.kind === 'ok'
}

import { isMyanmarCodePoint, isMyanmarAttachingMark, isMyanmarSyllableHead, isPreBaseVowel, isAsat, isVirama } from './classification'

export function containsMyanmar(text: string): boolean {
    for (const ch of text) {
        if (isMyanmarCodePoint(ch.codePointAt(0) ?? 0)) return true
    }
    return false
}

// Zero-width invisible character policy: lesson text and typing targets must be
// canonical Unicode. The real-world corruption is a Zero Width Non-Joiner
// (U+200C) inserted before the preposed vowel U+1031 (ေ) by certain keyboard
// drivers. It is invisible but breaks shaping and changes the stored bytes, so
// detection/cleaning lives here.

const SUSPICIOUS_CODEPOINTS: ReadonlySet<number> = new Set([
    0x200b, 0x200c, 0x200d, 0x200e, 0x200f, 0x202a, 0x202b, 0x202c, 0x202d, 0x202e, 0x2060, 0xfeff, 0x034f,
])

export interface SuspiciousCharacter {
    index: number
    codePoint: number
    char: string
    description: string
    context: string
}

function describeSuspicious(codePoint: number, next: number): string {
    if (codePoint === 0x200c) {
        if (next >= 0x102b && next <= 0x1032) {
            return `zero width non-joiner (U+200C) before vowel sign U+${next.toString(16).toUpperCase().padStart(4, '0')}`
        }
        return 'zero width non-joiner (U+200C)'
    }
    if (codePoint === 0x200d) return 'zero width joiner (U+200D)'
    if (codePoint === 0x200b) return 'zero width space (U+200B)'
    if (codePoint === 0xfeff) return 'byte order mark (U+FEFF)'
    if (codePoint === 0x034f) return 'combining grapheme joiner (U+034F)'
    if (codePoint === 0x200e || codePoint === 0x200f || codePoint === 0x2060)
        return `format character U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`
    return `embedded directional character U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`
}

export function findSuspiciousInvisibleCharacters(text: string): SuspiciousCharacter[] {
    const chars = Array.from(text)
    const out: SuspiciousCharacter[] = []
    for (let i = 0; i < chars.length; i++) {
        const codePoint = chars[i].codePointAt(0) ?? 0
        if (!SUSPICIOUS_CODEPOINTS.has(codePoint)) continue
        const next = chars[i + 1]?.codePointAt(0) ?? 0
        out.push({
            index: i,
            codePoint,
            char: chars[i],
            description: describeSuspicious(codePoint, next),
            context: chars.slice(Math.max(0, i - 2), i + 3).join(''),
        })
    }
    return out
}

export function containsUnexpectedInvisibleCharacters(text: string): boolean {
    return findSuspiciousInvisibleCharacters(text).length > 0
}

export interface MyanmarTextProblem {
    index: number
    codePoint: number
    message: string
}

export function validateMyanmarText(text: string): MyanmarTextProblem[] {
    const problems: MyanmarTextProblem[] = []
    for (const found of findSuspiciousInvisibleCharacters(text)) {
        problems.push({ index: found.index, codePoint: found.codePoint, message: found.description })
    }
    if (text.normalize('NFC') !== text) {
        problems.push({ index: 0, codePoint: 0, message: 'text is not in NFC (canonical composition) normal form' })
    }
    return problems
}

export function normalizeMyanmarText(text: string): string {
    const composed = text.normalize('NFC')
    let out = ''
    for (const ch of composed) {
        const codePoint = ch.codePointAt(0) ?? 0
        if (SUSPICIOUS_CODEPOINTS.has(codePoint)) continue
        out += ch
    }
    return out
}

// Myanamar syllable cluster segmentation: a full syllable cluster (base
// consonant + medials + vowel signs + asat/kinzi/stacking + tone marks) is one
// deletion unit; Intl.Segmenter leaves the preposed vowel U+1031 standalone, so
// the canonical syllable-break rules are implemented here. Input must already
// be canonical (see `validateMyanmarText`). Character membership comes from the
// classification core — no code-point tables live here.

export function splitMyanmarSyllables(text: string): string[] {
    const chars = Array.from(text)
    const out: string[] = []
    let current = ''
    let pending = '' // holds a preposed vowel to be merged into the next cluster

    for (let i = 0; i < chars.length; i++) {
        const code = chars[i].codePointAt(0) ?? 0
        const prev = i > 0 ? (chars[i - 1].codePointAt(0) ?? 0) : 0
        const next = i + 1 < chars.length ? (chars[i + 1].codePointAt(0) ?? 0) : 0

        if (isPreBaseVowel(code)) {
            // U+1031 is stored after its base and rendered before it; hold it
            // until we know whether a following base consonant claims it or it
            // completes the current (word-final) syllable.
            pending += chars[i]
            continue
        }

        if (isSyllableStart(code, prev, next)) {
            // A held preposed vowel can only merge into a cluster headed by a
            // real base that hosts it (consonant / independent vowel letter).
            if (pending.length > 0 && !isMyanmarSyllableHead(code)) {
                // The next char is a word space, punctuation, digit, … that
                // cannot host the vowel: re-join the vowel to the syllable it
                // logically follows, then open a fresh cluster.
                current += pending
                pending = ''
            }
            if (current.length > 0) out.push(current)
            current = pending + chars[i]
            pending = ''
        } else {
            // An attaching mark continues the current syllable. Any held
            // preposed vowel is part of that same syllable and must land
            // BEFORE the mark (logical order: base, then ေ, then tone marks),
            // or re-joining the clusters would reorder the source text.
            if (pending.length > 0) {
                current += pending
                pending = ''
            }
            current += chars[i]
        }
    }
    if (pending.length > 0) current += pending
    if (current.length > 0) out.push(current)
    return out
}

function isSyllableStart(code: number, prev: number, next: number): boolean {
    // Base consonants (and vowel-letter bases like ဣ ဤ ဥ ဦ ဧ ဩ ဿ) attach any
    // cluster-internal marks.
    if (isMyanmarSyllableHead(code)) {
        // Final consonants (followed by asat U+103A) and stacked consonants
        // (following virama U+1039 / asat U+103A) continue the previous cluster.
        if (isAsat(next)) return false
        if (isAsat(prev) || isVirama(prev)) return false
        // A consonant directly after a consonant starts a new syllable, unless the
        // preceding one already carried a vowel (handled by the independent rules).
        return true
    }
    // Medials and vowel signs always attach to the current cluster.
    if (isMyanmarAttachingMark(code)) return false
    // Anything else (punctuation, whitespace, digits) starts a new group.
    return true
}

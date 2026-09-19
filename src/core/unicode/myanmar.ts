import {
    isAnusvara,
    isAsat,
    isDependentVowel,
    isMyanmarAttachingMark,
    isMyanmarCodePoint,
    isMyanmarSyllableHead,
    isPreBaseVowel,
    isVirama,
} from './classification'
import { splitGraphemes } from './graphemes'

export function containsMyanmar(text: string): boolean {
    for (const ch of text) {
        if (isMyanmarCodePoint(ch.codePointAt(0) ?? 0)) return true
    }
    return false
}

// Zero-width invisible character policy: lesson text and typing targets must be
// canonical Unicode. The common corruption is a Zero Width Non-Joiner (U+200C)
// inserted before the preposed vowel U+1031 (ေ) by certain keyboard drivers.
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
    if (containsMyanmar(text) && !isMyanmarLogicalOrder(text)) {
        problems.push({ index: 0, codePoint: 0, message: 'Myanmar marks are not in logical Unicode order' })
    }
    return problems
}

export function normalizeMyanmarText(text: string): string {
    // NFC can reorder Myanmar marks (notably U+1037/U+103A) back into
    // canonical-combining order, which is not the typing sequence. Preserve
    // Myanmar-bearing text exactly and only use NFC for non-Myanmar text.
    const composed = containsMyanmar(text) ? text : text.normalize('NFC')
    let out = ''
    for (const ch of composed) {
        const codePoint = ch.codePointAt(0) ?? 0
        if (SUSPICIOUS_CODEPOINTS.has(codePoint)) continue
        out += ch
    }

    return out
}

/**
 * NFC is the only normalization used for typing comparison. Myanmar's
 * combining marks have no canonical-composition rule that represents typing
 * order, so this deliberately does not reorder code points.
 */
export function normalizeMyanmarForComparison(text: string): string {
    return containsMyanmar(text) ? text : text.normalize('NFC')
}

/**
 * Reports whether Myanmar uses the logical order required by OneType. The
 * pre-base vowel must follow its host consonant. The anusvara U+1036 (ံ) must
 * come after every dependent vowel sign in the syllable: Burmese canon stores
 * vowels before the anusvara (ပုံ = ပ + ို + ံ, never ပံု = ပ + ံ + ို), and the
 * reversed order does not render consistently across fonts. Dot-below U+1037
 * and asat U+103A are accepted in either stored order: real Unicode documents
 * contain both, while MyanSan's smart rule normalizes an asat-then-dot key
 * press to dot-then-asat. The typing engine handles that press order.
 */
export function isMyanmarLogicalOrder(text: string): boolean {
    for (const syllable of splitMyanmarSyllables(text)) {
        const chars = Array.from(syllable)
        const head = chars.findIndex((ch) => isMyanmarSyllableHead(ch.codePointAt(0) ?? 0))
        const preBase = chars.findIndex((ch) => isPreBaseVowel(ch.codePointAt(0) ?? 0))
        if (preBase >= 0 && head >= 0 && preBase < head) return false
        const anusvara = chars.findIndex((ch) => isAnusvara(ch.codePointAt(0) ?? 0))
        if (anusvara >= 0) {
            for (let i = anusvara + 1; i < chars.length; i++) {
                const code = chars[i]!.codePointAt(0) ?? 0
                if (isDependentVowel(code) || isPreBaseVowel(code)) return false
            }
        }
    }
    return true
}

// Myanamar syllable segmentation: one full syllable cluster (base consonant +
// medials + vowel signs + asat/kinzi/stacking + tone marks) is one deletion
// unit. Input must already be canonical (see `validateMyanmarText`).
// Membership comes from the classification core — no code-point tables here.

export function splitMyanmarSyllables(text: string): string[] {
    const chars = Array.from(text)
    const out: string[] = []
    let current = ''
    let pending = '' // preposed vowel held until its host base is known

    for (let i = 0; i < chars.length; i++) {
        const code = chars[i].codePointAt(0) ?? 0
        const prev = i > 0 ? (chars[i - 1].codePointAt(0) ?? 0) : 0
        const next = i + 1 < chars.length ? (chars[i + 1].codePointAt(0) ?? 0) : 0

        if (isPreBaseVowel(code)) {
            // Stored after its base, rendered before it: hold until a following
            // base claims it or it completes the current (word-final) syllable.
            pending += chars[i]
            continue
        }

        if (isSyllableStart(code, prev, next, upcomingHasPreBaseVowel(chars, i))) {
            // Canonical Unicode stores the preposed vowel (ေ) AFTER its own
            // base (ရေ). When the cluster being built already has a head, the
            // held vowel belongs to it and must not leak forward onto the next
            // syllable. It only attaches forward when it opens a word run
            // (legacy order, e.g. "ေရ"), where the current cluster has no head.
            if (pending.length > 0 && hasSyllableHead(current)) {
                current += pending
                pending = ''
            }
            if (current.length > 0) out.push(current)
            // A stray/legacy pre-base vowel with no host head must not swallow
            // the following whitespace/punctuation/digit (e.g. a lone "ေ" in a
            // key legend followed by a space). Flush it as its own cluster and
            // start the new group fresh. A real legacy word run ("ေ" + base,
            // e.g. "ေရ") keeps the vowel attached forward.
            if (pending.length > 0 && !hasSyllableHead(current) && !isMyanmarSyllableHead(code)) {
                out.push(pending)
                pending = ''
                current = chars[i]
            } else {
                current = pending + chars[i]
                pending = ''
            }
        } else {
            // An attaching mark continues the current syllable; any held
            // preposed vowel belongs to it and lands BEFORE the mark.
            if (pending.length > 0) {
                current += pending
                pending = ''
            }
            // A mark never attaches to a bare cross-script/whitespace run: an
            // isolated diacritic shown on its own (key legends, stray input)
            // starts its own cluster instead of fusing with surrounding spaces.
            if (current.length > 0 && !containsMyanmar(current)) {
                out.push(current)
                current = ''
            }
            current += chars[i]
        }
    }
    if (pending.length > 0) current += pending
    if (current.length > 0) out.push(current)
    return out
}

function hasSyllableHead(cluster: string): boolean {
    for (const ch of cluster) {
        if (isMyanmarSyllableHead(ch.codePointAt(0) ?? 0)) return true
    }
    return false
}

function isSyllableStart(code: number, prev: number, next: number, upcomingHasPreBase: boolean): boolean {
    // Base consonants (and vowel-letter bases) attach any cluster-internal marks.
    if (isMyanmarSyllableHead(code)) {
        // Final consonants (followed by asat U+103A) continue the previous cluster.
        if (isAsat(next)) return false
        // Stacked consonants (following virama U+1039 — including kinzi sequences
        // like င + ် + ္) continue the previous cluster.
        if (isVirama(prev)) return false
        // A consonant after a final-consonant asat merges as part of a compound
        // word (မြန်မာ, မျက်စိ, နားလည်…). It opens a NEW syllable only when its
        // own upcoming cluster carries the pre-base vowel U+1031, so that the
        // vowel is never hoisted to a merged cluster's front and the keyboard
        // order stays syllable-wise: "ဖတ်လေ့" must type as ဖ၊တ၊်၊ေ၊လ၊့ — never
        // ေ၊ဖ၊တ၊်၊လ၊့.
        if (isAsat(prev)) return upcomingHasPreBase
        return true
    }
    // Medials and vowel signs always attach to the current cluster.
    if (isMyanmarAttachingMark(code)) return false
    // Anything else (punctuation, whitespace, digits) starts a new group.
    return true
}

// True when the syllable opening at `from` carries the pre-base vowel U+1031
// somewhere in its own trailing run (medials, vowel signs, tones, asat — up to
// the next syllable head or any non-attaching character).
function upcomingHasPreBaseVowel(chars: string[], from: number): boolean {
    for (let j = from + 1; j < chars.length; j++) {
        const c = chars[j].codePointAt(0) ?? 0
        if (isPreBaseVowel(c)) return true
        if (isMyanmarSyllableHead(c)) return false
        if (isMyanmarAttachingMark(c)) continue
        return false
    }
    return false
}

// Mixed English + Myanmar segmentation: Myanmar syllables are split as complete
// deletion/typing units, while any non-Myanmar run (Latin, digits, spaces,
// punctuation between scripts) is split into grapheme clusters. This lets one
// typing target naturally mix scripts, e.g. `Hello မင်္ဂလာပါ`.
export function splitMixedClusters(text: string): string[] {
    const chars = Array.from(text)
    const out: string[] = []
    let myanmarBuffer = ''
    let otherBuffer = ''

    const flushMyanmar = () => {
        if (myanmarBuffer) {
            out.push(...splitMyanmarSyllables(myanmarBuffer))
            myanmarBuffer = ''
        }
    }
    const flushOther = () => {
        if (otherBuffer) {
            out.push(...splitGraphemes(otherBuffer))
            otherBuffer = ''
        }
    }

    for (const ch of chars) {
        const code = ch.codePointAt(0) ?? 0
        if (isMyanmarCodePoint(code) || isMyanmarAttachingMark(code)) {
            flushOther()
            myanmarBuffer += ch
        } else {
            flushMyanmar()
            otherBuffer += ch
        }
    }
    flushMyanmar()
    flushOther()
    return out
}

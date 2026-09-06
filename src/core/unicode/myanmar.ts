export const MYANMAR_BASE_MIN = 0x1000
export const MYANMAR_BASE_MAX = 0x109f

export function isMyanmarCodePoint(code: number): boolean {
    return code >= MYANMAR_BASE_MIN && code <= MYANMAR_BASE_MAX
}

export function containsMyanmar(text: string): boolean {
    for (const ch of text) {
        const code = ch.codePointAt(0) ?? 0
        if (isMyanmarCodePoint(code)) return true
    }
    return false
}

/** Whether `text` is (at least partially) Myanmar script text. */
export function isMyanmarText(text: string): boolean {
    return containsMyanmar(text)
}

export function detectLanguage(text: string): 'myanmar' | 'english' {
    return isMyanmarText(text) ? 'myanmar' : 'english'
}

export function toUnicodeLabels(text: string): string[] {
    return Array.from(text).map((ch) => `U+${(ch.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, '0')}`)
}

export function charNames(text: string): string[] {
    return Array.from(text).map((ch) => {
        const cp = ch.codePointAt(0) ?? 0
        return `U+${cp.toString(16).padStart(4, '0')}`
    })
}

// --- Zero-width invisible character policy -----------------------------------
//
// Myanmar lesson text and typing targets must be canonical Unicode. The
// corruption seen in the wild is a Zero Width Non-Joiner (U+200C) inserted
// before the preposed vowel U+1031 (ေ) by certain keyboard drivers / keymaps.
// The character is completely invisible but breaks font shaping and makes the
// stored text a different byte sequence than the visible glyphs suggest.
// These helpers keep the detection / cleaning policy in one small, reusable,
// deterministic place instead of scattering string surgery through the app.

const SUSPICIOUS_CODEPOINTS: ReadonlySet<number> = new Set([0x200b, 0x200c, 0x200d, 0x200e, 0x200f, 0x202a, 0x202b, 0x202c, 0x202d, 0x202e, 0x2060, 0xfeff, 0x034f])

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
    if (codePoint === 0x200e || codePoint === 0x200f || codePoint === 0x2060) return `format character U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`
    return `embedded directional character U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`
}

/**
 * Find invisible/format characters that are not semantically required by the
 * scripts this application handles. Returns one entry per offending code point
 * (code-point coordinates, so `index` is safe against surrogate pairs).
 */
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

/**
 * Validate Myanmar text without mutating it. Returns a list of problems (empty
 * when the text is canonical). Used by the lesson loader so malformed data
 * fails fast at boot, and by the lesson-content tests.
 */
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

/**
 * Normalize Myanmar text deterministically for use as display / derived typing
 * material: canonical NFC composition plus removal of zero-width characters
 * that this application never semantically uses. Stored lesson data must be
 * canonical already (the validator enforces that); this is a safety net for
 * derived/user-supplied strings.
 */
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

// --- Myanmar syllable cluster segmentation ---------------------------------
//
// A typing system for Myanmar needs to treat a full syllable cluster (base
// consonant + medials + vowel signs + asat/kinzi/stacking + tone marks) as a
// single deletion unit, otherwise Backspace would erase one combining mark at
// a time. The generic Intl.Segmenter does not always group this correctly
// (e.g. the preposed vowel U+1031 is left standalone), so we implement the
// canonical Myanmar syllable-break rules here. Input to this function is
// expected to be canonical (see `validateMyanmarText`).

/**
 * Characters that, as a class, start or continue Myanmar syllables. We operate
 * on code points so surrogate pairing is handled correctly.
 */
const RE_CONSONANT = /[\u1000-\u1021\u1023-\u1027\u1029-\u102A\u103F]/
const RE_ATTACHING = /[\u102B-\u1032\u1036-\u103E]/
const PREPOSED_VOWEL = 0x1031 // ေ

/**
 * Split Myanmar text into syllable clusters. Each returned cluster is a string
 * that the learner should perceive (and delete) as a single unit, and — equally
 * important for the renderer — that the browser must shape in one continuous
 * text run. A word-final preposed vowel (ေ U+1031) is kept with the consonant
 * it logically follows even when the syllable is followed by a space or
 * punctuation, so the stored canonical sequence ရ+ေ is never split into a
 * lone ရ and an orphaned ေ (which the font would render with a dotted-circle
 * placeholder instead of preposing to the left of ရ).
 */
export function splitMyanmarSyllables(text: string): string[] {
    const chars = Array.from(text)
    const out: string[] = []
    let current = ''
    let pending = '' // holds a preposed vowel to be merged into the next cluster

    for (let i = 0; i < chars.length; i++) {
        const code = chars[i].codePointAt(0) ?? 0
        const prev = i > 0 ? (chars[i - 1].codePointAt(0) ?? 0) : 0
        const next = i + 1 < chars.length ? (chars[i + 1].codePointAt(0) ?? 0) : 0

        if (code === PREPOSED_VOWEL) {
            // U+1031 is stored after its base and rendered before it; hold it
            // until we know whether a following base consonant claims it or it
            // completes the current (word-final) syllable.
            pending += chars[i]
            continue
        }

        if (isSyllableStart(code, prev, next)) {
            // A held preposed vowel can only merge into a cluster headed by a
            // real base that hosts it (consonant / independent vowel letter).
            if (pending.length > 0 && !RE_CONSONANT.test(chars[i])) {
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

/** Alias for callers that want the segmentation semantics spelled out. */
export function segmentMyanmarText(text: string): string[] {
    return splitMyanmarSyllables(text)
}

/**
 * Whether the code point `code` begins a new Myanmar syllable, given the
 * preceding (`prev`) and following (`next`) code points.
 */
function isSyllableStart(code: number, prev: number, next: number): boolean {
    // Base consonants (and vowel-letter bases like ဣ ဤ ဥ ဦ ဧ ဩ ဿ) attach any
    // cluster-internal marks.
    if (RE_CONSONANT.test(String.fromCodePoint(code))) {
        // Final consonants (followed by asat U+103A) and stacked consonants
        // (following virama U+1039 / asat U+103A) continue the previous cluster.
        if (next === 0x103a) return false
        if (prev === 0x103a || prev === 0x1039) return false
        // A consonant directly after a consonant starts a new syllable, unless the
        // preceding one already carried a vowel (handled by the independent rules).
        return true
    }
    // Medials and vowel signs always attach to the current cluster.
    if (RE_ATTACHING.test(String.fromCodePoint(code))) return false
    // Anything else (punctuation, whitespace, digits) starts a new group.
    return true
}
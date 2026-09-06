/**
 * Myanmar Unicode character classification.
 *
 * Single source of truth for what each Myanmar code point IS in the typing
 * model. No other module should hard-code Myanmar code-point membership —
 * React components, the keyboard UI and the typing engine all consume the
 * predicates below instead of scattering `code === 0x1031` checks.
 *
 * The Myanmar script spans several Unicode blocks; OneType currently drives
 * Burmese typing with the core Myanmar block (U+1000–U+109F). The extended
 * blocks (Myanmar Extended-A U+AA60–U+AA7F, Extended-B U+A9E0–U+A9FF,
 * Extended-C U+116D0–U+116FF) are outside the classified set today, but the
 * architecture supports extending the ranges without rewriting callers:
 * add the range to `MYANMAR_BLOCK_RANGES` and adjust the classifier — the
 * predicates are derived from the ranges, not duplicated per consumer.
 *
 * Categories are deliberately explicit so behaviour is stated, not implied:
 *
 *   base              – consonants (က..အ, ဿ) that head a syllable
 *   independent-vowel – vowel letters (ဣ ဤ ဥ ဦ ဧ ဩ) that head a syllable
 *   dependent-vowel   – vowel signs that attach to a base (ာ ိ ီ ု ူ ဲ …)
 *   pre-base-vowel    – U+1031 ေ, stored after its base, typed before it
 *   medial            – U+103B–U+103E (ျ ြ ွ ှ)
 *   asat              – U+103A (း-like kill stroke, ယသ်ဳ)
 *   virama            – U+1039 (stack-marker, ၹ)
 *   tone              – U+1036 U+1037 U+1038 (ံ ့ း)
 *   number            – U+1040–U+1049 (၀–၉)
 *   punctuation       – U+104A ၊, U+104B ။
 *   other             – any other code point in the Myanmar blocks
 */

export type MyanmarCharacterCategory =
    'base' | 'independent-vowel' | 'dependent-vowel' | 'pre-base-vowel' | 'medial' | 'asat' | 'virama' | 'tone' | 'number' | 'punctuation' | 'other'

// --- Core Myanmar block (the classified set) -------------------------------

export const MYANMAR_BLOCK_MIN = 0x1000
export const MYANMAR_BLOCK_MAX = 0x109f

export const MYANMAR_EXT_A_MIN = 0xaa60
export const MYANMAR_EXT_A_MAX = 0xaa7f
export const MYANMAR_EXT_B_MIN = 0xa9e0
export const MYANMAR_EXT_B_MAX = 0xa9ff
export const MYANMAR_EXT_C_MIN = 0x116d0
export const MYANMAR_EXT_C_MAX = 0x116ff

/**
 * The Myanmar blocks recognised by OneType. Every range is inclusive.
 * Extended ranges are not yet driven by the Burmese typing engine but are
 * declared so "is this a Myanmar code point?" is answered centrally and the
 * set can be extended without touching consumers.
 */
export const MYANMAR_SCRIPT_RANGES: ReadonlyArray<readonly [number, number]> = [
    [MYANMAR_BLOCK_MIN, MYANMAR_BLOCK_MAX],
    [MYANMAR_EXT_A_MIN, MYANMAR_EXT_A_MAX],
    [MYANMAR_EXT_B_MIN, MYANMAR_EXT_B_MAX],
    [MYANMAR_EXT_C_MIN, MYANMAR_EXT_C_MAX],
]

// --- Individual named code points ------------------------------------------

export const BASE_LETTER_START = 0x1000 // က
export const BASE_LETTER_END = 0x1021 // အ
export const SSA_LETTER = 0x103f // ဿ
export const INDEPENDENT_VOWEL_START = 0x1023 // ဣ
export const INDEPENDENT_VOWEL_END = 0x1027 // ဧ
export const INDEPENDENT_VOWEL_OA_START = 0x1029 // ဩ
export const INDEPENDENT_VOWEL_OA_END = 0x102a // ဪ
export const VOWEL_SIGN_START = 0x102b // ါ
export const VOWEL_SIGN_END = 0x1032 // ဲ
export const PRE_BASE_VOWEL = 0x1031 // ေ — the only pre-base vowel in the core block
export const ANUSVARA_TONE = 0x1036 // ံ
export const DOT_BELOW_TONE = 0x1037 // ့
export const VISARGA_TONE = 0x1038 // း
export const VIRAMA = 0x1039 // ၹ — stack marker
export const ASAT = 0x103a // ၺ — asat (kill stroke)
export const MEDIAL_START = 0x103b // ျ medial-ya
export const MEDIAL_END = 0x103e // ှ medial-ha
export const DIGIT_START = 0x1040 // ၀
export const DIGIT_END = 0x1049 // ၉
export const PUNCTUATION_COMMA = 0x104a // ၊
export const PUNCTUATION_FULL_STOP = 0x104b // ။

/** True when `code` falls inside any of the declared Myanmar script blocks. */
export function isMyanmarCodePoint(code: number): boolean {
    return MYANMAR_SCRIPT_RANGES.some(([min, max]) => code >= min && code <= max)
}

/**
 * Classify a single code point into its Myanmar typing category. Returns
 * `null` for code points outside the Myanmar script blocks.
 */
export function classifyMyanmarCharacter(code: number): MyanmarCharacterCategory | null {
    if (!isMyanmarCodePoint(code)) return null
    if (code >= BASE_LETTER_START && code <= BASE_LETTER_END) return 'base'
    if (code === SSA_LETTER) return 'base'
    if (
        (code >= INDEPENDENT_VOWEL_START && code <= INDEPENDENT_VOWEL_END) ||
        (code >= INDEPENDENT_VOWEL_OA_START && code <= INDEPENDENT_VOWEL_OA_END)
    ) {
        return 'independent-vowel'
    }
    if (code === PRE_BASE_VOWEL) return 'pre-base-vowel'
    if (code >= VOWEL_SIGN_START && code <= VOWEL_SIGN_END) return 'dependent-vowel'
    if (code >= MEDIAL_START && code <= MEDIAL_END) return 'medial'
    if (code === ANUSVARA_TONE || code === DOT_BELOW_TONE || code === VISARGA_TONE) return 'tone'
    if (code === ASAT) return 'asat'
    if (code === VIRAMA) return 'virama'
    if (code >= DIGIT_START && code <= DIGIT_END) return 'number'
    if (code === PUNCTUATION_COMMA || code === PUNCTUATION_FULL_STOP) return 'punctuation'
    return 'other'
}

// --- Category predicates ---------------------------------------------------

export function isBaseLetter(code: number): boolean {
    return (code >= BASE_LETTER_START && code <= BASE_LETTER_END) || code === SSA_LETTER
}

export function isIndependentVowel(code: number): boolean {
    return (
        (code >= INDEPENDENT_VOWEL_START && code <= INDEPENDENT_VOWEL_END) || (code >= INDEPENDENT_VOWEL_OA_START && code <= INDEPENDENT_VOWEL_OA_END)
    )
}

export function isDependentVowel(code: number): boolean {
    return code >= VOWEL_SIGN_START && code <= VOWEL_SIGN_END && code !== PRE_BASE_VOWEL
}

export function isPreBaseVowel(code: number): boolean {
    return code === PRE_BASE_VOWEL
}

export function isMedial(code: number): boolean {
    return code >= MEDIAL_START && code <= MEDIAL_END
}

export function isAsat(code: number): boolean {
    return code === ASAT
}

export function isVirama(code: number): boolean {
    return code === VIRAMA
}

export function isToneMark(code: number): boolean {
    return code === ANUSVARA_TONE || code === DOT_BELOW_TONE || code === VISARGA_TONE
}

export function isMyanmarNumber(code: number): boolean {
    return code >= DIGIT_START && code <= DIGIT_END
}

export function isMyanmarPunctuation(code: number): boolean {
    return code === PUNCTUATION_COMMA || code === PUNCTUATION_FULL_STOP
}

/**
 * True when `code` can open a Myanmar syllable: a base consonant or an
 * independent vowel letter. These are the code points that "host" attaching
 * marks (including a pending pre-base vowel).
 */
export function isMyanmarSyllableHead(code: number): boolean {
    return isBaseLetter(code) || isIndependentVowel(code)
}

/**
 * True when `code` is a combining mark that attaches to the current syllable:
 * vowel signs, medials, tone marks, asat and virama. These never start a new
 * syllable.
 */
export function isMyanmarAttachingMark(code: number): boolean {
    return (
        (code >= VOWEL_SIGN_START && code <= VOWEL_SIGN_END) ||
        (code >= MEDIAL_START && code <= MEDIAL_END) ||
        code === ASAT ||
        code === VIRAMA ||
        code === ANUSVARA_TONE ||
        code === DOT_BELOW_TONE ||
        code === VISARGA_TONE
    )
}

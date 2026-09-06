export type MyanmarCharacterCategory =
    'base' | 'independent-vowel' | 'dependent-vowel' | 'pre-base-vowel' | 'medial' | 'asat' | 'virama' | 'tone' | 'number' | 'punctuation' | 'other'

export const MYANMAR_BLOCK_MIN = 0x1000
export const MYANMAR_BLOCK_MAX = 0x109f

export const MYANMAR_EXT_A_MIN = 0xaa60
export const MYANMAR_EXT_A_MAX = 0xaa7f
export const MYANMAR_EXT_B_MIN = 0xa9e0
export const MYANMAR_EXT_B_MAX = 0xa9ff
export const MYANMAR_EXT_C_MIN = 0x116d0
export const MYANMAR_EXT_C_MAX = 0x116ff

export const MYANMAR_SCRIPT_RANGES: ReadonlyArray<readonly [number, number]> = [
    [MYANMAR_BLOCK_MIN, MYANMAR_BLOCK_MAX],
    [MYANMAR_EXT_A_MIN, MYANMAR_EXT_A_MAX],
    [MYANMAR_EXT_B_MIN, MYANMAR_EXT_B_MAX],
    [MYANMAR_EXT_C_MIN, MYANMAR_EXT_C_MAX],
]

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

export function isMyanmarCodePoint(code: number): boolean {
    return MYANMAR_SCRIPT_RANGES.some(([min, max]) => code >= min && code <= max)
}

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

export function isMyanmarSyllableHead(code: number): boolean {
    return isBaseLetter(code) || isIndependentVowel(code)
}

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

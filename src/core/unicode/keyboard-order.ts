import { ANUSVARA_TONE, ASAT, DOT_BELOW_TONE, isMyanmarSyllableHead, isPreBaseVowel, isVirama, VOWEL_SIGN_U, VOWEL_SIGN_UU } from './classification'
import { splitMyanmarSyllables } from './myanmar'

function reorderCore(core: string): string {
    const chars = Array.from(core)
    const prebase = chars.filter((c) => isPreBaseVowel(c.codePointAt(0) ?? 0))
    const rest = chars.filter((c) => !isPreBaseVowel(c.codePointAt(0) ?? 0))

    // MyanSan.kms has the smart rule `U103A + U1037 => $2 + $1`.
    // Therefore the canonical stored sequence `့` + `်` is produced by
    // pressing `်` first, then `့`.  Do this *only* for this exact pair:
    // U+1036 (ံ), lower vowels, and other marks retain their typed order.
    for (let i = 0; i + 1 < rest.length; i += 1) {
        if ((rest[i]!.codePointAt(0) ?? 0) === DOT_BELOW_TONE && (rest[i + 1]!.codePointAt(0) ?? 0) === ASAT) {
            const tone = rest[i]!
            rest[i] = rest[i + 1]!
            rest[i + 1] = tone
            i += 1
        }
    }

    // MyanSan keyboards press the anusvara U+1036 (ံ) before the U-type vowel
    // sign (ု U+102F / ူ U+1030), even though it is stored after them: the
    // canonical ပုံ = ပ + ို + ံ is typed as ပ + ံ + ြု. Move U+1036 ahead of the
    // first U/UU vowel sign so the taught press order matches handwriting
    // order. No other mark changes relative position.
    let pressed = rest
    const anusvaraIndex = rest.findIndex((c) => (c.codePointAt(0) ?? 0) === ANUSVARA_TONE)
    const uSignIndex = rest.findIndex((c) => {
        const code = c.codePointAt(0) ?? 0
        return code === VOWEL_SIGN_U || code === VOWEL_SIGN_UU
    })
    if (anusvaraIndex >= 0 && uSignIndex >= 0 && uSignIndex < anusvaraIndex) {
        const out = rest.slice()
        out.splice(uSignIndex, 0, out.splice(anusvaraIndex, 1)[0])
        pressed = out
    }

    // MyanSan uses a filler for U+1031, then moves it before the host base.
    // For a stacked base, U+1031 is entered immediately after the virama.
    if (prebase.length === 0) return pressed.join('')

    const base = chars.findIndex((c) => isMyanmarSyllableHead(c.codePointAt(0) ?? 0))
    const stacked = base > 0 && isVirama(chars[base - 1]!.codePointAt(0) ?? 0)
    if (!stacked) return [...prebase, ...pressed].join('')

    const baseInRest = pressed.findIndex((c) => c === chars[base])
    return (baseInRest < 0 ? [...prebase, ...pressed] : [...pressed.slice(0, baseInRest), ...prebase, ...pressed.slice(baseInRest)]).join('')
}

export function myanmarKeyboardOrder(text: string): string {
    // Keep segmentation in one place. This prevents a multi-base syllable such
    // as "မှန်" (မ + ှ + န + ် + ့) from being interpreted differently by the
    // typing sequence and by the keyboard-order transformer.
    return splitMyanmarSyllables(text).map(reorderCore).join('')
}

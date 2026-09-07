import type { KeyboardLayout } from '@/core/keyboard-layout/layout'
import { getLayoutOrThrow } from '@/core/keyboard-layout/registry'
import { splitMyanmarSyllables } from '@/core/unicode/myanmar'
import type { LanguageDefinition } from './types'

// Logical (stored) Myanmar order: base consonant [medial] [vowels] [tone
// marks] where the pre-base vowel U+1031 comes AFTER the base in storage but
// is typed FIRST (Pyidaungsu). The typing engine already handles the flip via
// keyboardOrderForCluster, so composers here only produce canonical logical
// text and every token is validated against the layout at generation time.

const BASES = ['က', 'ခ', 'င', 'စ', 'ဆ', 'ည', 'တ', 'ထ', 'န', 'ပ', 'ဖ', 'ဘ', 'မ', 'လ', 'သ', 'ဟ', 'အ']
const MEDIALS = ['', 'ျ', 'ြ']
const OPEN_VOWELS = ['ေ', 'ာ', 'ိ', 'ီ', 'ု', 'ု', 'ု', 'ဲ', '်']
const TONE_VOWELS = ['ာ', 'ို', 'ီ', 'ံ']
const TONES = ['', 'း', '့', 'း', 'ံ']

function compose(base: string, medial: string, vowel: string, tone: string): string {
    return `${base}${medial}${vowel}${tone}`
}

function unique(values: string[]): string[] {
    return [...new Set(values)]
}

export function buildMyanmarSyllables(): string[] {
    return unique([
        ...BASES,
        ...BASES.flatMap((base) => OPEN_VOWELS.map((vowel) => compose(base, '', vowel, ''))),
        ...BASES.flatMap((base) => TONE_VOWELS.flatMap((vowel) => TONES.map((tone) => compose(base, '', vowel, tone)))),
        ...BASES.flatMap((base) => MEDIALS.flatMap((medial) => OPEN_VOWELS.map((vowel) => compose(base, medial, vowel, '')))),
    ])
}

export const SHIPPED_WORDS = ['ရေ', 'အဖေ', 'အမေ', 'ခြေ', 'ခွေး', 'နွား', 'လက်တွဲ', 'များ']

export const myanmar: LanguageDefinition = {
    id: 'myanmar',
    layoutId: 'myanmar',
    maxChunkLength: 6,
    banks: {
        core: buildMyanmarSyllables(),
        words: unique([
            ...SHIPPED_WORDS,
            'နေ',
            'တွေ',
            'မြို့',
            'မြေး',
            'ချင်း',
            'ညဘက်',
            'ညည',
            'အောက်',
            'အပေါ်',
            'အနောက်',
            'အရှေ့',
            'မျက်စိ',
            'မျှော်',
        ]),
        sentences: [
            'ရေ ကို သောက် ပါ တယ်။',
            'အဖေ နဲ့ အမေ က အိမ် မှာ ရှိ ကြ တယ်။',
            'ခြေ က နှစ် ချောင်း ရှိ တယ်။',
            'များသော အား ဖြင့် နှင်း က ဖြူ တယ်။',
            'နွား တွေ က မြက် ကို စား ကြ တယ်။',
        ],
    },
    splitUnits: splitMyanmarSyllables,
    joinChunks: (chunks) => chunks.join(' '),
}

export function myanmarLayout(): KeyboardLayout {
    return getLayoutOrThrow('myanmar')
}

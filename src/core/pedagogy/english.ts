import type { KeyboardLayout } from '@/core/keyboard-layout/layout'
import { getLayoutOrThrow } from '@/core/keyboard-layout/registry'
import { splitGraphemes } from '@/core/unicode/graphemes'
import type { LanguageDefinition } from './types'

export const ENGLISH_HOME = ['a', 's', 'd', 'f', 'j', 'k', 'l', ';']
export const ENGLISH_TOP = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p']
export const ENGLISH_BOTTOM = ['z', 'x', 'c', 'v', 'b', 'n', 'm']

export const english: LanguageDefinition = {
    id: 'english',
    layoutId: 'english-qwerty',
    maxChunkLength: 4,
    banks: {
        homeWords: ['as', 'ad', 'df', 'fj', 'jk', 'kl', 'la', 'fa', 'sad', 'dash', 'lad', 'salad'],
        commonWords: ['the', 'and', 'you', 'that', 'with', 'this', 'from', 'have', 'are', 'was', 'your', 'they', 'one', 'two', 'for'],
        phrases: ['the cat', 'and then', 'you are', 'in the', 'of the', 'to be', 'it is', 'we are', 'they said', 'more than'],
        sentences: [
            'the quick brown fox jumps over the lazy dog',
            'pack my box with five dozen liquor jugs',
            'how vexingly quick daft zebras jump',
            'sphinx of black quartz judge my vow',
            'five boxing wizards jump quickly',
            'the five boxing wizards jump quickly',
            'bright vixens jump; dozy fowl quack',
            'jaded zombies acted quaintly but kept driving their oxen forward',
        ],
    },
    splitUnits: splitGraphemes,
    joinChunks: (chunks) => chunks.join(' '),
}

export function englishLayout(): KeyboardLayout {
    return getLayoutOrThrow('english-qwerty')
}
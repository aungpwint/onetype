import { KeyboardLayout, type KeyAlias, type KeyboardLayoutSpec } from './layout'
import { englishQwerty } from './english-qwerty'
import { myanmar } from './myanmar'

const MIXED_REVISION = 1

// A mixed English + Myanmar layout shares the same physical US QWERTY keys as
// English (rows, finger assignment, English plain/shifted labels), while
// registering every Pyidaungsu Myanmar character as an alias on its physical
// key. Because the same physical key produces a Latin letter in English IME
// mode and a Myanmar code point in Myanmar IME mode, reverse mapping must be
// able to recover BOTH the English and the Myanmar spelling of that key — which
// `charMap` supports (many text -> one (code, modifier)). The engine grades
// graders by the ACTUAL typed character (see TypingEngine.processKey), so the
// two scripts never collide on the same physical key.
function myanmarAliases(): KeyAlias[] {
    const aliases: KeyAlias[] = []
    for (const [text, lookup] of myanmar.charMap) {
        aliases.push({ text, code: lookup.code, modifier: lookup.modifier })
    }
    return aliases
}

export const mixedEnglishMyanmar = new KeyboardLayout({
    id: 'english-myanmar-mixed',
    name: 'English + Myanmar',
    language: 'mixed',
    version: MIXED_REVISION,
    source: 'Combined English US QWERTY + Pyidaungsu Myanmar keymaps on the same physical keys. Graded by the actually-typed character so mixed-script text works in one exercise.',
    rows: englishQwerty.rows,
    aliases: myanmarAliases(),
} satisfies KeyboardLayoutSpec)

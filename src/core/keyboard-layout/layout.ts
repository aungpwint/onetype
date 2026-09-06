import type { FingerId, Hand, Modifier } from '@/types'

export type KeyboardRow = 'number' | 'top' | 'home' | 'bottom' | 'space'

export interface KeyDefinition {
    code: string
    label: string
    finger: FingerId
    hand: Hand
    row: KeyboardRow
    plain?: string
    shifted?: string
    width?: number
    kind?: 'key' | 'modifier'
    legend?: string
}

export interface KeyOutput {
    text: string
    modifier: Modifier
}

export interface KeyLookup {
    code: string
    modifier: Modifier
    text: string
    finger: FingerId
    hand: Hand
}

export interface KeyAlias {
    /** Legacy text form accepted as one press of `code` with `modifier`. */
    text: string
    code: string
    modifier: Modifier
}

export interface KeyboardLayoutSpec {
    id: string
    name: string
    language: 'english' | 'myanmar' | 'mixed'
    version: number
    source: string
    rows: KeyDefinition[][]
    space?: KeyDefinition
    note?: string
    /**
     * Additional text forms that reverse-map to an existing key/modifier pair.
     * Used to keep legacy single-codepoint lesson text working when the layout
     * key emits a multi-codepoint sequence (e.g. ၎င်း on KeyR shift).
     */
    aliases?: KeyAlias[]
}

export class KeyboardLayout {
    readonly id: string
    readonly name: string
    readonly language: 'english' | 'myanmar' | 'mixed'
    readonly version: number
    readonly source: string
    readonly rows: KeyDefinition[][]
    readonly space: KeyDefinition
    readonly byCode = new Map<string, KeyDefinition>()
    readonly charMap = new Map<string, KeyLookup>()
    readonly note?: string
    private readonly charKeys: string[] = []

    constructor(spec: KeyboardLayoutSpec) {
        this.id = spec.id
        this.name = spec.name
        this.language = spec.language
        this.version = spec.version
        this.source = spec.source
        this.rows = spec.rows
        this.note = spec.note
        this.space = spec.space ?? {
            code: 'Space',
            label: 'space',
            finger: 'left-thumb',
            hand: 'left',
            row: 'space',
            plain: ' ',
        }
        for (const row of spec.rows) {
            for (const key of row) {
                this.byCode.set(key.code, key)
                if (key.plain === undefined) continue
                this.registerChar(key.plain, key.code, 'none', key.finger, key.hand)
                if (key.shifted !== undefined) {
                    this.registerChar(key.shifted, key.code, 'shift', key.finger, key.hand)
                }
            }
        }
        this.registerChar('\u0020', 'Space', 'none', this.space.finger, this.space.hand)
        for (const alias of spec.aliases ?? []) {
            const key = this.byCode.get(alias.code)
            if (key) this.registerChar(alias.text, alias.code, alias.modifier, key.finger, key.hand)
        }
        this.charKeys = [...this.charMap.keys()].sort((a, b) => b.length - a.length)
    }

    private registerChar(text: string, code: string, modifier: Modifier, finger: FingerId, hand: Hand) {
        if (this.charMap.has(text)) return
        this.charMap.set(text, { code, modifier, text, finger, hand })
    }

    getKey(code: string): KeyDefinition | undefined {
        return this.byCode.get(code)
    }

    outputFor(code: string, modifier: Modifier): KeyOutput | undefined {
        if (code === 'Space') return { text: ' ', modifier: 'none' }
        const key = this.byCode.get(code)
        if (!key) return undefined
        const text = modifier === 'shift' ? key.shifted : key.plain
        if (text === undefined) return undefined
        return { text, modifier }
    }

    lookupChar(text: string): KeyLookup | undefined {
        return this.charMap.get(text)
    }

    reverseMap(tokens: string[]): { lookup: KeyLookup; token: string }[] {
        const out: { lookup: KeyLookup; token: string }[] = []
        for (const token of tokens) {
            let i = 0
            while (i < token.length) {
                const matched = this.matchLongest(token, i)
                if (!matched) {
                    const ch = token[i]
                    throw new Error(`Layout "${this.id}" has no key for character "${ch}" (${ch.codePointAt(0)?.toString(16)})`)
                }
                out.push({ lookup: matched.lookup, token })
                i += matched.text.length
            }
        }
        return out
    }

    private matchLongest(text: string, start: number): { lookup: KeyLookup; text: string } | undefined {
        for (const key of this.charKeys) {
            if (key.length === 0) continue
            if (text.startsWith(key, start)) {
                return { lookup: this.charMap.get(key)!, text: key }
            }
        }
        return undefined
    }
}

/**
 * Returns the hand that should press Shift when typing with the given key hand.
 * Standard touch-typing rule: left-hand keys use right Shift, right-hand keys use left Shift.
 */
export function shiftHandFor(hand: Hand): Hand {
    return hand === 'left' ? 'right' : 'left'
}

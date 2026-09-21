import type { Hand } from '@/types'
import typingClubHandsRaw from './typing-club-hands.svg?raw'

const GROUP_PATTERN = (id: string) => `id="${id}" class="st0"`

export const TYPING_CLUB_VIEWBOX = { width: 716.3, height: 380 }

/** Pose groups that exist in the sprite artwork for each hand. */
const LEFT_GROUP_IDS: ReadonlySet<string> = new Set([
    'tilda',
    'tab',
    'q',
    'w',
    'e',
    'r',
    't',
    'neutral-left',
    'shift-left',
    'a',
    's',
    'd',
    'f',
    'g',
    'z',
    'x',
    'c',
    'v',
    'b',
    'option-left',
    'shift-option-left',
    'key-1',
    'key-2',
    'key-3',
    'key-4',
    'key-5',
])

const RIGHT_GROUP_IDS: ReadonlySet<string> = new Set([
    'neutral-right',
    'equal',
    'minus',
    'key-0',
    'key-9',
    'key-8',
    'key-7',
    'key-6',
    'y',
    'u',
    'i',
    'o',
    'p',
    'open-bracket',
    'close-bracket',
    'h',
    'j',
    'k',
    'l',
    'semicolon',
    'quote',
    'enter',
    'n',
    'm',
    'comma',
    'dot',
    'slash',
    'shift-right',
    'space',
    'backslash',
    'shift-option-right',
    'option-right',
])

const PER_HAND_GROUP_IDS: Readonly<Record<Hand, ReadonlySet<string>>> = {
    left: LEFT_GROUP_IDS,
    right: RIGHT_GROUP_IDS,
}

/** One balanced scan of the raw sprite: splits out every top-level `st0` pose
 *  group into its own XML block and keeps the shared <svg>/<style> head. */
function splitSprite(raw: string): {
    svgHead: string
    groups: Record<Hand, Map<string, string>>
} {
    const groups: Record<Hand, Map<string, string>> = {
        left: new Map(),
        right: new Map(),
    }
    const groupStart = raw.indexOf('<g id=')
    if (groupStart === -1) throw new Error('[hand-assets] typing-club-hands.svg has no pose groups')
    const svgHead = raw.slice(0, groupStart)

    const groupRe = /<g id="([^"]+)" class="st0">/g
    let match: RegExpExecArray | null
    while ((match = groupRe.exec(raw))) {
        const id = match[1]
        const openStart = match.index
        let depth = 1
        let cursor = groupRe.lastIndex
        while (depth > 0) {
            const open = raw.indexOf('<g', cursor)
            const close = raw.indexOf('</g>', cursor)
            if (close === -1) throw new Error(`[hand-assets] unbalanced <g> inside pose group "${id}"`)
            if (open !== -1 && open < close) {
                depth += 1
                cursor = open + 2
            } else {
                depth -= 1
                cursor = close + 4
            }
        }
        const xml = raw.slice(openStart, cursor)
        const side: Hand | null = PER_HAND_GROUP_IDS.left.has(id) ? 'left' : PER_HAND_GROUP_IDS.right.has(id) ? 'right' : null
        if (!side) throw new Error(`[hand-assets] pose group "${id}" is not assigned to a hand`)
        groups[side].set(id, xml)
    }
    return { svgHead, groups }
}

const { svgHead, groups } = splitSprite(typingClubHandsRaw)

/** Cache of built pose sprites, keyed by `${hand}|${sorted group ids}`. Each
 *  hand has ~30 pose groups, so this stays tiny (~30x2 entries), and renders
 *  no longer rebuild or re-parse the 60 KB sprite per keystroke. */
const SPRITE_CACHE = new Map<string, string>()

export function typingClubHandSvg(hand: Hand, visibleGroups: ReadonlySet<string>): string {
    const cacheKey = `${hand}|${[...visibleGroups].sort().join(',')}`
    const cached = SPRITE_CACHE.get(cacheKey)
    if (cached !== undefined) return cached
    const sprite = buildSprite(hand, visibleGroups)
    SPRITE_CACHE.set(cacheKey, sprite)
    return sprite
}

function buildSprite(hand: Hand, visibleGroups: ReadonlySet<string>): string {
    const ownGroups = groups[hand]
    let body = ''
    for (const id of visibleGroups) {
        const xml = ownGroups.get(id)
        if (!xml) continue
        body += xml.replace(GROUP_PATTERN(id), `id="${id}" style="display:block"`)
    }
    return svgHead + body + '</svg>\n'
}
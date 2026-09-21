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

/** True sprite position (typing-club-hands.svg units) of the pressed finger pad
 *  inside each reach pose, recovered from the artwork with getBBox(). These are
 *  the exact spots the fingers land; the overlay measures the real DOM keyboard
 *  and translates each pose so its pad sits dead-centre on the matching key.
 *
 *  Poses handled here carry a press pad that can be read from the artwork.
 *  Reaches without one (bottom row z x m comma dot) and wide/modifier keys
 *  (enter, space, shift-right) are aligned vertically via `POSE_ROW_REFS`. */
export const POSE_PADS: Readonly<Partial<Record<string, { x: number; y: number }>>> = {
    tilda: { x: 121.0, y: 102.2 },
    'key-1': { x: 145.6, y: 106.4 },
    'key-2': { x: 180.4, y: 109.0 },
    'key-3': { x: 204.9, y: 106.2 },
    'key-4': { x: 237.9, y: 103.2 },
    'key-5': { x: 269.2, y: 104.7 },
    'key-6': { x: 299.3, y: 104.3 },
    'key-7': { x: 329.2, y: 109.7 },
    'key-8': { x: 361.0, y: 98.8 },
    'key-9': { x: 393.1, y: 99.1 },
    'key-0': { x: 419.3, y: 100.4 },
    minus: { x: 448.2, y: 100.8 },
    equal: { x: 477.1, y: 103.4 },
    tab: { x: 129.7, y: 137.1 },
    q: { x: 156.5, y: 133.4 },
    w: { x: 191.3, y: 137.1 },
    e: { x: 220.7, y: 135.2 },
    r: { x: 252.8, y: 133.3 },
    t: { x: 277.8, y: 133.4 },
    y: { x: 313.3, y: 131.4 },
    u: { x: 342.8, y: 130.0 },
    i: { x: 374.8, y: 128.8 },
    o: { x: 403.1, y: 133.8 },
    p: { x: 430.6, y: 130.2 },
    'open-bracket': { x: 464.4, y: 128.9 },
    'close-bracket': { x: 488.9, y: 133.5 },
    backslash: { x: 526.0, y: 126.7 },
    a: { x: 170.3, y: 160.4 },
    s: { x: 202.2, y: 158.0 },
    d: { x: 230.8, y: 157.6 },
    f: { x: 261.7, y: 160.4 },
    g: { x: 288.6, y: 160.4 },
    h: { x: 326.0, y: 157.8 },
    j: { x: 355.5, y: 157.0 },
    k: { x: 382.2, y: 149.9 },
    l: { x: 410.6, y: 154.5 },
    semicolon: { x: 442.7, y: 161.4 },
    quote: { x: 474.4, y: 162.4 },
    c: { x: 238.0, y: 181.8 },
    v: { x: 281.4, y: 187.6 },
    b: { x: 303.1, y: 187.5 },
    n: { x: 341.3, y: 186.8 },
    slash: { x: 468.2, y: 185.3 },
    'shift-left': { x: 140.0, y: 188.4 },
}

/** Which hand owns a pose group (left index-anchored on KeyF, right on KeyJ). */
export function poseHand(pose: string): Hand | null {
    return LEFT_GROUP_IDS.has(pose) ? 'left' : RIGHT_GROUP_IDS.has(pose) ? 'right' : null
}

/** Vertical-only tracking for reaches without a press pad in the artwork
 *  (bottom-row z x m comma dot) and for wide/modifier reaches (space thumb,
 *  shift-right). Rows are drawn in fixed viewBox units, so once the sprite is
 *  scaled to the measured keyboard the painted reaches drift away from keys
 *  whose row pitch is a fixed pixel height per breakpoint. Aligning the row or
 *  thumb reference (sprite y, measured from the artwork) to the real key row
 *  keeps them on their keys at every window size; x keeps the artwork's
 *  natural reach, which is horizontally correct at any scale by construction. */
export const POSE_ROW_REFS: Readonly<Partial<Record<string, number>>> = {
    z: 185.63,
    x: 185.63,
    m: 186.05,
    comma: 186.05,
    dot: 186.05,
    'shift-right': 186.05,
    space: 218.3,
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

/** Cache of built pose sprites, keyed by hand. Each hand sprite embeds every
 *  pose group once (hidden, revealed via `data-hand-pose`), so typing that
 *  alternates keys never re-parses or rebuilds the ~60 KB artwork. */
const SPRITE_CACHE = new Map<string, string>()

export function typingClubHandSprite(hand: Hand): string {
    const cached = SPRITE_CACHE.get(hand)
    if (cached !== undefined) return cached
    const sprite = buildHandSprite(hand)
    SPRITE_CACHE.set(hand, sprite)
    return sprite
}

function buildHandSprite(hand: Hand): string {
    const neutralId = hand === 'left' ? 'neutral-left' : 'neutral-right'
    let body = ''
    for (const [id, xml] of groups[hand]) {
        const visible = id === neutralId ? 'block' : 'none'
        body += xml.replace(GROUP_PATTERN(id), `id="${id}" class="st0" data-hand-pose="${id}" style="display:${visible}"`)
    }
    return svgHead + body + '</svg>\n'
}
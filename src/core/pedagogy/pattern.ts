import type { Rng } from './rng'
import type { ChunkStyle, ChunkGenerationOptions, ChunkGenerationResult, DrilledUnit } from './types'

const DEFAULT_MAX_CONSECUTIVE = 3

interface KeyProfile {
    unit: string
    finger: string
    hand: 'left' | 'right'
}

export function profileKeys(keys: readonly string[], unitsOf: (token: string) => DrilledUnit[]): KeyProfile[] {
    const out: KeyProfile[] = []
    const seen = new Set<string>()
    for (const key of keys) {
        if (seen.has(key)) continue
        seen.add(key)
        const unit = unitsOf(key)[0]
        out.push({ unit: key, finger: unit.finger, hand: unit.hand })
    }
    return out
}

function repeatToken(key: string, length: number): string {
    return key.repeat(length)
}

function alternationToken(keys: string[], length: number): string {
    const cycle = keys.length > 1 ? keys : [keys[0]!, keys[0]!]
    let out = ''
    for (let i = 0; i < length; i += 1) {
        out += cycle[i % cycle.length]!
    }
    return out
}

function runsToken(keys: string[], length: number, rng: Rng): string {
    const cycle = keys.length > 1 ? keys : [keys[0]!, keys[0]!]
    const blocks = Math.max(2, Math.min(cycle.length, 3))
    const maxSegment = 4
    const sizes: number[] = []
    let remaining = length
    for (let b = 1; b <= blocks; b += 1) {
        const blocksLeft = blocks - b
        const minSize = Math.max(1, remaining - blocksLeft * maxSegment)
        const maxSize = Math.min(maxSegment, remaining - blocksLeft)
        const size = blocksLeft === 0 ? remaining : rng.int(minSize, maxSize)
        sizes.push(size)
        remaining -= size
    }
    let out = ''
    for (let b = 0; b < blocks; b += 1) {
        out += cycle[b % cycle.length]!.repeat(sizes[b]!)
    }
    return out
}

function variableToken(keys: string[], length: number, rng: Rng, maxConsecutive: number): string {
    let out = ''
    let last = ''
    let run = 0
    for (let i = 0; i < length; i += 1) {
        let next = rng.pick(keys)
        let guard = 0
        while (last.length > 0 && next === last && run >= maxConsecutive && guard < 8) {
            next = rng.pick(keys)
            guard += 1
        }
        if (next === last) {
            run += 1
        } else {
            run = 1
            last = next
        }
        out += next
    }
    return out
}

function transitionToken(profiles: KeyProfile[], length: number, rng: Rng): string {
    let out = ''
    let last: KeyProfile | null = null
    for (let i = 0; i < length; i += 1) {
        let pool = profiles
        if (last !== null) {
            const prev = last
            const differentFinger = profiles.filter((p) => p.finger !== prev.finger)
            pool = differentFinger.length > 0 ? differentFinger : profiles
            const otherHand = pool.filter((p) => p.hand !== prev.hand)
            if (otherHand.length > 0) pool = otherHand
        }
        const next = rng.pick(pool)
        out += next.unit
        last = next
    }
    return out
}

function controlledToken(profiles: KeyProfile[], length: number, rng: Rng): string {
    const left = profiles.filter((p) => p.hand === 'left')
    const right = profiles.filter((p) => p.hand === 'right')
    const bothHands = left.length > 0 && right.length > 0
    const maxHandRun = 4
    let out = ''
    let lastHand: 'left' | 'right' | '' = ''
    let handRun = 0
    let lastFinger = ''
    for (let i = 0; i < length; i += 1) {
        let pool = profiles
        if (bothHands && lastHand !== '') {
            const otherHand = lastHand === 'left' ? right : left
            if (handRun >= maxHandRun || rng.chance(0.5)) {
                pool = otherHand
            }
        }
        if (lastFinger !== '') {
            const differentFinger = pool.filter((p) => p.finger !== lastFinger)
            if (differentFinger.length > 0) pool = differentFinger
        }
        const next = rng.pick(pool)
        out += next.unit
        lastFinger = next.finger
        if (next.hand === lastHand) {
            handRun += 1
        } else {
            handRun = 1
            lastHand = next.hand
        }
    }
    return out
}

const VARIETY_STYLES = ['repetition', 'alternation', 'runs', 'variable', 'transition', 'controlled'] as const

function generateOneToken(profiles: KeyProfile[], length: number, options: ChunkGenerationOptions, rng: Rng): string {
    const keys = profiles.map((p) => p.unit)
    const style: ChunkStyle = options.mixed ? rng.pick(VARIETY_STYLES) : options.style
    const maxConsecutive = options.maxConsecutive || DEFAULT_MAX_CONSECUTIVE
    switch (style) {
        case 'repetition': {
            const repeatLimit = options.mixed ? Math.max(2, maxConsecutive + 1) : length
            return repeatToken(rng.pick(keys), Math.min(length, repeatLimit))
        }
        case 'alternation':
            return alternationToken(keys, length)
        case 'runs':
            return runsToken(keys, length, rng)
        case 'variable':
            return variableToken(keys, length, rng, maxConsecutive)
        case 'transition':
            return transitionToken(profiles, length, rng)
        case 'controlled':
            return controlledToken(profiles, length, rng)
    }
}

export function generateChunkTokens(
    profiles: KeyProfile[],
    options: ChunkGenerationOptions,
    rng: Rng,
): ChunkGenerationResult {
    const tokens: string[] = []
    const units: DrilledUnit[] = []
    const minLength = Math.max(1, options.chunkMin)
    const maxLength = Math.max(minLength, options.chunkMax)
    const covered = new Set<string>()

    let previous: string | null = null

    for (let i = 0; i < options.tokenCount; i += 1) {
        const remaining = options.tokenCount - i

        let token: string
        let guard = 0
        do {
            const length = minLength + rng.int(0, maxLength - minLength)
            token = generateOneToken(profiles, length, options, rng)
            guard += 1
        } while (options.avoidIdenticalAdjacent && previous !== null && token === previous && guard < 16)

        // Guarantee every focus unit survives on the last pass when coverage is
        // still incomplete — prevents a short lesson from silently skipping a key.
        if (covered.size < profiles.length && remaining <= profiles.length - covered.size) {
            const tokenSegments = new Set(unitSegments(token, profiles))
            const missing = profiles.map((p) => p.unit).filter((m) => !tokenSegments.has(m) && !covered.has(m))
            if (missing.length > 0) {
                token = token + missing.join('')
            }
        }

        previous = token
        tokens.push(token)
        for (const segment of unitSegments(token, profiles)) {
            covered.add(segment)
        }
        for (const unit of tokenUnits(token, profiles)) {
            units.push(unit)
        }
    }
    return { tokens, units }
}

export function unitSegments(token: string, profiles: KeyProfile[]): string[] {
    const sorted = profiles.map((p) => p.unit).sort((a, b) => b.length - a.length)
    const segments: string[] = []
    let cursor = 0
    while (cursor < token.length) {
        let matched: string | undefined
        for (const unit of sorted) {
            if (token.startsWith(unit, cursor)) {
                matched = unit
                break
            }
        }
        if (matched === undefined) {
            segments.push(token[cursor]!)
            cursor += 1
        } else {
            segments.push(matched)
            cursor += matched.length
        }
    }
    return segments
}

export function tokenUnits(token: string, profiles: KeyProfile[]): DrilledUnit[] {
    const out: DrilledUnit[] = []
    for (const segment of unitSegments(token, profiles)) {
        const profile = profiles.find((p) => p.unit === segment)
        if (profile) out.push({ text: segment, finger: profile.finger, hand: profile.hand })
    }
    return out
}

export function joinChunks(tokens: string[]): string {
    return tokens.filter((token) => token.length > 0).join(' ')
}

export function maxSameCharacterRun(text: string): number {
    let best = 0
    let run = 0
    let prev = ''
    for (const ch of text.replace(/\s/g, '')) {
        if (ch === prev) {
            run += 1
        } else {
            run = 1
            prev = ch
        }
        if (run > best) best = run
    }
    return best
}

export function countSpaces(text: string): number {
    return (text.match(/ /g) ?? []).length
}

export function meanChunkLength(text: string): number {
    const tokens = text.split(/\s+/).filter((token) => token.length > 0)
    if (tokens.length === 0) return 0
    return tokens.reduce((sum, token) => sum + [...token].length, 0) / tokens.length
}

export function maxConsecutiveSameChunk(text: string): number {
    const tokens = text.split(/\s+/).filter((token) => token.length > 0)
    let best = 1
    let run = 1
    for (let i = 1; i < tokens.length; i += 1) {
        if (tokens[i] === tokens[i - 1]) {
            run += 1
            if (run > best) best = run
        } else {
            run = 1
        }
    }
    return best
}

export function distinctTokenRatio(text: string): number {
    const tokens = text.split(/\s+/).filter((token) => token.length > 0)
    if (tokens.length <= 1) return 1
    return new Set(tokens).size / tokens.length
}
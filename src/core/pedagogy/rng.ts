export interface Rng {
    next(): number
    range(min: number, max: number): number
    int(minInclusive: number, maxInclusive: number): number
    pick<T>(items: readonly T[]): T
    shuffle<T>(items: readonly T[]): T[]
    chance(probability: number): boolean
}

function mulberry32(seed: number): () => number {
    let state = seed >>> 0
    return () => {
        state += 0x6d2b79f5
        let t = state
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

export function hashString(value: string): number {
    let hash = 0x811c9dc5
    for (let i = 0; i < value.length; i += 1) {
        hash ^= value.charCodeAt(i)
        hash = Math.imul(hash, 0x01000193)
    }
    return hash >>> 0
}

export function createRng(seedSource: string | number): Rng {
    const seed = typeof seedSource === 'string' ? hashString(seedSource) : seedSource >>> 0
    const next = mulberry32(seed)
    return {
        next,
        range(min, max) {
            return min + next() * (max - min)
        },
        int(minInclusive, maxInclusive) {
            return minInclusive + Math.floor(next() * (maxInclusive - minInclusive + 1))
        },
        pick(items) {
            if (items.length === 0) throw new Error('Rng.pick cannot pick from an empty list')
            return items[Math.floor(next() * items.length)]!
        },
        shuffle(items) {
            const out = [...items]
            for (let i = out.length - 1; i > 0; i -= 1) {
                const j = Math.floor(next() * (i + 1))
                const tmp = out[i]
                out[i] = out[j]!
                out[j] = tmp!
            }
            return out
        },
        chance(probability) {
            return next() < probability
        },
    }
}
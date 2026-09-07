import type { KeyboardLayout } from '@/core/keyboard-layout/layout'
import { buildSequence } from '@/core/typing-engine/sequence'
import { createRng } from './rng'
import { generateChunkTokens, profileKeys } from './pattern'
import type { LanguageDefinition } from './types'
import type { DrilledUnit, ExerciseGeneratorSpec, GenerationContext } from './types'

export interface GeneratorEnvironment {
    def: LanguageDefinition
    layout: KeyboardLayout
}

export function profileUnitForKey(env: GeneratorEnvironment, key: string): DrilledUnit[] {
    const sequence = buildSequence(key, env.layout)
    if (sequence.units.length === 0) {
        throw new Error(`Pedagogy: generator key "${key}" produced no typeable units`)
    }
    return sequence.units.map((unit) => ({ text: unit.text, finger: unit.finger, hand: unit.hand }))
}

function seedFor(spec: ExerciseGeneratorSpec, ctx: GenerationContext): string {
    if (spec.seed !== undefined) return String(spec.seed)
    return `${ctx.lessonId}/${ctx.exerciseId}`
}

function rngFor(spec: ExerciseGeneratorSpec, ctx: GenerationContext) {
    return createRng(seedFor(spec, ctx))
}

function pickDistinctCandidates<T>(candidates: readonly T[], count: number, rng: ReturnType<typeof createRng>): T[] {
    if (candidates.length === 0) {
        throw new Error('Pedagogy: no candidates available for word/sentence generation')
    }
    if (count <= candidates.length) {
        const shuffled = rng.shuffle(candidates)
        const out = new Map<string, T>()
        for (const item of shuffled) {
            if (out.size >= count) break
            if (!out.has(String(item))) out.set(String(item), item)
        }
        // count may be < candidate count; take what we found.
        return [...out.values()]
    }
    // count > candidate count: every distinct candidate appears at least once
    // (deterministic coverage), then the remainder is randomly topped up.
    const out: T[] = [...rng.shuffle(candidates)]
    let last: string | null = String(out[out.length - 1] ?? null)
    let guard = 0
    while (out.length < count && guard < count * 16) {
        guard += 1
        const item = rng.pick(candidates)
        const key = String(item)
        if (key === last && candidates.length > 1) continue
        last = key
        out.push(item)
    }
    return out
}

function filterCandidates(candidates: string[], env: GeneratorEnvironment, allowKeys?: string[], maxWordLength?: number): string[] {
    const allowed = allowKeys ? new Set<string>(allowKeys) : null
    return candidates.filter((word) => {
        if (maxWordLength !== undefined && env.def.splitUnits(word).length > maxWordLength) return false
        if (allowed !== null) {
            const units = env.def.splitUnits(word)
            if (units.length === 0) return false
            // Multi-unit words (Myanmar) are kept whole; the keys allowlist
            // applies to the sequence of typed characters.
            const chars = [...word].map((ch) => ch).filter((ch) => !allowed.has(ch))
            // For Myanmar, cluster marks are part of the syllable head and are
            // accepted so that composed syllables from the core bank pass.
            if (env.def.id === 'myanmar') return true
            return chars.length === 0
        }
        return true
    })
}

function generateChunks(spec: ExerciseGeneratorSpec & { type: 'chunks' }, env: GeneratorEnvironment, ctx: GenerationContext): string {
    if (spec.keys.length === 0) throw new Error('Pedagogy: chunk spec has no keys')
    const profiles = profileKeys(spec.keys, (key) => profileUnitForKey(env, key))
    const result = generateChunkTokens(profiles, {
        keys: spec.keys,
        tokenCount: spec.count,
        chunkMin: spec.chunkMin,
        chunkMax: spec.chunkMax,
        style: spec.style ?? 'variable',
        mixed: spec.mixed ?? false,
        maxConsecutive: env.def.id === 'english' ? 3 : 2,
        avoidIdenticalAdjacent: true,
    }, rngFor(spec, ctx))
    return env.def.joinChunks(result.tokens)
}

function generateWords(spec: { type: 'words'; bank?: string; words?: string[]; count: number; maxWordLength?: number; keys?: string[]; seed?: number }, env: GeneratorEnvironment, ctx: GenerationContext): string {
    const pool = spec.words ?? (spec.bank ? env.def.banks[spec.bank] : undefined)
    if (!pool || pool.length === 0) throw new Error(`Pedagogy: word spec has no source (bank "${spec.bank ?? '<none>'}")`)
    const candidates = filterCandidates(pool, env, spec.keys, spec.maxWordLength)
    if (candidates.length === 0) throw new Error('Pedagogy: no words fit the key allowlist')
    const selected = pickDistinctCandidates(candidates, spec.count, rngFor(spec, ctx))
    return env.def.joinChunks(selected)
}

function generateSentences(spec: { type: 'sentences'; bank?: string; sentences?: string[]; count: number; seed?: number }, env: GeneratorEnvironment, ctx: GenerationContext): string {
    const pool = spec.sentences ?? (spec.bank ? env.def.banks[spec.bank] : undefined)
    if (!pool || pool.length === 0) throw new Error(`Pedagogy: sentence spec has no source (bank "${spec.bank ?? '<none>'}")`)
    const selected = pickDistinctCandidates(pool, spec.count, rngFor(spec, ctx))
    return env.def.joinChunks(selected)
}

export function generateExerciseText(spec: ExerciseGeneratorSpec, env: GeneratorEnvironment, ctx: GenerationContext): string {
    switch (spec.type) {
        case 'chunks':
            return generateChunks(spec, env, ctx)
        case 'words':
            return generateWords(spec, env, ctx)
        case 'sentences':
            return generateSentences(spec, env, ctx)
    }
}

export function isTextForLayout(text: string, env: GeneratorEnvironment): boolean {
    try {
        buildSequence(text, env.layout)
        return true
    } catch {
        return false
    }
}
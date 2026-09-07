import { describe, expect, it } from 'vitest'
import {
    assessLessonQuality,
    buildMyanmarSyllables,
    computeDifficultyProfile,
    createRng,
    difficultyScore,
    englishLayout,
    generateLessonExerciseText,
    languageDefinitionFor,
    maxConsecutiveSameChunk,
    meanChunkLength,
    myanmarLayout,
    profileUnitForKey,
} from '@/core/pedagogy'
import { buildSequence } from '@/core/typing-engine/sequence'
import { splitMyanmarSyllables } from '@/core/unicode/myanmar'
import type { ExerciseGeneratorSpec, GenerationContext, UnitLike } from '@/core/pedagogy'

const englishCtx: GenerationContext = { lessonId: 'lesson-en-beginner-001', exerciseId: '1' }

function chunkSpec(overrides: Partial<ExerciseGeneratorSpec & { style: string; mixed: boolean; seed: number }> = {}): ExerciseGeneratorSpec {
    return {
        type: 'chunks',
        keys: ['f', 'j'],
        count: 12,
        chunkMin: 3,
        chunkMax: 5,
        style: 'variable',
        ...overrides,
    } as ExerciseGeneratorSpec
}

describe('pedagogy rng', () => {
    it('is deterministic for the same seed and varies across seeds', () => {
        const a = createRng('abc')
        const b = createRng('abc')
        expect(a.pick(['x', 'y', 'z'])).toBe(b.pick(['x', 'y', 'z']))
        const c = createRng('abd')
        const values = new Set<string>()
        for (let i = 0; i < 30; i += 1) values.add(String(c.int(0, 1000)))
        expect(values.size).toBeGreaterThan(1)
    })

    it('never picks from an empty list', () => {
        const rng = createRng('seed')
        expect(() => rng.pick([])).toThrow()
    })
})

describe('pedagogy generator — determinism', () => {
    it('produces identical text for the identical seed and lesson id', () => {
        const spec = chunkSpec()
        const first = generateLessonExerciseText(spec, englishCtx, 'english')
        const second = generateLessonExerciseText(spec, englishCtx, 'english')
        expect(first).toBe(second)
    })

    it('varies output when the seed changes', () => {
        const outputs = new Set<string>()
        for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
            outputs.add(generateLessonExerciseText(chunkSpec({ seed }), englishCtx, 'english'))
        }
        expect(outputs.size).toBeGreaterThanOrEqual(3)
    })
})

describe('pedagogy generator — spacing', () => {
    it('never separates every unit with a space when chunks are used', () => {
        const spec = chunkSpec({ chunkMin: 3, chunkMax: 6 })
        const text = generateLessonExerciseText(spec, englishCtx, 'english')
        expect(meanChunkLength(text)).toBeGreaterThanOrEqual(3)
        const tokens = text.split(/\s+/)
        expect(tokens.every((token) => token.length >= 2)).toBe(true)
        expect(text.trim().length).toBe(text.length)
    })

    it('does not produce empty tokens or double spaces', () => {
        const text = generateLessonExerciseText(chunkSpec({ count: 25 }), englishCtx, 'english')
        expect(text.split(/\s+/).every((token) => token.length > 0)).toBe(true)
        expect(text.includes('  ')).toBe(false)
    })

    it('avoids repeating the same chunk twice in a row', () => {
        const text = generateLessonExerciseText(chunkSpec({ count: 40, chunkMin: 2, chunkMax: 3 }), englishCtx, 'english')
        expect(maxConsecutiveSameChunk(text)).toBe(1)
    })
})

describe('pedagogy generator — key coverage', () => {
    it('includes every target key at least once', () => {
        const keys = ['a', 's', 'd', 'f', 'j', 'k']
        const text = generateLessonExerciseText(chunkSpec({ keys, count: 10, chunkMin: 2, chunkMax: 3 }), englishCtx, 'english')
        for (const key of keys) expect(text).toContain(key)
    })

    it('limits the longest same-key run inside multi-key variable tokens', () => {
        const text = generateLessonExerciseText(chunkSpec({ keys: ['f', 'd', 'j'], count: 30, chunkMin: 4, chunkMax: 5 }), englishCtx, 'english')
        const maxRun = Math.max(
            ...text
                .split(' ')
                .map((token) => (token.match(/(.)\1*/g) ?? []).map((m) => m.length))
                .map((runs) => (runs.length ? Math.max(...runs) : 0)),
        )
        expect(maxRun).toBeLessThanOrEqual(3)
    })
})

describe('pedagogy generator — words', () => {
    it('filters a word bank by an explicit key allowlist', () => {
        const spec: ExerciseGeneratorSpec = { type: 'words', bank: 'commonWords', count: 8, keys: ['t', 'h', 'e', 'a'] }
        const text = generateLessonExerciseText(spec, englishCtx, 'english')
        for (const word of text.split(' ')) {
            expect(word).toMatch(/^[thea]+$/)
        }
    })

    it('throws when no word fits the allowlist', () => {
        const spec: ExerciseGeneratorSpec = { type: 'words', bank: 'commonWords', count: 3, keys: ['z', 'q', 'x'] }
        expect(() => generateLessonExerciseText(spec, englishCtx, 'english')).toThrow()
    })
})

describe('pedagogy generator — myanmar', () => {
    const mCtx: GenerationContext = { lessonId: 'lesson-my-beginner-001', exerciseId: '1' }

    it('builds a bank of syllables that are all typeable in the myanmar layout', () => {
        const layout = myanmarLayout()
        const syllables = buildMyanmarSyllables()
        expect(syllables.length).toBeGreaterThan(20)
        for (const syllable of syllables) {
            expect(() => buildSequence(syllable, layout)).not.toThrow()
            // Syllable split round-trips: the cluster is a single unit.
            const units = splitMyanmarSyllables(syllable)
            expect(units.join('')).toBe(syllable)
        }
    })

    it('generates deterministically with myanmar keys', () => {
        const spec = chunkSpec({ keys: ['က', 'န', 'ပ', 'မ'] })
        const first = generateLessonExerciseText(spec, mCtx, 'myanmar')
        const second = generateLessonExerciseText(spec, mCtx, 'myanmar')
        expect(first).toBe(second)
        expect(() => buildSequence(first, myanmarLayout())).not.toThrow()
        // Myanmar clusters must never be split by spaces mid-cluster.
        for (const token of first.split(' ')) {
            const units = splitMyanmarSyllables(token)
            expect(units.join('')).toBe(token)
        }
    })

    it('throws when a chunk key is not typeable', () => {
        expect(() => profileUnitForKey({ def: languageDefinitionFor('myanmar'), layout: myanmarLayout() }, 'z')).toThrow()
    })
})

describe('pedagogy difficulty', () => {
    function unit(keyCode: string, finger: string, hand: 'left' | 'right', modifier: 'none' | 'shift' = 'none', grapheme = keyCode): UnitLike {
        return { keyCode, modifier, finger, hand, grapheme }
    }

    it('scores same-hand/same-finger runs harder than alternating-hand drills', () => {
        const tenseUnits = [
            unit('KeyA', 'left-pinky', 'left'),
            unit('KeyA', 'left-pinky', 'left'),
            unit('KeyS', 'left-ring', 'left'),
            unit('KeyS', 'left-ring', 'left'),
            unit('KeyD', 'left-middle', 'left'),
            unit('KeyD', 'left-middle', 'left'),
            unit('KeyD', 'left-middle', 'left'),
        ]
        const relaxedUnits = [
            unit('KeyA', 'left-pinky', 'left'),
            unit('KeyJ', 'right-index', 'right'),
            unit('KeyD', 'left-middle', 'left'),
            unit('KeyK', 'right-middle', 'right'),
            unit('KeyF', 'left-index', 'left'),
            unit('KeyL', 'right-ring', 'right'),
        ]
        expect(difficultyScore(tenseUnits, 'aassddd')).toBeGreaterThan(difficultyScore(relaxedUnits, 'ajdkfl'))
    })

    it('computes a normalized 0..1 profile', () => {
        const profile = computeDifficultyProfile(
            [unit('KeyA', 'left-pinky', 'left'), unit('KeyJ', 'right-index', 'right'), unit('KeyK', 'right-middle', 'right')],
            'ajk',
        )
        expect(profile.score).toBeGreaterThanOrEqual(0)
        expect(profile.score).toBeLessThanOrEqual(1)
        expect(profile.dimensions.uniqueKeys).toBe(3)
    })
})

describe('pedagogy quality', () => {
    it('penalizes a space-after-every-key drill and passes a chunk drill', () => {
        const layout = englishLayout()
        const poor = assessLessonQuality({ text: 'f f f j j j j', layout })
        const good = assessLessonQuality({
            text: generateLessonExerciseText(chunkSpec({ chunkMin: 3, chunkMax: 5 }), englishCtx, 'english'),
            layout,
        })
        expect(poor.factors.spacingScore).toBeLessThan(1)
        expect(poor.score).toBeLessThan(good.score)
        expect(good.factors.spacingScore).toBe(1)
    })
})

describe('pedagogy generator — transition style', () => {
    function tokenRunStats(text: string): number[] {
        return text.split(' ').map((token) => {
            const chars = [...token]
            let best = 1
            let run = 1
            for (let i = 1; i < chars.length; i += 1) {
                if (chars[i] === chars[i - 1]) {
                    run += 1
                    if (run > best) best = run
                } else {
                    run = 1
                }
            }
            return chars.length > 0 ? best : 0
        })
    }

    it('never repeats a key twice in a row inside a transition token', () => {
        const text = generateLessonExerciseText(
            chunkSpec({ keys: ['f', 'j', 'k'], style: 'transition', count: 30, chunkMin: 2, chunkMax: 3 }),
            englishCtx,
            'english',
        )
        expect(Math.max(...tokenRunStats(text))).toBe(1)
    })

    it('produces crossing pairs for a two-key set (fj / jf, never ff / jj)', () => {
        const text = generateLessonExerciseText(
            chunkSpec({ keys: ['f', 'j'], style: 'transition', count: 20, chunkMin: 2, chunkMax: 2 }),
            englishCtx,
            'english',
        )
        for (const token of text.split(' ')) {
            expect(['fj', 'jf']).toContain(token)
        }
        expect(new Set(text.split(' ')).size).toBeGreaterThanOrEqual(2)
    })

    it('prefers the other hand between units when both hands are present', () => {
        const text = generateLessonExerciseText(
            chunkSpec({ keys: ['f', 'a', 'j', 'k'], style: 'transition', count: 30, chunkMin: 3, chunkMax: 3 }),
            englishCtx,
            'english',
        )
        const tokens = text.split(' ')
        const crossHand = tokens.filter((token) => {
            const charToHand: Record<string, 'left' | 'right'> = { f: 'left', a: 'left', j: 'right', k: 'right' }
            const hands = [...token].map((ch) => charToHand[ch])
            if (hands.length < 2) return true
            return hands.some((hand, i) => i > 0 && hand !== hands[i - 1])
        })
        expect(crossHand.length / tokens.length).toBeGreaterThan(0.5)
    })

    it('is deterministic for a fixed seed', () => {
        const spec = chunkSpec({ keys: ['f', 'd', 'j', 'k'], style: 'transition', seed: 42 })
        expect(generateLessonExerciseText(spec, englishCtx, 'english')).toBe(generateLessonExerciseText(spec, englishCtx, 'english'))
    })
})

describe('pedagogy generator — controlled style', () => {
    it('never repeats the same finger consecutively when multiple fingers are available', () => {
        const keys = ['a', 's', 'd', 'j', 'k', 'l']
        const text = generateLessonExerciseText(
            chunkSpec({ keys, style: 'controlled', count: 40, chunkMin: 3, chunkMax: 4 }),
            englishCtx,
            'english',
        )
        const fingerOf: Record<string, string> = { a: 'left-pinky', s: 'left-ring', d: 'left-middle', j: 'right-index', k: 'right-middle', l: 'right-ring' }
        for (const token of text.split(' ')) {
            const fingers = [...token].map((ch) => fingerOf[ch]!)
            for (let i = 1; i < fingers.length; i += 1) {
                expect(fingers[i]).not.toBe(fingers[i - 1])
            }
        }
    })

    it('alternates hands and never stays on one hand for more than four units', () => {
        const text = generateLessonExerciseText(
            chunkSpec({ keys: ['a', 's', 'd', 'f', 'j', 'k', 'l'], style: 'controlled', count: 40, chunkMin: 4, chunkMax: 5 }),
            englishCtx,
            'english',
        )
        const handOf: Record<string, 'left' | 'right'> = { a: 'left', s: 'left', d: 'left', f: 'left', j: 'right', k: 'right', l: 'right' }
        let handRun = 1
        let maxHandRun = 1
        for (const token of text.split(' ')) {
            const hands = [...token].map((ch) => handOf[ch])
            for (let i = 1; i < hands.length; i += 1) {
                if (hands[i] === hands[i - 1]) {
                    handRun += 1
                    if (handRun > maxHandRun) maxHandRun = handRun
                } else {
                    handRun = 1
                }
            }
            handRun = 1
        }
        expect(maxHandRun).toBeLessThanOrEqual(4)
        expect(maxHandRun).toBeGreaterThanOrEqual(1)
    })

    it('is deterministic for a fixed seed', () => {
        const spec = chunkSpec({ keys: ['a', 's', 'd', 'j', 'k', 'l'], style: 'controlled', seed: 7 })
        expect(generateLessonExerciseText(spec, englishCtx, 'english')).toBe(generateLessonExerciseText(spec, englishCtx, 'english'))
    })
})

describe('pedagogy spec guards', () => {
    it('recognizes chunk specs', () => {
        const spec: ExerciseGeneratorSpec = { type: 'chunks', keys: ['a'], count: 1, chunkMin: 1, chunkMax: 1 }
        expect(spec.type).toBe('chunks')
    })
})
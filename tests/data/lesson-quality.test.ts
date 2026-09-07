import { beforeAll, describe, expect, it } from 'vitest'
import { getCanonicalLesson, getLessonRepository } from '@/data/curriculum'
import type { Lesson } from '@/types/lesson'
import { type GeneratedExercise, exerciseText, isGeneratedExercise } from '@/types/exercise'
import {
    assessLessonQuality,
    countSpaces,
    distinctTokenRatio,
    englishLayout,
    environmentFor,
    maxConsecutiveSameChunk,
    maxSameCharacterRun,
    meanChunkLength,
    myanmarLayout,
    profileUnitForKey,
    targetDifficultyForLabel,
} from '@/core/pedagogy'

// Soft floor: a lesson below this score is monotony/interruption-heavy and must
// be reworked. Hard structural invariants (spacing, coverage, token shape) live
// in the dedicated tests below.
const QUALITY_FLOOR = 50
const PLANNED = 126

function generatedOf(lesson: Lesson): GeneratedExercise[] {
    return lesson.exercises.filter(isGeneratedExercise) as GeneratedExercise[]
}

function languageIdOf(lesson: Lesson): string {
    return lesson.language === 'my' ? 'myanmar' : 'english'
}

// Single-hand concentration drills (finger stretch, one-hand shift work, etc.)
// score low on hand/finger-balance *by design*; the difficulty model treats
// same-hand tension as hard. The structural tests above still gate them on
// spacing/repetition/variety/coverage. The difficulty-aware floor applies only
// to exercises whose units actually span both hands, where balance is a
// legitimate quality signal.
function spansBothHands(lesson: Lesson, exercise: GeneratedExercise): boolean {
    const gen = exercise.generator
    const env = environmentFor(languageIdOf(lesson))
    let keys: string[]
    if (gen.type === 'chunks') {
        keys = gen.keys
    } else if (gen.type === 'words') {
        keys = (gen.words ?? env.def.banks[gen.bank ?? ''] ?? [])
            .filter((word) => environmentFor(languageIdOf(lesson)).def.splitUnits(word).length > 0)
            .flatMap((word) => [...environmentFor(languageIdOf(lesson)).def.splitUnits(word)])
    } else {
        keys = (gen.sentences ?? env.def.banks[gen.bank ?? ''] ?? [])
            .filter((sentence) => environmentFor(languageIdOf(lesson)).def.splitUnits(sentence).length > 0)
            .flatMap((sentence) => environmentFor(languageIdOf(lesson)).def.splitUnits(sentence))
    }
    const hands = new Set<string>()
    for (const key of keys) {
        const units = profileUnitForKey(env, key)
        if (units.length > 0) {
            hands.add(units[0]!.hand)
            hands.add(units[units.length - 1]!.hand)
        }
    }
    return hands.size > 1
}

function layoutOf(lesson: Lesson) {
    return languageIdOf(lesson) === 'myanmar' ? myanmarLayout() : englishLayout()
}

async function allGeneratedExercises(): Promise<{ lesson: Lesson; exercise: GeneratedExercise; text: string }[]> {
    const out: { lesson: Lesson; exercise: GeneratedExercise; text: string }[] = []
    const lessons = (await getLessonRepository()).getLessons()
    for (const meta of lessons) {
        const lesson = await getCanonicalLesson(meta.id)
        for (const exercise of generatedOf(lesson)) {
            const text = exerciseText(exercise, { lessonId: lesson.id, languageId: languageIdOf(lesson) })
            out.push({ lesson, exercise, text })
        }
    }
    return out
}

describe('generated lesson content quality', () => {
    let all: { lesson: Lesson; exercise: GeneratedExercise; text: string }[] = []
    beforeAll(async () => {
        all = await allGeneratedExercises()
        expect(all.length).toBeGreaterThanOrEqual(PLANNED)
    })

    it('every planned lesson resolves to clean, non-empty, well-separated text', () => {
        for (const { lesson, text } of all) {
            expect(text.length, `${lesson.id}`).toBeGreaterThan(0)
            expect(text.trim(), `${lesson.id}`).toBe(text)
            expect(text.includes('  '), `${lesson.id}`).toBe(false)
        }
    })

    it('keeps exactly the declared token count (chunks/words: count items joined by spaces)', () => {
        for (const { lesson, exercise, text } of all) {
            const gen = exercise.generator
            if (gen.type === 'sentences') continue
            // Word items may legitimately carry internal spaces (e.g. "red; blue;");
            // exact token-count only holds for single-token items and chunks.
            if (gen.type === 'words' && (gen.words ?? []).some((word) => word.includes(' '))) continue
            expect(countSpaces(text), `${lesson.id}/${exercise.id}`).toBe(gen.count - 1)
            const tokens = text.split(/\s+/).filter((token) => token.length > 0)
            expect(tokens.length, `${lesson.id}/${exercise.id}`).toBe(gen.count)
        }
    })

    it('chunk drills stay chunked: every token spans at least chunkMin units', () => {
        for (const { lesson, exercise, text } of all) {
            if (exercise.generator.type !== 'chunks') continue
            expect(meanChunkLength(text), `${lesson.id}/${exercise.id}`).toBeGreaterThanOrEqual(exercise.generator.chunkMin)
        }
    })

    it('chunk drills cover every target key at least once', () => {
        for (const { lesson, exercise, text } of all) {
            if (exercise.generator.type !== 'chunks') continue
            for (const key of exercise.generator.keys) {
                expect(text.includes(key), `${lesson.id}/${exercise.id} should include ${key}`).toBe(true)
            }
        }
    })

    it('never runs the same chunk twice in a row and caps runs inside each token', () => {
        for (const { lesson, exercise, text } of all) {
            if (exercise.generator.type !== 'chunks') continue
            // The generator re-rolls length+content to avoid identical neighbours;
            // a fixed-length alternating drill with 2 keys may still pair up twice.
            expect(maxConsecutiveSameChunk(text), `${lesson.id}/${exercise.id}`).toBeLessThanOrEqual(2)
            if (languageIdOf(lesson) === 'english') {
                for (const token of text.split(' ')) {
                    expect(maxSameCharacterRun(token), `${lesson.id}/${exercise.id} token "${token}"`).toBeLessThanOrEqual(4)
                }
            }
        }
    })

    it('transition drills never glue the same unit twice inside one token', () => {
        for (const { lesson, exercise, text } of all) {
            const gen = exercise.generator
            if (gen.type !== 'chunks' || gen.style !== 'transition') continue
            for (const token of text.split(' ')) {
                for (const unit of gen.keys) {
                    expect(token.includes(unit + unit), `${lesson.id}/${exercise.id} token "${token}" glued ${unit}`).toBe(false)
                }
            }
        }
    })

    it('multi-key drills keep enough variety to avoid devolving into one repeated token', () => {
        for (const { lesson, exercise, text } of all) {
            const gen = exercise.generator
            if (gen.type !== 'chunks') continue
            if (gen.keys.length < 2) continue
            if (gen.style === 'repetition') continue
            expect(distinctTokenRatio(text), `${lesson.id}/${exercise.id}`).toBeGreaterThanOrEqual(0.1)
        }
    })

    it('achieves the difficulty-aware quality floor with complete target coverage', () => {
        const failures: string[] = []
        for (const { lesson, exercise, text } of all) {
            const quality = assessLessonQuality({
                text,
                layout: layoutOf(lesson),
                spec: exercise.generator,
                mode: 'drill',
                targetDifficulty: targetDifficultyForLabel(lesson.difficulty),
            })
            expect(quality.factors.targetCoverageScore, `${lesson.id}/${exercise.id}`).toBe(1)
            if (!spansBothHands(lesson, exercise)) continue
            if (quality.score < QUALITY_FLOOR) {
                failures.push(`${lesson.id}/${exercise.id}: score ${quality.score} (${quality.issues.join('; ')})`)
            }
        }
        expect(failures, `exercises below quality floor ${QUALITY_FLOOR}`).toEqual([])
    })
})
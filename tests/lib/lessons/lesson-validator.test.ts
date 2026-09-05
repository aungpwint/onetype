import { describe, expect, it } from 'vitest'
import type { Lesson } from '@/types/lesson'
import { parseLesson, validateLesson } from '@/lib/lessons/lesson-validator'
import { normalizeLesson } from '@/lib/lessons/lesson-normalizer'
import { exerciseText, type LessonExercise } from '@/types/exercise'
import { LessonParseError, LessonValidationError, UnsupportedExerciseTypeError, UnsupportedLessonSchemaError } from '@/lib/lessons/lesson-errors'

function canonicalLesson(overrides: Partial<Lesson> = {}): Lesson {
    return {
        schemaVersion: 1,
        id: 'lesson-test-beginner-1',
        level: 'beginner',
        language: 'en',
        number: 1,
        title: 'Sample',
        description: 'A sample lesson',
        difficulty: 'basic',
        estimatedMinutes: 5,
        keyboard: 'qwerty',
        completion: { minAccuracy: 85, minWpm: null },
        exercises: [{ id: 'lesson-test-beginner-1-ex-1', kind: 'text', text: 'the quick fox' }],
        ...overrides,
    }
}

describe('exerciseText', () => {
    it('expands key exercises with repeats', () => {
        const exercise: LessonExercise = { id: 'e1', kind: 'keys', keys: ['f', 'j'], repeats: 2 }
        expect(exerciseText(exercise)).toBe('f f j j')
    })

    it('joins words and sentences with spaces', () => {
        expect(exerciseText({ id: 'e1', kind: 'words', words: ['hello', 'world'] })).toBe('hello world')
        expect(exerciseText({ id: 'e1', kind: 'sentences', sentences: ['one.', 'two.'] })).toBe('one. two.')
    })

    it('returns bare text as-is', () => {
        expect(exerciseText({ id: 'e1', kind: 'text', text: 'abc' })).toBe('abc')
        expect(exerciseText({ id: 'e1', kind: 'paragraph', text: 'abc def' })).toBe('abc def')
        expect(exerciseText({ id: 'e1', kind: 'custom', text: 'abc', subtype: 'x' })).toBe('abc')
    })
})

describe('validateLesson', () => {
    it('accepts a minimal canonical lesson', () => {
        const lesson = validateLesson(canonicalLesson())
        expect(lesson.id).toBe('lesson-test-beginner-1')
        expect(lesson.exercises).toHaveLength(1)
    })

    it('rejects an unsupported schema version', () => {
        expect(() => validateLesson(canonicalLesson({ schemaVersion: 99 }))).toThrow(UnsupportedLessonSchemaError)
    })

    it('rejects an unknown exercise kind', () => {
        const raw = { ...canonicalLesson(), exercises: [{ id: 'ex1', kind: 'chords', text: 'x' }] }
        expect(() => validateLesson(raw)).toThrow(UnsupportedExerciseTypeError)
    })

    it('rejects corrupt behavioural fields with accumulated issues', () => {
        const raw = {
            ...canonicalLesson(),
            number: -3,
            language: 'fr',
            level: 'master',
            keyboard: 'klingon',
            completion: { minAccuracy: 130, minWpm: 'fast' },
        } as unknown
        let error: unknown = null
        try {
            validateLesson(raw)
        } catch (e) {
            error = e
        }
        expect(error).toBeInstanceOf(LessonValidationError)
        const issues = (error as LessonValidationError).issues
        expect(issues.join(' ')).toContain('number')
        expect(issues.join(' ')).toContain('language')
        expect(issues.join(' ')).toContain('level')
        expect(issues.join(' ')).toContain('keyboard')
        expect(issues.join(' ')).toContain('completion')
    })

    it('rejects an empty exercises array', () => {
        expect(() => validateLesson(canonicalLesson({ exercises: [] }))).toThrow(LessonValidationError)
    })
})

describe('parseLesson', () => {
    it('returns a typed lesson from JSON text', () => {
        const parsed = parseLesson(JSON.stringify(canonicalLesson()), 'sample.json')
        expect(parsed).toEqual(canonicalLesson())
    })

    it('throws LessonParseError on malformed JSON', () => {
        expect(() => parseLesson('{ not json', 'sample.json')).toThrow(LessonParseError)
    })
})

describe('normalizeLesson', () => {
    it('maps canonical identifiers to legacy runtime values', () => {
        const en = normalizeLesson(canonicalLesson())
        expect(en.language).toBe('english')
        expect(en.layoutId).toBe('english-qwerty')

        const my = normalizeLesson(canonicalLesson({ id: 'lesson-my-beginner-1', language: 'my', keyboard: 'myanmar3' }))
        expect(my.language).toBe('myanmar')
        expect(my.layoutId).toBe('myanmar3')
    })

    it('derives phases and falls back instruction to text', () => {
        const lesson = canonicalLesson({
            exercises: [
                { id: 'ex1', kind: 'text', text: 'abc', instruction: 'Type abc' },
                { id: 'ex2', kind: 'keys', keys: ['f'], repeats: 2 },
            ],
        })
        const normalized = normalizeLesson(lesson)
        expect(normalized.phases).toEqual([
            { instruction: 'Type abc', text: 'abc' },
            { instruction: 'f f', text: 'f f' },
        ])
        expect(normalized.exercises).toHaveLength(2)
    })

    it('defaults titleMy to title and passes optional fields through', () => {
        const lesson = canonicalLesson({
            titleMy: 'မြန်မာ',
            focusKeys: ['KeyF'],
            focus: ['home-row'],
            targetFingers: ['left-index'],
            targetHands: ['left'],
            requiresShift: true,
            prerequisites: ['lesson-en-beginner-1'],
        })
        const normalized = normalizeLesson(lesson)
        expect(normalized.titleMy).toBe('မြန်မာ')
        expect(normalized.focusKeys).toEqual(['KeyF'])
        expect(normalized.focus).toEqual(['home-row'])
        expect(normalized.targetFingers).toEqual(['left-index'])
        expect(normalized.targetHands).toEqual(['left'])
        expect(normalized.requiresShift).toBe(true)
        expect(normalized.prerequisites).toEqual(['lesson-en-beginner-1'])

        const noTitleMy = normalizeLesson(canonicalLesson())
        expect(noTitleMy.titleMy).toBe('Sample')
    })

    it('is lossless for the legacy phase contract', () => {
        const lesson = canonicalLesson({
            exercises: [
                { id: 'ex1', kind: 'text', text: 'f f f f', instruction: 'f f f f' },
                { id: 'ex2', kind: 'text', text: 'j j j j', instruction: 'j j j j' },
            ],
        })
        expect(normalizeLesson(lesson).phases).toEqual([
            { instruction: 'f f f f', text: 'f f f f' },
            { instruction: 'j j j j', text: 'j j j j' },
        ])
    })
})

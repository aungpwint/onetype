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

describe('Myanmar Unicode lesson validation', () => {
    function myanLesson(overrides: Partial<Lesson> = {}): Lesson {
        return canonicalLesson({
            id: 'lesson-my-beginner-23',
            language: 'my',
            keyboard: 'myanmar',
            title: 'Basic Words',
            titleMy: 'အခြေခံ စကားလုံး',
            description: 'Everyday words: water, rice, fish.',
            exercises: [{ id: 'lesson-my-beginner-23-ex-1', kind: 'words', words: ['ရေ', 'ဆန်', 'ငါး', 'ကြက်'] }],
            ...overrides,
        })
    }

    it('accepts a clean canonical Myanmar lesson', () => {
        expect(() => validateLesson(myanLesson())).not.toThrow()
    })

    it('rejects an accidental ZWNJ inside exercise word text', () => {
        const lesson = myanLesson({
            exercises: [{ id: 'lesson-my-beginner-23-ex-1', kind: 'words', words: ['ရ\u200Cေ', 'ဆန်'] }],
        })
        expect(() => validateLesson(lesson)).toThrow(LessonValidationError)
        let message = ''
        try {
            validateLesson(lesson)
        } catch (error) {
            message = (error as LessonValidationError).issues.join('\n')
        }
        expect(message).toContain('lesson: lesson-my-beginner-23')
        expect(message).toContain('exercise: lesson-my-beginner-23-ex-1')
        expect(message).toContain('field: words')
        expect(message).toContain('problem: zero width non-joiner (U+200C)')
    })

    it('rejects a ZWNJ in the Myanmar title', () => {
        const lesson = myanLesson({ titleMy: 'အခြ\u200Cေခံ စကားလုံး' })
        let message = ''
        try {
            validateLesson(lesson)
        } catch (error) {
            message = (error as LessonValidationError).issues.join('\n')
        }
        expect(message).toContain('field: titleMy')
        expect(message).toContain('U+200C')
    })

    it('rejects a ZWNJ in exercise instruction and free-text exercises', () => {
        expect(() => validateLesson(myanLesson({ exercises: [{ id: 'ex-i', kind: 'text', text: 'ကြက်', instruction: 'ရ\u200Cေ' }] }))).toThrow(
            LessonValidationError,
        )
        expect(() => validateLesson(myanLesson({ exercises: [{ id: 'ex-t', kind: 'custom', text: 'ရ\u200Cေ', subtype: 'probe' }] }))).toThrow(
            LessonValidationError,
        )
    })

    it('collects multiple problems across fields into one error', () => {
        const lesson = myanLesson({
            titleMy: 'ရ\u200Cေ',
            exercises: [
                { id: 'ex-1', kind: 'words', words: ['ဆန်\u200C', 'ကြက်'] },
                { id: 'ex-2', kind: 'words', words: ['ငါး'] },
            ],
        })
        let issues: string[] = []
        try {
            validateLesson(lesson)
        } catch (error) {
            issues = (error as LessonValidationError).issues
        }
        expect(issues.length).toBeGreaterThanOrEqual(2)
        expect(issues.some((issue) => issue.includes('field: titleMy'))).toBe(true)
        expect(issues.some((issue) => issue.includes('ex-1'))).toBe(true)
    })

    it('does not flag English lessons that carry a Myanmar title', () => {
        const lesson = canonicalLesson({ language: 'en', keyboard: 'qwerty', titleMy: 'မြန်မာ' })
        expect(() => validateLesson(lesson)).not.toThrow()
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

        const my = normalizeLesson(canonicalLesson({ id: 'lesson-my-beginner-1', language: 'my', keyboard: 'myanmar' }))
        expect(my.language).toBe('myanmar')
        expect(my.layoutId).toBe('myanmar')
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

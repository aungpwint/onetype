import { z } from 'zod'
import { LESSON_LANGUAGES } from '@/types/language'
import { LESSON_KEYBOARD_IDS } from '@/types/keyboard'

export const lessonSchemaVersionSchema = z.number().int().positive()

export const lessonLanguageSchema = z.enum(LESSON_LANGUAGES)

export const lessonKeyboardSchema = z.enum(LESSON_KEYBOARD_IDS)

export const lessonLevelSchema = z.enum(['beginner', 'intermediate', 'advanced'])

export const lessonDifficultySchema = z.enum(['basic', 'easy', 'medium', 'hard'])

export const lessonHandSchema = z.enum(['left', 'right'])

export const lessonFingerSchema = z.enum([
    'left-pinky',
    'left-ring',
    'left-middle',
    'left-index',
    'left-thumb',
    'right-thumb',
    'right-index',
    'right-middle',
    'right-ring',
    'right-pinky',
])

export const lessonFocusSchema = z.enum([
    'key-memory',
    'finger-control',
    'home-row',
    'top-row',
    'bottom-row',
    'row-transition',
    'hand-alternation',
    'same-hand',
    'finger-independence',
    'shift',
    'numbers',
    'symbols',
    'words',
    'sentences',
    'punctuation',
    'unicode',
    'syllable',
    'medial',
    'tone',
    'bilingual',
    'accuracy',
    'speed',
    'alphabet',
])

const nonEmptyString = z.string().trim().min(1)

export const exerciseOptionsSchema = z
    .object({
        allowBackspace: z.boolean().optional(),
        allowMistakes: z.boolean().optional(),
        showTarget: z.boolean().optional(),
    })
    .strict()

const exerciseBaseSchema = {
    id: z.string().trim().min(1),
    instruction: nonEmptyString.optional(),
    options: exerciseOptionsSchema.optional(),
}

export const keyExerciseSchema = z
    .object({
        ...exerciseBaseSchema,
        kind: z.literal('keys'),
        keys: z.array(nonEmptyString).min(1),
        repeats: z.number().int().positive().optional(),
    })
    .strict()

export const wordExerciseSchema = z
    .object({
        ...exerciseBaseSchema,
        kind: z.literal('words'),
        words: z.array(nonEmptyString).min(1),
    })
    .strict()

export const sentenceExerciseSchema = z
    .object({
        ...exerciseBaseSchema,
        kind: z.literal('sentences'),
        sentences: z.array(nonEmptyString).min(1),
    })
    .strict()

export const textExerciseSchema = z
    .object({
        ...exerciseBaseSchema,
        kind: z.literal('text'),
        text: nonEmptyString,
    })
    .strict()

export const paragraphExerciseSchema = z
    .object({
        ...exerciseBaseSchema,
        kind: z.literal('paragraph'),
        text: nonEmptyString,
    })
    .strict()

export const customExerciseSchema = z
    .object({
        ...exerciseBaseSchema,
        kind: z.literal('custom'),
        text: nonEmptyString,
        subtype: nonEmptyString,
    })
    .strict()

export const generatorChunkSchema = z
    .object({
        type: z.literal('chunks'),
        keys: z.array(nonEmptyString).min(1),
        count: z.number().int().positive(),
        chunkMin: z.number().int().positive(),
        chunkMax: z.number().int().positive(),
        style: z.enum(['repetition', 'alternation', 'runs', 'variable', 'transition', 'controlled']).optional(),
        mixed: z.boolean().optional(),
        seed: z.number().int().optional(),
    })
    .strict()

export const generatorWordsSchema = z
    .object({
        type: z.literal('words'),
        bank: z.string().optional(),
        words: z.array(nonEmptyString).min(1).optional(),
        count: z.number().int().positive(),
        maxWordLength: z.number().int().positive().optional(),
        keys: z.array(nonEmptyString).optional(),
        seed: z.number().int().optional(),
    })
    .strict()
    .refine((spec) => spec.bank !== undefined || spec.words !== undefined, { message: 'word generator needs a bank or inline words' })

export const generatorSentencesSchema = z
    .object({
        type: z.literal('sentences'),
        bank: z.string().optional(),
        sentences: z.array(nonEmptyString).min(1).optional(),
        count: z.number().int().positive(),
        seed: z.number().int().optional(),
    })
    .strict()
    .refine((spec) => spec.bank !== undefined || spec.sentences !== undefined, { message: 'sentence generator needs a bank or inline sentences' })

export const generatorSpecSchema = z.discriminatedUnion('type', [generatorChunkSchema, generatorWordsSchema, generatorSentencesSchema])

export const generatedExerciseSchema = z
    .object({
        ...exerciseBaseSchema,
        kind: z.literal('generated'),
        generator: generatorSpecSchema,
    })
    .strict()

export const lessonExerciseSchema = z.discriminatedUnion('kind', [
    keyExerciseSchema,
    wordExerciseSchema,
    sentenceExerciseSchema,
    textExerciseSchema,
    paragraphExerciseSchema,
    customExerciseSchema,
    generatedExerciseSchema,
])

export const lessonCompletionSchema = z.object({
    minAccuracy: z.number().min(0).max(100),
    minWpm: z.number().min(0).nullable(),
})

export const lessonMetadataSchema = z
    .object({
        author: z.string().optional(),
        version: z.string().optional(),
        tags: z.array(z.string()).optional(),
        estimatedDuration: z.number().nonnegative().optional(),
        difficulty: lessonDifficultySchema.optional(),
        prerequisites: z.array(z.string()).optional(),
        createdAt: z.string().optional(),
        updatedAt: z.string().optional(),
    })
    .strict()

export const lessonSchema = z
    .object({
        schemaVersion: lessonSchemaVersionSchema,
        id: z
            .string()
            .trim()
            .min(1)
            .regex(/^[a-z0-9.-]+$/),
        level: lessonLevelSchema,
        language: lessonLanguageSchema,
        number: z.number().int().positive(),
        title: nonEmptyString,
        titleMy: z.string().optional(),
        description: nonEmptyString,
        difficulty: lessonDifficultySchema,
        estimatedMinutes: z.number().nonnegative(),
        keyboard: lessonKeyboardSchema,
        completion: lessonCompletionSchema,
        focusKeys: z.array(z.string()).min(1).optional(),
        focus: z.array(lessonFocusSchema).optional(),
        targetFingers: z.array(lessonFingerSchema).optional(),
        targetHands: z.array(lessonHandSchema).optional(),
        requiresShift: z.boolean().optional(),
        prerequisites: z.array(z.string()).optional(),
        exercises: z.array(lessonExerciseSchema).min(1),
        metadata: lessonMetadataSchema.optional(),
    })
    .strict()

export type LessonSchema = z.infer<typeof lessonSchema>
export type LessonExerciseSchema = z.infer<typeof lessonExerciseSchema>
export type LessonCompletionSchema = z.infer<typeof lessonCompletionSchema>
export type LessonMetadataSchema = z.infer<typeof lessonMetadataSchema>

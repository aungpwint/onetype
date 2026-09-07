import { generateExerciseText, type GeneratorEnvironment } from './generator'
import { english, englishLayout } from './english'
import { myanmar, myanmarLayout } from './myanmar'
import type { LanguageDefinition } from './types'

export * from './types'
export * from './rng'
export * from './pattern'
export * from './difficulty'
export * from './quality'
export * from './generator'
export { english, englishLayout, ENGLISH_HOME, ENGLISH_TOP, ENGLISH_BOTTOM } from './english'
export { myanmar, myanmarLayout, buildMyanmarSyllables, SHIPPED_WORDS } from './myanmar'

const DEFINITIONS: Record<string, LanguageDefinition> = {
    english,
    myanmar,
}

export function languageDefinitionFor(id: string): LanguageDefinition {
    const def = DEFINITIONS[id]
    if (!def) throw new Error(`Pedagogy: no language definition for "${id}"`)
    return def
}

export function environmentFor(id: string): GeneratorEnvironment {
    const def = languageDefinitionFor(id)
    const layout = def.layoutId === 'myanmar' ? myanmarLayout() : englishLayout()
    return { def, layout }
}

export function generateLessonExerciseText(spec: Parameters<typeof generateExerciseText>[0], ctx: Parameters<typeof generateExerciseText>[2], languageId: string): string {
    const env = environmentFor(languageId)
    return generateExerciseText(spec, env, ctx)
}
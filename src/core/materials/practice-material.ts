import type { LessonData } from '@/data/curriculum/types'
import { resolveLesson, type ResolvedLesson } from '@/data/curriculum/generator'
import { getLessonRepository } from '@/data/curriculum'
import { layoutForLanguage } from '@/core/keyboard-layout/registry'
import type { KeyboardLayout } from '@/core/keyboard-layout/layout'
import type { RuntimeLayoutId } from '@/types/keyboard'
import { normalizeMyanmarText } from '@/core/unicode/myanmar'
import { splitGraphemes } from '@/core/unicode/graphemes'
import type { Difficulty, Language } from '@/types'
import { quotePool } from '@/data/quotes'

let lessonPoolsPromise: Promise<{ en: LessonData[]; my: LessonData[] }> | null = null

// The practice pools span the whole curriculum, so they are built once behind
// the lazily loaded catalog instead of eagerly at module scope.
function getLessonPools(): Promise<{ en: LessonData[]; my: LessonData[] }> {
    lessonPoolsPromise ??= getLessonRepository().then((repository) => ({
        en: [
            ...repository.listByLanguageAndLevel('en', 'beginner'),
            ...repository.listByLanguageAndLevel('en', 'intermediate'),
            ...repository.listByLanguageAndLevel('en', 'advanced'),
        ],
        my: [
            ...repository.listByLanguageAndLevel('my', 'beginner'),
            ...repository.listByLanguageAndLevel('my', 'intermediate'),
            ...repository.listByLanguageAndLevel('my', 'advanced'),
        ],
    }))
    return lessonPoolsPromise
}

export type PracticeUnit = 'time' | 'words' | 'text' | 'quote'

export interface PracticeConfig {
    language: 'english' | 'myanmar' | 'mixed'
    unit: PracticeUnit
    time?: number
    words?: number
    text?: string
    punctuation?: boolean
    numbers?: boolean
}

function encodableLine(layout: KeyboardLayout, raw: string): string {
    const line = layout.language === 'myanmar' ? normalizeMyanmarText(raw) : raw
    for (const grapheme of splitGraphemes(line)) {
        try {
            layout.reverseMap([grapheme])
        } catch {
            return ''
        }
    }
    return line
}

function encodablePool(layout: KeyboardLayout, language: 'english' | 'myanmar' | 'mixed', pools: { en: LessonData[]; my: LessonData[] }): string[] {
    const lessons = language === 'english' ? pools.en : language === 'myanmar' ? pools.my : [...pools.my, ...pools.en]
    const seen = new Set<string>()
    const pool: string[] = []
    for (const lesson of lessons) {
        for (const phase of lesson.phases) {
            const line = encodableLine(layout, phase.text)
            if (line && !seen.has(line)) {
                seen.add(line)
                pool.push(line)
            }
        }
    }
    return pool
}

function wordPool(layout: KeyboardLayout, language: 'english' | 'myanmar' | 'mixed', pools: { en: LessonData[]; my: LessonData[] }): string[] {
    const lines =
        language === 'english'
            ? encodablePool(layout, 'english', pools)
            : language === 'myanmar'
              ? encodablePool(layout, 'myanmar', pools)
              : encodablePool(layout, 'mixed', pools)
    const seen = new Set<string>()
    const words: string[] = []
    for (const line of lines) {
        const tokens = line.split(/\s+/)
        for (const token of tokens) {
            if (token.length === 0) continue
            const stripped = token.replace(/^[^\p{L}\p{N}]+$/u, '').replace(/[.,!?;:"'“”‘’()-]+$/g, '')
            if (stripped && !seen.has(stripped)) {
                seen.add(stripped)
                words.push(stripped)
            }
        }
    }
    return words
}

function repeatUntil(targetChars: number, pool: string[], sep = ' '): string {
    const parts: string[] = []
    let total = 0
    let guard = 0
    const maxIterations = Math.max(2000, Math.ceil(targetChars) + 2000)
    while (total < targetChars && guard < maxIterations && pool.length > 0) {
        const part = pool[Math.floor(Math.random() * pool.length)]
        parts.push(part)
        total += part.length + (parts.length > 1 ? sep.length : 0)
        guard += 1
    }
    return parts.join(sep)
}

const EN_PUNCTUATION = ['.', ',', '!', '?', ';', ':']

const MY_PUNCTUATION = ['\u104B', '\u104A'] // ။ ၊

const EN_DIGITS = '0123456789'

function myanmarDigits(digits: string): string {
    return digits.replace(/[0-9]/g, (d) => String.fromCodePoint(0x1040 + d.charCodeAt(0) - 0x30))
}

function capitalize(word: string): string {
    return word.length > 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word
}

function randomToken(language: 'english' | 'myanmar' | 'mixed', length: number): string {
    if (language === 'myanmar' || (language === 'mixed' && Math.random() < 0.5)) {
        const raw: string[] = []
        for (let i = 0; i < length; i += 1) raw.push(EN_DIGITS[Math.floor(Math.random() * EN_DIGITS.length)])
        return myanmarDigits(raw.join(''))
    }
    const raw: string[] = []
    for (let i = 0; i < length; i += 1) raw.push(EN_DIGITS[Math.floor(Math.random() * EN_DIGITS.length)])
    return raw.join('')
}

function decoratePracticeTokens(
    words: string[],
    opts: { language: 'english' | 'myanmar' | 'mixed'; punctuation: boolean; numbers: boolean },
): string[] {
    const punctuation = opts.punctuation
        ? opts.language === 'english'
            ? EN_PUNCTUATION
            : opts.language === 'myanmar'
              ? MY_PUNCTUATION
              : [...EN_PUNCTUATION, ...MY_PUNCTUATION]
        : []
    const tokens: string[] = []
    for (let i = 0; i < words.length; i += 1) {
        let word = words[i]
        if (opts.numbers && Math.random() < 0.1) {
            word = randomToken(opts.language, 1 + Math.floor(Math.random() * 3))
        }
        let token = word
        if (punctuation.length > 0 && i > 0 && Math.random() < 0.3) {
            token += punctuation[Math.floor(Math.random() * punctuation.length)]
            if (opts.language === 'english' && i + 1 < words.length) {
                words[i + 1] = capitalize(words[i + 1])
            }
        }
        tokens.push(token)
    }
    return tokens
}

function buildDecoratedWords(config: PracticeConfig, layout: KeyboardLayout, count: number, pools: { en: LessonData[]; my: LessonData[] }): string {
    const picked: string[] = []
    const words = wordPool(layout, config.language, pools)
    if (words.length === 0) throw new Error(`No practice words available for "${config.language}"`)
    for (let i = 0; i < count; i += 1) {
        picked.push(words[Math.floor(Math.random() * words.length)])
    }
    const decorated = decoratePracticeTokens(picked, {
        language: config.language,
        punctuation: config.punctuation === true,
        numbers: config.numbers === true,
    })
    const text = decorated.join(' ')
    if (!encodableLine(layout, text)) {
        throw new Error(`Practice sentence could not be encoded by layout "${layout.id}"`)
    }
    return text
}

export async function buildPracticeMaterial(config: PracticeConfig): Promise<ResolvedLesson> {
    const layout = layoutForLanguage(config.language)
    const unit = config.unit
    const pools = await getLessonPools()

    let text: string
    if (unit === 'text') {
        const custom = (config.text ?? '').trim()
        if (!custom) throw new Error('Practice custom text cannot be empty')
        text = encodableLine(layout, custom)
        if (!text) throw new Error('Practice text contains characters unavailable in the selected layout')
    } else if (unit === 'quote') {
        const pool = config.language === 'mixed' ? [...quotePool('english'), ...quotePool('myanmar')] : quotePool(config.language)
        const candidates = pool.filter((q) => encodableLine(layout, q.text))
        if (candidates.length === 0) throw new Error(`No quotable practice material available for "${config.language}"`)
        const quote = candidates[Math.floor(Math.random() * candidates.length)]
        text = quote.text
    } else if (unit === 'words') {
        const count = Math.max(1, Math.min(200, config.words ?? 25))
        if (config.punctuation === true || config.numbers === true) {
            text = buildDecoratedWords(config, layout, count, pools)
        } else {
            const words = wordPool(layout, config.language, pools)
            if (words.length === 0) throw new Error(`No practice words available for "${config.language}"`)
            const picked: string[] = []
            for (let i = 0; i < count; i += 1) {
                picked.push(words[Math.floor(Math.random() * words.length)])
            }
            text = picked.join(' ')
        }
    } else {
        const seconds = Math.max(15, Math.min(120, config.time ?? 30))
        if (config.punctuation === true || config.numbers === true) {
            text = buildDecoratedWords(config, layout, Math.max(30, Math.ceil(seconds * 3)), pools)
        } else {
            // Sustained ≈ 200 chars/min with comfortable headroom.
            const targetChars = Math.max(120, seconds * 200)
            const pool = encodablePool(layout, config.language, pools)
            if (pool.length === 0) throw new Error(`No practice material available for "${config.language}"`)
            text = repeatUntil(targetChars, pool)
        }
    }

    const phaseCount = Math.max(1, Math.ceil(text.length / 400))
    const chunks: string[] = []
    let offset = 0
    const length = text.length
    for (let i = 0; i < phaseCount; i += 1) {
        let end = Math.min(length, offset + (i < phaseCount - 1 ? 400 : length - offset))
        if (i < phaseCount - 1) {
            const space = text.lastIndexOf(' ', end)
            end = space > offset ? space : end
        }
        if (end <= offset) end = Math.min(length, offset + 400)
        chunks.push(text.slice(offset, end).trim())
        offset = end
    }
    const phases = chunks.filter((chunk) => chunk.length > 0).map((chunk, i) => ({ instruction: `Line ${i + 1}`, text: chunk }))

    const language: Language = config.language
    const lesson: LessonData = {
        id: `practice:${config.language}:${unit}:${Math.random().toString(36).slice(2, 8)}`,
        level: 'advanced',
        number: 0,
        title: 'Quick practice',
        titleMy: 'အမြန်လေ့ကျင့်ခြင်း',
        description: '',
        difficulty: 'easy' as Difficulty,
        estimatedMinutes: 1,
        language,
        layoutId: layout.id as RuntimeLayoutId,
        completion: { minAccuracy: 0, minWpm: null },
        phases,
    }
    return resolveLesson(lesson)
}

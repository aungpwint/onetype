import { describe, expect, it } from 'vitest'
import { writeFileSync, mkdirSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { getLessonRepository, getCanonicalLesson } from '@/data/curriculum'
import { containsMyanmar, validateMyanmarText } from '@/core/unicode/myanmar'
import { myanmarKeyboardOrder } from '@/core/unicode/keyboard-order'
import { getLayoutOrThrow } from '@/core/keyboard-layout/registry'
import { QUOTES } from '@/data/quotes'
import { myanmar, SHIPPED_WORDS, buildMyanmarSyllables } from '@/core/pedagogy/myanmar'

// Medials must appear in strict canonical order within a syllable:
// ျ (U+103B) < ြ (U+103C) < ွ (U+103D) < ှ (U+103E).
const MEDIALS = [0x103b, 0x103c, 0x103d, 0x103e]

// A syllable head is a base consonant or an independent vowel.
const isHead = (code: number): boolean => code >= 0x1000 && code <= 0x102a

// Attaching marks: dependent vowels, tone marks, medials, kinzi/asat range.
const isAttaching = (code: number): boolean => code >= 0x102b && code <= 0x103e

const isMyanmarCode = (code: number): boolean => code >= 0x1000 && code <= 0x109f

// Minimal syllable segmentation: a syllable starts at a head (base/independent
// vowel); following attaching marks belong to it. Spaces and punctuation break.
function syllableSegments(value: string): string[] {
    const segments: string[] = []
    let current = ''
    for (const ch of value) {
        const code = ch.codePointAt(0) ?? 0
        if (isHead(code)) {
            segments.push(current)
            current = ch
        } else if (isAttaching(code)) {
            current += ch
        } else if (code === 0x1031) {
            // Pre-base vowel sign: canonical data places it after its head.
            current += ch
        } else {
            segments.push(current)
            current = ''
        }
    }
    segments.push(current)
    return segments.filter((segment) => /[\u1000-\u109f]/.test(segment) && segment.length > 0)
}

interface Problem {
    where: string
    syllable?: string
    detail: string
    text?: string
}

interface Audit {
    problems: Problem[]
    syllables: Record<string, { count: number; sources: string[] }>
    tokens: Record<string, { count: number; sources: string[] }>
    untypeableSample: string[]
}

// Fields whose text is actual typing content (orphan marks are expected in
// titles/instructions/descriptions that teach a single mark).
const isTypedContent = (field: string): boolean => field.endsWith('words') || field.endsWith('sentences') || field.endsWith('text')

function collectMyanmarStrings(lessons: Awaited<ReturnType<typeof getCanonicalLesson>>[]): { label: string; field: string; value: string }[] {
    const out: { label: string; field: string; value: string }[] = []
    for (const lesson of lessons) {
        const label = `lesson ${lesson.id}`
        if (lesson.titleMy) out.push({ label, field: 'titleMy', value: lesson.titleMy })
        out.push({ label, field: 'description', value: lesson.description })
        for (const exercise of lesson.exercises) {
            const ex = `ex ${exercise.id}`
            if (exercise.instruction) out.push({ label, field: `${ex} instruction`, value: exercise.instruction })
            if ('text' in exercise && typeof exercise.text === 'string') {
                out.push({ label, field: `${ex} text`, value: exercise.text })
            }
            if ('keys' in exercise) {
                for (const key of exercise.keys) out.push({ label, field: `${ex} keys`, value: key })
            }
            if ('words' in exercise) {
                for (const word of exercise.words) out.push({ label, field: `${ex} words`, value: word })
            }
            if ('sentences' in exercise) {
                for (const sentence of exercise.sentences) out.push({ label, field: `${ex} sentences`, value: sentence })
            }
            if ('subtype' in exercise && typeof exercise.subtype === 'string') {
                out.push({ label, field: `${ex} subtype`, value: exercise.subtype })
            }
        }
    }
    return out
}

describe('Myanmar text audit (accuracy beyond logical order)', () => {
    it('reports problems across all Myanmar content', async () => {
        const audit: Audit = { problems: [], syllables: {}, tokens: {}, untypeableSample: [] }

        const lessons = await Promise.all(
            (await getLessonRepository()).listAllByLanguage().my.map((meta) => getCanonicalLesson(meta.id)),
        )

        const strings: { label: string; field: string; value: string }[] = [
            ...collectMyanmarStrings(lessons),
            ...QUOTES.filter((q) => q.language === 'myanmar').flatMap((q, i) => [
                { label: `quote ${i + 1}`, field: 'text', value: q.text },
                { label: `quote ${i + 1}`, field: 'source', value: q.source },
            ]),
            ...[...buildMyanmarSyllables(), ...SHIPPED_WORDS, ...myanmar.banks.words, ...myanmar.banks.sentences].map(
                (value, i) => ({ label: 'pedagogy bank', field: `item ${i}`, value }),
            ),
        ]

        const layout = getLayoutOrThrow('myanmar')
        const push = (where: string, detail: string, opts: { text?: string; syllable?: string } = {}): void => {
            audit.problems.push({ where, detail, ...opts })
        }

        for (const lesson of lessons) {
            for (const exercise of lesson.exercises) {
                const reportDups = (list: string[], field: string): void => {
                    const seen = new Set<string>()
                    for (const item of list) {
                        if (seen.has(item)) push(`lesson ${lesson.id} ex ${exercise.id}`, `duplicate ${field} entry: "${item}"`)
                        seen.add(item)
                    }
                }
                if ('words' in exercise) reportDups(exercise.words, 'word')
                if ('sentences' in exercise) reportDups(exercise.sentences, 'sentence')
            }
        }

        for (const { label, field, value } of strings) {
            if (!containsMyanmar(value)) continue
            const where = `${label} · ${field}`

            for (const problem of validateMyanmarText(value)) {
                push(where, `validateMyanmarText: ${problem.message}`, { text: value })
            }

            const isKeyLegend = field.endsWith('keys')
            if (isTypedContent(field)) {
                for (const token of value.split(/\s+/).filter((part) => containsMyanmar(part))) {
                    audit.tokens[token] ??= { count: 0, sources: [] }
                    audit.tokens[token].count += 1
                    if (!audit.tokens[token].sources.includes(label)) audit.tokens[token].sources.push(label)
                }
            }
            for (const syllable of syllableSegments(value)) {
                audit.syllables[syllable] ??= { count: 0, sources: [] }
                audit.syllables[syllable].count += 1
                if (!audit.syllables[syllable].sources.includes(label)) {
                    audit.syllables[syllable].sources.push(label)
                }

                const cps = [...syllable].map((ch) => ch.codePointAt(0) ?? 0)
                if (cps.some((c) => !isMyanmarCode(c))) continue

                const medials = cps.filter((c) => MEDIALS.includes(c))
                for (let i = 1; i < medials.length; i += 1) {
                    if (medials[i] <= medials[i - 1]) {
                        push(where, 'medial out of canonical order (must be ျ < ြ < ွ < ှ)', { text: value, syllable })
                        break
                    }
                }

                if (isTypedContent(field) && !isKeyLegend && !cps.some(isHead)) {
                    push(where, 'orphan syllable (no head consonant)', { text: value, syllable })
                }

                try {
                    layout.reverseMap([myanmarKeyboardOrder(syllable)])
                } catch (error) {
                    push(where, `untypeable: ${(error as Error).message}`, { text: value, syllable })
                }
            }

            if (field === 'description' || field.endsWith('sentences')) {
                if (value !== value.trim()) push(where, 'leading/trailing whitespace', { text: value })
                if (/\s{2,}/.test(value)) push(where, 'multiple consecutive spaces', { text: value })
            }
        }

        for (const p of audit.problems) {
            if (p.detail.startsWith('untypeable')) audit.untypeableSample.push(p.syllable ?? '')
        }

        const tmpDir = path.join(os.tmpdir(), 'onetype-audit')
        mkdirSync(tmpDir, { recursive: true })
        writeFileSync(path.join(tmpDir, 'myanmar-audit.json'), JSON.stringify(audit, null, 2), 'utf8')

        expect(audit.problems).toEqual([])
    })
})
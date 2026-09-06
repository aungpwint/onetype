import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { getLessonRepository, getCanonicalLesson } from '@/data/curriculum'
import { findSuspiciousInvisibleCharacters, normalizeMyanmarText, splitMyanmarSyllables, validateMyanmarText } from '@/core/unicode/myanmar'
import { myanmar } from '@/core/keyboard-layout/myanmar'
import type { LessonExercise } from '@/types/exercise'

const MY_ROOT = path.resolve(fileURLToPath(new URL('../../src/data/lessons/my', import.meta.url)))

function listMyFiles(dir: string): string[] {
    const out: string[] = []
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) out.push(...listMyFiles(full))
        else if (entry.name.endsWith('.json')) out.push(full)
    }
    return out.sort()
}

const SHIPPED_WORDS = [
    'ရေ',
    'အဖေ',
    'အမေ',
    'ခြေ',
    'အခြေခံ',
    'အိမ်',
    'မြို့',
    'ရွာ',
    'ညီ',
    'ညီမ',
    'မျက်စိ',
    'နား',
    'လက်',
    'ဆန်',
    'ငါး',
    'ကြက်',
    'ကေ',
    'ကု',
    'ကူ',
    'ကဲ',
    'တေ',
    'တု',
    'တူ',
    'မေ',
    'မု',
    'မူ',
    'နေ',
    'နု',
    'နူ',
]

describe('Myanmar lesson raw data', () => {
    it('contains no zero-width / format characters anywhere in the my JSON sources', () => {
        const files = listMyFiles(MY_ROOT)
        expect(files.length).toBeGreaterThan(0)
        for (const file of files) {
            const raw = readFileSync(file, 'utf8')
            const found = findSuspiciousInvisibleCharacters(raw)
            expect(found, `${path.relative(MY_ROOT, file)} has ${found.length} invisible character(s)`).toHaveLength(0)
        }
    })
})

describe('Canonical Myanmar word corpus', () => {
    it.each(SHIPPED_WORDS)('%s is clean canonical Unicode', (word) => {
        expect(validateMyanmarText(word)).toEqual([])
        expect(word.normalize('NFC')).toBe(word)
    })

    it.each(SHIPPED_WORDS)('%s round-trips through syllable clustering', (word) => {
        expect(splitMyanmarSyllables(word).join('')).toBe(word)
    })

    it.each(SHIPPED_WORDS)('%s is fully typeable on the Myanmar layout', (word) => {
        const clusters = splitMyanmarSyllables(word)
        const pairs = myanmar.reverseMap(clusters)
        expect(pairs.map((pair) => pair.lookup.text).join('')).toBe(word)
    })

    it('syllable clusters are deterministic for the original problem words', () => {
        expect(splitMyanmarSyllables('ရေ')).toEqual(['ရေ'])
        expect(splitMyanmarSyllables('အဖေ')).toEqual(['အ', 'ဖေ'])
        expect(splitMyanmarSyllables('အမေ')).toEqual(['အ', 'မေ'])
        expect(splitMyanmarSyllables('ခြေ')).toEqual(['ခြေ'])
        expect(splitMyanmarSyllables('အခြေခံ')).toEqual(['အ', 'ခြ', 'ေခံ'])
    })

    it('regression: the corrupted ZWNJ-preposed-vowel forms are flagged and normalized away', () => {
        const corrupted = ['ရ\u200Cေ', 'အဖ\u200Cေ', 'အမ\u200Cေ', 'ခြ\u200Cေ', 'အခြ\u200Cေခံ']
        for (const bad of corrupted) {
            expect(validateMyanmarText(bad).length, JSON.stringify(bad)).toBeGreaterThan(0)
            expect(normalizeMyanmarText(bad)).toBe(bad.replace('\u200C', ''))
        }
    })
})

describe('Every canonical Myanmar lesson', () => {
    const myLessons = getLessonRepository().listAllByLanguage().my

    it('has lessons in the catalog', () => {
        expect(myLessons.length).toBeGreaterThan(0)
    })

    it('keeps every Myanmar-bearing string NFC and free of invisible characters', () => {
        for (const lesson of myLessons) {
            const canonical = getCanonicalLesson(lesson.id)
            const samples: string[] = []
            if (canonical.titleMy !== undefined) samples.push(canonical.titleMy)
            samples.push(canonical.description)
            for (const exercise of canonical.exercises) {
                if (exercise.instruction !== undefined) samples.push(exercise.instruction)
                for (const line of exerciseContent(exercise)) {
                    if (line.trim().length > 0) samples.push(line)
                }
            }
            for (const sample of samples) {
                expect(validateMyanmarText(sample), `${lesson.id}: ${JSON.stringify(sample)}`).toEqual([])
            }
        }
    })
})

function exerciseContent(exercise: LessonExercise): string[] {
    if (exercise.kind === 'text' || exercise.kind === 'paragraph' || exercise.kind === 'custom') return [exercise.text]
    if (exercise.kind === 'keys') return exercise.keys
    if (exercise.kind === 'words') return exercise.words
    if (exercise.kind === 'sentences') return exercise.sentences
    return []
}

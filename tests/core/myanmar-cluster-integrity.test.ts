import { describe, expect, it } from 'vitest'
import { splitMyanmarSyllables } from '@/core/unicode/myanmar'
import { isMyanmarAttachingMark } from '@/core/unicode/classification'
import { getLessonRepository, getCanonicalLesson } from '@/data/curriculum'
import type { Lesson } from '@/types/lesson'

const TARGET_KINDS = new Set(['keys', 'words', 'sentences', 'text', 'paragraph', 'custom'])

function lessonStrings(lesson: Lesson): Array<{ text: string; isTarget: boolean }> {
    const out: Array<{ text: string; isTarget: boolean }> = []
    if (lesson.titleMy !== undefined) out.push({ text: lesson.titleMy, isTarget: false })
    if (lesson.description !== undefined) out.push({ text: lesson.description, isTarget: false })
    for (const exercise of lesson.exercises) {
        if (exercise.instruction !== undefined) out.push({ text: exercise.instruction, isTarget: false })
        const isTarget = TARGET_KINDS.has(exercise.kind)
        switch (exercise.kind) {
            case 'text':
            case 'paragraph':
            case 'custom':
                out.push({ text: exercise.text, isTarget })
                break
            case 'keys':
                for (const k of exercise.keys) out.push({ text: k, isTarget })
                break
            case 'words':
                for (const w of exercise.words) out.push({ text: w, isTarget })
                break
            case 'sentences':
                for (const s of exercise.sentences) out.push({ text: s, isTarget })
                break
        }
    }
    return out.filter((e) => e.text.length > 0)
}

describe('Myanmar cluster integrity', () => {
    it('all typing-target clusters across the Myanmar corpus split without an attaching mark at the head', async () => {
        const repo = await getLessonRepository()
        const myLessons = repo.listAllByLanguage().my
        for (const lesson of myLessons) {
            const canonical = await getCanonicalLesson(lesson.id)
            for (const { text, isTarget } of lessonStrings(canonical)) {
                if (!isTarget) continue
                for (const cluster of splitMyanmarSyllables(text)) {
                    const first = cluster.codePointAt(0) ?? 0
                    expect(
                        isMyanmarAttachingMark(first),
                        `${lesson.id}: target cluster ${JSON.stringify(cluster)} of ${JSON.stringify(text)} starts with an attaching mark`,
                    ).toBe(false)
                }
            }
        }
    })

    it('no typing-target cluster mixes Myanmar glyphs with whitespace', async () => {
        const repo = await getLessonRepository()
        const myLessons = repo.listAllByLanguage().my
        for (const lesson of myLessons) {
            const canonical = await getCanonicalLesson(lesson.id)
            for (const { text, isTarget } of lessonStrings(canonical)) {
                if (!isTarget) continue
                for (const cluster of splitMyanmarSyllables(text)) {
                    const hasMyanmar = [...cluster].some((c) => c.codePointAt(0)! >= 0x1000 && c.codePointAt(0)! <= 0x109f)
                    expect(hasMyanmar && cluster.includes(' '), `${lesson.id}: mixed cluster ${JSON.stringify(cluster)} of ${JSON.stringify(text)}`).toBe(false)
                }
            }
        }
    })
})

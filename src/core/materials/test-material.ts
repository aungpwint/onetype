import type { TypingTest } from '@/services/types'
import { getLayout, getLayoutOrThrow, layoutForLanguage } from '@/core/keyboard-layout/registry'
import type { KeyboardLayout } from '@/core/keyboard-layout/registry'
import { resolveLesson, type ResolvedLesson } from '@/data/curriculum/generator'
import type { LessonData } from '@/data/curriculum/types'
import { getLessonRepository } from '@/data/curriculum'
import { normalizeMyanmarText } from '@/core/unicode/myanmar'

import type { Difficulty, Language } from '@/types'

const repository = getLessonRepository()

const MYANMAR_POOL = [
    ...repository.listByLanguageAndLevel('my', 'advanced').reduce<string[]>((acc, l) => acc.concat(l.phases.map((p) => p.text)), []),
    ...repository.listByLanguageAndLevel('my', 'intermediate').reduce<string[]>((acc, l) => acc.concat(l.phases.map((p) => p.text)), []),
]

const ENGLISH_POOL = repository.listByLanguageAndLevel('en', 'advanced').reduce<string[]>((acc, l) => acc.concat(l.phases.map((p) => p.text)), [])

export function resolveTestLayout(test: TypingTest): KeyboardLayout {
    return getLayout(test.layoutId) ?? layoutForLanguage(test.language === 'english' ? 'english' : 'myanmar')
}

export function buildTestMaterial(test: TypingTest): ResolvedLesson {
    const layout = resolveTestLayout(test)
    const poolBase = test.language === 'english' ? ENGLISH_POOL : test.language === 'mixed' ? [...MYANMAR_POOL, ...ENGLISH_POOL] : MYANMAR_POOL
    // Derived test material is normalized at this boundary (canonical NFC, no
    // stray zero-width characters) so display text and the typing target never
    // diverge, even for user-supplied test content.
    const pool = poolBase.map((raw) => (layout.language === 'myanmar' ? normalizeMyanmarText(raw) : raw)).filter((line) => {
        for (const ch of line) if (!layout.lookupChar(ch)) return false
        return true
    })
    if (pool.length === 0) {
        throw new Error(`Test "${test.id}": no lines encodable by layout "${test.layoutId}"`)
    }
    const targetChars = Math.max(120, 5 * 25 * test.durationSeconds)
    const lines: string[] = []
    let total = 0
    let guard = 0
    // Each iteration adds at least 2 chars (line.length + 1), so a bound of
    // targetChars + headroom iterations is always enough to satisfy the char
    // target. This keeps the cap from truncating scaling for long durations.
    const maxLines = Math.max(200, Math.ceil(targetChars) + 1000)
    while (total < targetChars && guard < maxLines) {
        const line = pool[Math.floor(Math.random() * pool.length)]
        lines.push(line)
        total += line.length + 1
        guard += 1
    }
    const language: Language = layout.language === 'english' ? 'english' : 'myanmar'
    const lesson: LessonData = {
        id: `test-material-${test.id}`,
        level: 'advanced',
        number: 0,
        title: test.name,
        titleMy: test.name,
        description: '',
        difficulty: 'hard' as Difficulty,
        estimatedMinutes: Math.max(1, Math.round(test.durationSeconds / 60)),
        language,
        layoutId: layout.id as 'english-qwerty' | 'myanmar',
        completion: { minAccuracy: test.minAccuracy, minWpm: test.minWpm },
        phases: lines.map((text, i) => ({ instruction: `Line ${i + 1}`, text })),
    }
    return resolveLesson(lesson)
}

export function resolveMaterialLayout(layoutId: string): ReturnType<typeof getLayoutOrThrow> {
    return getLayoutOrThrow(layoutId)
}

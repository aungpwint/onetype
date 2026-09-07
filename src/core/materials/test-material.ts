import type { TypingTest } from '@/services/types'
import { getLayout, layoutForLanguage } from '@/core/keyboard-layout/registry'
import type { KeyboardLayout } from '@/core/keyboard-layout/registry'
import type { RuntimeLayoutId } from '@/types/keyboard'
import { resolveLesson, type ResolvedLesson } from '@/data/curriculum/generator'
import type { LessonData } from '@/data/curriculum/types'
import { getLessonRepository } from '@/data/curriculum'
import { normalizeMyanmarText, containsMyanmar } from '@/core/unicode/myanmar'

import type { Difficulty, Language } from '@/types'

const repository = getLessonRepository()

const MYANMAR_POOL = [
    ...repository.listByLanguageAndLevel('my', 'advanced').reduce<string[]>((acc, l) => acc.concat(l.phases.map((p) => p.text)), []),
    ...repository.listByLanguageAndLevel('my', 'intermediate').reduce<string[]>((acc, l) => acc.concat(l.phases.map((p) => p.text)), []),
]

const ENGLISH_POOL = repository.listByLanguageAndLevel('en', 'advanced').reduce<string[]>((acc, l) => acc.concat(l.phases.map((p) => p.text)), [])

export function resolveTestLayout(test: TypingTest): KeyboardLayout {
    return getLayout(test.layoutId) ?? layoutForLanguage(test.language === 'english' ? 'english' : test.language === 'mixed' ? 'mixed' : 'myanmar')
}

export function buildTestMaterial(test: TypingTest): ResolvedLesson {
    const layout = resolveTestLayout(test)
    const poolBase = test.language === 'english' ? ENGLISH_POOL : test.language === 'mixed' ? [...MYANMAR_POOL, ...ENGLISH_POOL] : MYANMAR_POOL
    // Normalized here so display text and the typing target never diverge.
    const pool = poolBase.map((raw) => (layout.language === 'myanmar' ? normalizeMyanmarText(raw) : raw)).filter((line) => {
        for (const ch of line) if (!layout.lookupChar(ch)) return false
        return true
    })
    if (pool.length === 0) {
        throw new Error(`Test "${test.id}": no lines encodable by layout "${test.layoutId}"`)
    }
    const targetChars = Math.max(120, 5 * 25 * test.durationSeconds)
    // A "mixed" test must contain BOTH scripts, so split the encodable pool by
    // script and alternate lines instead of sampling purely at random.
    const isMixed = test.language === 'mixed'
    const mixedMyanmarPool = pool.filter((line) => containsMyanmar(line))
    const mixedEnglishPool = pool.filter((line) => !containsMyanmar(line))
    const lines: string[] = []
    let total = 0
    let guard = 0
    // Each iteration adds at least 2 chars (line.length + 1), so this cap never truncates long durations.
    const maxLines = Math.max(200, Math.ceil(targetChars) + 1000)
    while (total < targetChars && guard < maxLines) {
        let line: string
        if (isMixed) {
            const wantMyanmar = lines.length % 2 === 0
            const bucket = wantMyanmar ? mixedMyanmarPool : mixedEnglishPool
            const other = wantMyanmar ? mixedEnglishPool : mixedMyanmarPool
            line = bucket.length > 0 ? bucket[Math.floor(Math.random() * bucket.length)] : other[Math.floor(Math.random() * other.length)]
        } else {
            line = pool[Math.floor(Math.random() * pool.length)]
        }
        lines.push(line)
        total += line.length + 1
        guard += 1
    }
    const language: Language = layout.language
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
        layoutId: layout.id as RuntimeLayoutId,
        completion: { minAccuracy: test.minAccuracy, minWpm: test.minWpm },
        phases: lines.map((text, i) => ({ instruction: `Line ${i + 1}`, text })),
    }
    return resolveLesson(lesson)
}

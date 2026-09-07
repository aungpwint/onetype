import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import type { Level } from '@/types'
import { useLessonStore } from '@/stores/lesson-store'
import { useStudentStore } from '@/stores/student-store'
import { useSettingsStore } from '@/stores/settings-store'
import { Spinner, PageHeader } from '@/components/ui'
import { Progress } from '@/components/ui/progress'
import { LanguageToggle } from '@/components/language-toggle'
import { LessonCard } from '@/components/lesson-card'
import { computeMasteryForLessons, type AttemptRecord } from '@/core/mastery'
import { recommendNextLesson } from '@/core/practice'
import { pct } from '@/lib/format'
import { cn, appPageClass } from '@/lib/utils'
import type { ExerciseResult } from '@/services/types'
import * as backend from '@/services/backend'

const LEVEL_ORDER: Level[] = ['beginner', 'intermediate', 'advanced']

const RECOMMENDATION_COPY: Record<string, { label: string; heading: string }> = {
    unfinished: { label: 'Up next', heading: 'Continue your path' },
    'weak-key-boost': { label: 'Weak-key boost', heading: 'Sharpen your weakest keys' },
    review: { label: 'Review', heading: 'Lock in mastery' },
}

const LEVEL_COPY: Record<Level, { en: string; ms: string }> = {
    beginner: { en: 'Beginner — home row & its neighbours', ms: 'အခြေခံ' },
    intermediate: { en: 'Intermediate — words and phrases', ms: 'အလယ်အလတ်' },
    advanced: { en: 'Advanced — full sentences', ms: 'အဆင့်မြင့်' },
}

const CARD_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

export default function Learn() {
    const { level: levelParam } = useParams<{ level: string }>()
    const lessonsByLevel = useLessonStore((s) => s.lessonsByLevel)
    const progress = useLessonStore((s) => s.progress)
    const progressStudentId = useLessonStore((s) => s.progressStudentId)
    const loadProgress = useLessonStore((s) => s.loadProgress)
    const active = useStudentStore((s) => s.active)
    const storedLang = useSettingsStore((s) => s.get('app.language'))

    const lang = storedLang === 'myanmar' ? 'myanmar' : 'english'

    const [level, setLevel] = useState<Level>(() => ((LEVEL_ORDER as string[]).includes(levelParam ?? '') ? (levelParam as Level) : 'beginner'))
    const [exerciseResults, setExerciseResults] = useState<ExerciseResult[]>([])

    useEffect(() => {
        if (active) void loadProgress(active.id)
    }, [active, loadProgress])

    useEffect(() => {
        if (active) {
            void (async () => {
                setExerciseResults(await backend.listExerciseResults(active.id))
            })()
        }
    }, [active])

    const masteryByLesson = useMemo(() => {
        const minAcc: Record<string, { minAccuracy: number }> = {}
        for (const lvl of LEVEL_ORDER) {
            for (const lesson of lessonsByLevel[lvl]) {
                if (lesson.language === (lang === 'myanmar' ? 'myanmar' : 'english')) {
                    minAcc[lesson.id] = { minAccuracy: lesson.completion.minAccuracy }
                }
            }
        }
        return computeMasteryForLessons(exerciseResults, minAcc)
    }, [exerciseResults, lessonsByLevel, lang])

    const list = useMemo(() => {
        return lessonsByLevel[level].filter((l) => l.language === (lang === 'myanmar' ? 'myanmar' : 'english')).sort((a, b) => a.number - b.number)
    }, [lessonsByLevel, level, lang])

    const progressReady = progressStudentId === active?.id

    const recommendation = useMemo(() => {
        if (!progressReady) return null
        const attemptsByLesson: Record<string, AttemptRecord[]> = {}
        const chronological = [...exerciseResults].sort((a, b) => a.startedAt - b.startedAt)
        for (const result of chronological) {
            const bucket = attemptsByLesson[result.lessonId] ?? []
            bucket.push({ passed: result.passed, accuracy: result.accuracy })
            attemptsByLesson[result.lessonId] = bucket
        }
        const minAccuracyByLesson: Partial<Record<string, number>> = {}
        for (const lesson of list) minAccuracyByLesson[lesson.id] = lesson.completion.minAccuracy
        return recommendNextLesson({ lessons: list, attemptsByLesson, minAccuracyByLesson })
    }, [progressReady, exerciseResults, list])

    const unlockedById = useMemo(() => {
        const unlocked = new Set<string>()
        for (const lesson of list) {
            const prereqs = lesson.prerequisites ?? []
            const isRoot = prereqs.length === 0 && lesson.number === 1
            const ok = isRoot || prereqs.every((id) => {
                const mastered = masteryByLesson.get(id)
                return mastered === 'passed' || mastered === 'mastered'
            })
            if (ok) unlocked.add(lesson.id)
        }
        return unlocked
    }, [list, masteryByLesson])

    const doneCount = list.filter((l) => progress?.[l.id]?.completed).length

    return (
        <div className={appPageClass}>
            <PageHeader eyebrow={`Curriculum · ${LEVEL_COPY[level].ms}`} title="Learn" subtitle={LEVEL_COPY[level].en}>
                <LanguageToggle />
            </PageHeader>

            <div
                className="inline-flex w-full flex-wrap gap-1 rounded-lg border border-line bg-muted/70 p-1 sm:w-auto"
                role="tablist"
                aria-label="Level"
            >
                {LEVEL_ORDER.map((l) => {
                    const count = lessonsByLevel[l].filter((x) => x.language === (lang === 'myanmar' ? 'myanmar' : 'english')).length
                    const done = lessonsByLevel[l].filter(
                        (x) => x.language === (lang === 'myanmar' ? 'myanmar' : 'english') && progress?.[x.id]?.completed,
                    ).length
                    const isActive = level === l
                    return (
                        <Link
                            key={l}
                            to={`/learn/${l}`}
                            onClick={() => setLevel(l)}
                            className={cn(
                                'flex-1 rounded-md px-4 py-1.5 text-sm font-medium whitespace-nowrap transition-[color,background-color,box-shadow] duration-150 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:flex-none',
                                isActive ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                            )}
                            role="tab"
                            aria-selected={isActive}
                        >
                            <span className="capitalize">{l}</span>
                            {progressReady ? (
                                <span className={cn('ml-2 text-xs tabular-nums', isActive ? 'font-semibold text-accent' : 'text-muted-foreground')}>
                                    {done}/{count}
                                </span>
                            ) : null}
                        </Link>
                    )
                })}
            </div>

            {progressReady ? (
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="shrink-0 font-myanmar">ဤအဆင့်တွင်</span>
                    <Progress value={pct(doneCount, list.length)} className="flex-1" />
                    <span className="text-muted-foreground tabular-nums">
                        {doneCount}/{list.length}
                    </span>
                </div>
            ) : (
                <Spinner label="Loading progress…" />
            )}

            {recommendation?.lesson ? (
                <Link
                    to={`/lesson/${recommendation.lesson.id}`}
                    className="group flex items-center gap-3 rounded-2xl border border-accent/30 bg-accent/5 p-4 transition-colors hover:border-accent/50 hover:bg-accent/10"
                >
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-accent/30 bg-accent/10 text-accent">
                        <Sparkles className="size-4" />
                    </span>
                    <span className="min-w-0">
                        <span className="block text-[0.6875rem] font-semibold tracking-wider text-accent uppercase">
                            {RECOMMENDATION_COPY[recommendation.reason]?.label ?? 'Recommended'}
                        </span>
                        <span className="block truncate font-display text-base font-semibold text-ink">
                            {recommendation.lesson.title}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                            L{String(recommendation.lesson.number).padStart(2, '0')} · {RECOMMENDATION_COPY[recommendation.reason]?.heading ?? 'Recommended for you'}
                        </span>
                    </span>
                </Link>
            ) : null}

            <div className={list.length ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3' : ''}>
                {list.map((lesson, i) => (
                    <motion.div
                        key={lesson.id}
                        className="h-full"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.32, delay: i * 0.04, ease: CARD_EASE }}
                    >
                        <LessonCard
                            lesson={lesson}
                            mastery={masteryByLesson.get(lesson.id) ?? 'not-started'}
                            progress={progress?.[lesson.id]}
                            locked={progressReady && !unlockedById.has(lesson.id)}
                        />
                    </motion.div>
                ))}
            </div>
            {list.length === 0 ? <p className="text-center text-sm text-muted-foreground">No lessons here yet.</p> : null}
        </div>
    )
}

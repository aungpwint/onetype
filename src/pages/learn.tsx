import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import type { Level } from '@/types'
import { useLessonStore } from '@/stores/lesson-store'
import { useStudentStore } from '@/stores/student-store'
import { useSettingsStore } from '@/stores/settings-store'
import { Spinner, PageHeader } from '@/components/ui'
import { Progress } from '@/components/ui/progress'
import { LanguageToggle } from '@/components/language-toggle'
import { LessonCard } from '@/components/lesson-card'
import { computeMasteryForLessons } from '@/core/mastery'
import { pct } from '@/lib/format'
import { cn, appPageClass } from '@/lib/utils'
import type { ExerciseResult } from '@/services/types'
import * as backend from '@/services/backend'

const LEVEL_ORDER: Level[] = ['beginner', 'intermediate', 'advanced']

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

    // Derived from the persisted app.language setting so the toggle and the
    // curriculum list stay in sync and survive a reload.
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
                        />
                    </motion.div>
                ))}
            </div>
            {list.length === 0 ? <p className="text-center text-sm text-muted-foreground">No lessons here yet.</p> : null}
        </div>
    )
}

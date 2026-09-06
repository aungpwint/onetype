import { Link } from 'react-router-dom'
import { ArrowRight, Clock, Crosshair, Gauge } from 'lucide-react'
import type { LessonData } from '@/data/curriculum/types'
import type { MasteryLevel } from '@/core/mastery'
import type { LessonProgress } from '@/services/types'
import { Badge } from './ui/badge'
import { cn } from '@/lib/utils'

interface LessonCardProps {
    lesson: LessonData
    mastery: MasteryLevel
    progress?: LessonProgress | null
}

const MASTERY_LABEL: Record<MasteryLevel, { text: string; variant: 'secondary' | 'success' | 'warning' }> = {
    'not-started': { text: 'new', variant: 'secondary' },
    attempted: { text: 'attempted', variant: 'secondary' },
    passed: { text: 'passed', variant: 'success' },
    mastered: { text: 'mastered', variant: 'warning' },
}

const DIFFICULTY_DOTS: Record<LessonData['difficulty'], number> = {
    basic: 1,
    easy: 2,
    medium: 3,
    hard: 4,
}

function MasteryBadge({ level }: { level: MasteryLevel }) {
    const m = MASTERY_LABEL[level]
    return <Badge variant={m.variant}>{m.text}</Badge>
}

export function LessonCard({ lesson, mastery, progress }: LessonCardProps) {
    const passed = mastery === 'passed' || mastery === 'mastered'
    const attempted = mastery === 'attempted'
    const showAccuracy = attempted && progress && progress.attempts > 0

    const bandClass = passed ? 'bg-success' : attempted ? 'bg-brass' : 'bg-line-strong'

    const sheenClass = passed
        ? 'from-success/12 to-transparent'
        : attempted
          ? 'from-brass/10 to-transparent'
          : 'from-surface-elevated/60 to-transparent'

    return (
        <Link
            to={`/lesson/${lesson.id}`}
            className="group relative isolate flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-(--shadow-1) transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:border-line-strong hover:shadow-(--shadow-3) focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
            <span aria-hidden className={cn('pointer-events-none absolute inset-0 -z-10 h-full bg-linear-to-b', sheenClass)} />

            <span aria-hidden className={cn('h-1 w-full', bandClass)} />

            <div className="flex grow flex-col gap-3 p-4 lg:p-5">
                <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong/70 bg-linear-to-b from-key-top to-key-base px-2 py-1 font-mono text-[0.6875rem] font-semibold tracking-wider text-ink-soft tabular-nums shadow-[0_1px_0_var(--line-strong)]">
                        <span className="text-ink-faint">L</span>
                        <span>{String(lesson.number).padStart(2, '0')}</span>
                    </span>
                    {passed ? (
                        <MasteryBadge level={mastery} />
                    ) : showAccuracy ? (
                        <span className="text-xs font-semibold text-ink-soft tabular-nums">{Math.round(progress.bestAccuracy)}%</span>
                    ) : (
                        <MasteryBadge level={mastery} />
                    )}
                </div>

                <div className="min-w-0">
                    <h3 className="font-display text-xl leading-tight font-semibold tracking-[-0.01em] text-ink">{lesson.title}</h3>
                    <p className="mt-2 font-myanmar text-xs leading-relaxed text-ink-faint">{lesson.titleMy}</p>
                </div>

                {lesson.focusKeys && lesson.focusKeys.length > 0 ? (
                    <div className="flex flex-wrap gap-1" aria-label="Focus keys">
                        {lesson.focusKeys.slice(0, 6).map((key) => (
                            <span
                                key={key}
                                className="inline-flex min-w-5.5 items-center justify-center rounded-[0.3125rem] border border-line-strong bg-linear-to-b from-key-top to-key-base px-1.5 py-0.5 font-mono text-xs text-ink tabular-nums shadow-[0_1px_0_var(--line-strong)]"
                            >
                                {key}
                            </span>
                        ))}
                    </div>
                ) : null}

                <div className="mt-auto flex items-center gap-3 border-t border-line/60 pt-2.5 text-xs text-ink-faint">
                    <span className="inline-flex items-center gap-1">
                        <Clock className="size-3.5" />
                        {lesson.estimatedMinutes} min
                    </span>
                    <span className="inline-flex items-center gap-1">
                        <Crosshair className="size-3.5" />
                        {lesson.completion.minAccuracy}% acc
                        {lesson.completion.minWpm !== null ? (
                            <span className="inline-flex items-center gap-1">
                                <i className="pointer-events-none">·</i>
                                {lesson.completion.minWpm} wpm
                            </span>
                        ) : null}
                    </span>
                    <span className="ml-auto inline-flex items-center gap-1" title="Difficulty">
                        <Gauge className="size-3.5" />
                        <span className="tracking-tight">
                            {'●'.repeat(DIFFICULTY_DOTS[lesson.difficulty])}
                            <span className="opacity-25">{'●'.repeat(4 - DIFFICULTY_DOTS[lesson.difficulty])}</span>
                        </span>
                    </span>
                </div>
            </div>

            <span
                aria-hidden
                className="absolute top-1/2 right-3.5 -translate-y-1/2 text-ink-soft opacity-0 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0.5 group-hover:opacity-100"
            >
                <ArrowRight className="size-4" />
            </span>
        </Link>
    )
}

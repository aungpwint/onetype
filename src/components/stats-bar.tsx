import { useEffect, useState } from 'react'
import { useTypingStore } from '@/stores/typing-store'
import { formatDuration } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Metric } from '@/components/ui'

export function StatsBar() {
    const tick = useTypingStore((s) => s.tick)
    const status = useTypingStore((s) => s.status)
    void tick
    const [, force] = useState(0)

    const running = status === 'running'

    useEffect(() => {
        if (!running) return
        const id = window.setInterval(() => force((n) => n + 1), 250)
        return () => window.clearInterval(id)
    }, [running])

    const stats = useTypingStore.getState().getLiveStats()
    const durationSeconds = useTypingStore.getState().session?.durationSeconds ?? null
    const engine = useTypingStore.getState().engine
    const remaining = durationSeconds !== null && engine ? Math.max(0, durationSeconds - engine.elapsedSeconds()) : null

    const wpm = Math.round(stats.wpm)
    const progress = stats.totalUnits > 0 ? Math.round((stats.unitIndex / stats.totalUnits) * 100) : 0
    const idle = stats.unitIndex === 0

    return (
        <div className="flex w-full flex-col items-center">
            <div className="flex items-end justify-center gap-2.5">
                <span className={cn('font-heavy text-6xl leading-[0.9] tracking-tight text-ink tabular-nums sm:text-7xl')}>
                    {idle ? '—' : wpm}
                </span>
                <span className="mb-1 text-xs font-semibold tracking-[0.24em] text-muted-foreground uppercase">WPM</span>
            </div>

            <div className="mt-3.5 flex items-center gap-4 sm:gap-5">
                <Metric label="Accuracy" value={idle ? '—' : `${stats.accuracy.toFixed(1)}%`} />
                <span className="h-5 w-px bg-line-strong/60" aria-hidden />
                <Metric
                    label={durationSeconds !== null ? 'Time' : 'Progress'}
                    value={durationSeconds !== null && remaining !== null ? formatDuration(remaining * 1000) : `${progress}%`}
                />
                <span className="h-5 w-px bg-line-strong/60" aria-hidden />
                <Metric label="Errors" value={idle ? '—' : String(stats.incorrectCount)} tone={stats.incorrectCount > 0 ? 'destructive' : 'muted'} />
            </div>
        </div>
    )
}

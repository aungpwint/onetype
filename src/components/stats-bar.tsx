import { useEffect, useRef, useState } from 'react'
import { useTypingStore } from '@/stores/typing-store'
import { useSettingsStore } from '@/stores/settings-store'
import { useUiStore } from '@/stores/ui-store'
import { playTimeWarningSound } from '@/lib/sound'
import { formatDuration, timerProportion } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Metric } from '@/components/ui'

export function StatsBar() {
    const tick = useTypingStore((s) => s.tick)
    const status = useTypingStore((s) => s.status)
    void tick
    const [, force] = useState(0)
    const warned = useRef(false)
    const timeWarning = useSettingsStore((s) => s.getEnum('practice.timeWarning', ['on', 'off'] as const, 'on'))
    const timerStyle = useSettingsStore((s) => s.getEnum('practice.timerStyle', ['text', 'bar', 'mini', 'off'] as const, 'text'))

    const running = status === 'running'

    useEffect(() => {
        if (!running) return
        warned.current = false
        const id = window.setInterval(() => force((n) => n + 1), 250)
        return () => window.clearInterval(id)
    }, [running])

    const store = useTypingStore.getState()
    const durationSeconds = store.session?.durationSeconds ?? null
    const engine = store.engine
    const remaining = durationSeconds !== null && engine ? Math.max(0, durationSeconds - engine.elapsedSeconds()) : null

    const inWarningZone = running && durationSeconds !== null && remaining !== null && remaining <= 10
    useEffect(() => {
        if (!inWarningZone) return
        if (warned.current) return
        warned.current = true
        if (timeWarning !== 'off' && useUiStore.getState().soundEnabled) playTimeWarningSound()
    }, [inWarningZone, timeWarning])

    const totalUnits = store.session?.resolved.totalUnits ?? 0
    const unitIndex = engine?.unitIndex ?? 0
    const incorrectCount = engine?.incorrectCount ?? 0
    const metrics = engine?.currentMetrics() ?? null
    const speedUnit = metrics?.speedUnit ?? 'wpm'
    const speedLabel = speedUnit === 'units/min' ? 'UNITS/MIN' : 'WPM'
    const speed = Math.round(metrics?.speed ?? 0)
    const raw = Math.round(metrics?.rawSpeed ?? 0)
    const consistency = Math.round(metrics?.consistency ?? 100)
    const accuracy = metrics?.accuracy ?? 0
    const progress = totalUnits > 0 ? Math.round((unitIndex / totalUnits) * 100) : 0
    const idle = unitIndex === 0
    const rawLabel = speedUnit === 'units/min' ? 'Raw units/min' : 'Raw WPM'

    const timed = durationSeconds !== null && remaining !== null
    const timerProportionValue = timed && durationSeconds !== null ? timerProportion(remaining!, durationSeconds) : 0
    const timerLabel = timed ? 'Time' : 'Progress'
    const timerValue = timed ? formatDuration(remaining! * 1000) : `${progress}%`

    return (
        <div className="flex w-full flex-col items-center">
            <div className="flex items-end justify-center gap-2.5">
                <span
                    className={cn(
                        'leading-[0.9] font-display font-semibold tracking-tight text-ink tabular-nums',
                        timerStyle === 'mini' ? 'text-4xl sm:text-5xl' : 'text-6xl sm:text-7xl',
                    )}
                >
                    {idle ? '—' : speed}
                </span>
                <span className={cn('text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase', timerStyle === 'mini' && 'mb-0.5')}>
                    {speedLabel}
                </span>
            </div>

            {timerStyle === 'bar' && timed ? (
                <div
                    className="mt-3 h-1 w-56 overflow-hidden rounded-full bg-line/70"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(timerProportionValue * 100)}
                    aria-label="Time remaining"
                >
                    <div
                        className={cn(
                            'h-full rounded-full transition-[width] duration-250',
                            timerProportionValue <= 0.1 ? 'bg-destructive' : timerProportionValue <= 0.3 ? 'bg-brass' : 'bg-accent',
                        )}
                        style={{ width: `${Math.round(timerProportionValue * 100)}%` }}
                    />
                </div>
            ) : null}

            <div className="mt-3.5 flex flex-wrap items-center justify-center gap-4 sm:gap-5">
                <Metric label="Accuracy" value={idle ? '—' : `${accuracy.toFixed(1)}%`} />
                <span className="h-5 w-px bg-line-strong/60" aria-hidden />
                <Metric label={rawLabel} value={idle ? '—' : String(raw)} />
                <span className="h-5 w-px bg-line-strong/60" aria-hidden />
                <Metric label="Consistency" value={idle ? '—' : `${consistency}%`} />
                {!timed || timerStyle !== 'off' ? (
                    <>
                        <span className="h-5 w-px bg-line-strong/60" aria-hidden />
                        <Metric label={timerLabel} value={idle ? '—' : timerValue} />
                    </>
                ) : null}
                <span className="h-5 w-px bg-line-strong/60" aria-hidden />
                <Metric label="Errors" value={idle ? '—' : String(incorrectCount)} tone={incorrectCount > 0 ? 'destructive' : 'muted'} />
            </div>
        </div>
    )
}

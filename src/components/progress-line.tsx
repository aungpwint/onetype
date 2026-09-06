import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTypingStore } from '@/stores/typing-store'
import { roundProgressFraction } from '@/core/progress/round-progress'
import { cn } from '@/lib/utils'

export function ProgressLine() {
    const status = useTypingStore((s) => s.status)
    void useTypingStore((s) => s.tick)
    const [, force] = useState(0)

    const running = status === 'running' || status === 'paused'

    useEffect(() => {
        if (status !== 'running') return
        const id = window.setInterval(() => force((n) => n + 1), 200)
        return () => window.clearInterval(id)
    }, [status])

    const state = useTypingStore.getState()
    const engine = state.engine
    const formatted = engine
        ? roundProgressFraction({
              elapsedSeconds: engine.elapsedSeconds(),
              durationSeconds: state.session?.durationSeconds ?? null,
              unitIndex: engine.unitIndex,
              totalUnits: engine.sequence.units.length,
          })
        : 0
    const fraction = Math.round(formatted * 100)

    return (
        <div className="flex w-full max-w-4xl items-center gap-3" aria-hidden>
            <div
                className="relative h-1 flex-1 overflow-hidden rounded-full bg-line/60"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={running ? fraction : 0}
                aria-label="Round progress"
            >
                <AnimatePresence initial={false}>
                    {running ? (
                        <motion.span
                            key="fill"
                            className={cn('absolute inset-y-0 left-0 rounded-full bg-linear-to-r from-accent to-primary')}
                            style={{ width: `${fraction}%` }}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        />
                    ) : null}
                </AnimatePresence>
            </div>
            <span className="w-10 text-right text-[0.6875rem] leading-none text-muted-foreground tabular-nums">{fraction}%</span>
        </div>
    )
}
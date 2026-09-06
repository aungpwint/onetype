import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Flag, Target } from 'lucide-react'
import { useTypingStore } from '@/stores/typing-store'
import { paceState } from '@/core/session/pace'
import { cn } from '@/lib/utils'

export function PacePill() {
    const tick = useTypingStore((s) => s.tick)
    const status = useTypingStore((s) => s.status)
    void tick
    const [, force] = useState(0)

    const running = status === 'running'
    const show = running || status === 'paused'

    useEffect(() => {
        if (!running) return
        const id = window.setInterval(() => force((n) => n + 1), 1000)
        return () => window.clearInterval(id)
    }, [running])

    const state = useTypingStore.getState()
    const test = state.session?.test
    const live = state.getLiveStats()
    const idle = live.unitIndex === 0

    if (!test || show === false || idle) return null
    const pace = paceState(live.wpm, live.accuracy, test.minWpm, test.minAccuracy)

    const byWpm = test.minWpm !== null && pace.byWpm > 0
    const byAcc = pace.byAccuracy > 0
    const parts = [
        byWpm ? `${Math.round(pace.byWpm)} wpm` : '',
        byAcc ? `${pace.byAccuracy.toFixed(1)}% acc` : '',
    ].filter(Boolean)

    return (
        <AnimatePresence>
            <motion.div
                key="pace"
                className={cn(
                    'flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs',
                    pace.onPace ? 'border-success/40 bg-success/10 text-foreground' : 'border-amber-500/40 bg-amber-500/10 text-foreground',
                )}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
            >
                {pace.onPace ? (
                    <>
                        <Flag className="size-3.5 text-success" />
                        On pace to pass
                    </>
                ) : (
                    <>
                        <Target className="size-3.5 text-amber-500" />
                        {parts.join(' · ')} short of the target
                    </>
                )}
            </motion.div>
        </AnimatePresence>
    )
}
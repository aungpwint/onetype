import { useTypingStore } from '@/stores/typing-store'
import { resolveFingerMapping, fingerShort } from '@/lib/finger-mapper'
import { Progress } from '@/components/ui/progress'

export function LessonProgress() {
    const tick = useTypingStore((s) => s.tick)
    void tick

    const status = useTypingStore((s) => s.status)
    const engine = useTypingStore((s) => s.engine)
    const inPlay = status === 'ready' || status === 'running'
    if (!inPlay || !engine) return null

    const unit = engine.expectedUnit
    if (!unit) return null

    const total = engine.sequence.units.length
    const current = unit.index
    const progress = total > 0 ? Math.round((current / total) * 100) : 0

    const mapping = resolveFingerMapping(unit.keyCode, unit.modifier === 'shift')

    return (
        <div className="flex w-full items-center gap-3">
            <Progress value={progress} className="h-1 flex-1" aria-label="Lesson progress" />

            {mapping.primary ? (
                <span
                    className="shrink-0 rounded-full bg-accent/10 px-2 py-px font-mono text-[0.625rem] font-semibold tracking-wider text-accent uppercase"
                    title={mapping.shift ? `${fingerShort(mapping.shift)} + ${fingerShort(mapping.primary)}` : fingerShort(mapping.primary)}
                >
                    {fingerShort(mapping.primary)}
                    {mapping.shift ? ` + ${fingerShort(mapping.shift)}` : ''}
                </span>
            ) : null}

            <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
                {current + 1}/{total}
            </span>
        </div>
    )
}

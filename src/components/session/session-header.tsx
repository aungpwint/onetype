import { Pause, Play, LogOut } from 'lucide-react'
import { useTypingStore } from '@/stores/typing-store'
import { containsMyanmar } from '@/core/unicode/myanmar'
import { cn, eyebrowClass } from '@/lib/utils'
import { LessonProgress } from '@/components/keyboard/lesson-progress'
import { SessionTools } from '@/components/session/session-tools'
import { Button } from '@/components/ui/button'

type SessionStatus = ReturnType<typeof useTypingStore.getState>['status']

interface SessionHeaderProps {
    eyebrow: string
    title: string
    status: SessionStatus
    durationSeconds: number | null
    onToggle: () => void
    onExit: () => void
}

function toggleLabel(status: SessionStatus, durationSeconds: number | null): string {
    if (status === 'paused') return 'Resume'
    if (status === 'running') return 'Pause'
    return durationSeconds === null ? 'First key starts' : 'Start'
}

export function SessionHeader({ eyebrow, title, status, durationSeconds, onToggle, onExit }: SessionHeaderProps) {
    const isPaused = status === 'paused'

    return (
        <header className="shrink-0 border-b border-line bg-background/60 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4 px-5 py-3 sm:px-8">
                <div className="min-w-0">
                    <p className={eyebrowClass}>{eyebrow}</p>
                    <h1
                        className={cn(
                            'mt-0.5 truncate font-display text-lg leading-tight font-semibold tracking-tight text-foreground sm:text-xl',
                            containsMyanmar(title) ? 'font-myanmar' : '',
                        )}
                    >
                        {title}
                    </h1>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    <SessionTools />
                    <span className="mx-1 h-5 w-px bg-line/70" aria-hidden />
                    <Button variant="outline" size="sm" onClick={onExit}>
                        <LogOut className="size-4" />
                        <span>Exit</span>
                    </Button>
                    <Button size="sm" variant="default" onClick={onToggle} aria-live="polite">
                        {isPaused ? <Play className="size-4" /> : status === 'running' ? <Pause className="size-4" /> : null}
                        {toggleLabel(status, durationSeconds)}
                    </Button>
                </div>
            </div>
            {(status === 'ready' || status === 'running') && (
                <div className="border-t border-line/60 px-5 pt-2 pb-2.5 sm:px-8">
                    <LessonProgress />
                </div>
            )}
        </header>
    )
}

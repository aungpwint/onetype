import { AlignJustify, ArrowLeft, Pause, Play, WrapText } from 'lucide-react'
import { useTypingStore } from '@/stores/typing-store'
import { resolveParagraphView, useUiStore } from '@/stores/ui-store'
import { containsMyanmar } from '@/core/unicode/myanmar'
import type { Level } from '@/types'
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
    level?: Level
    onToggle: () => void
    onExit: () => void
}

function toggleLabel(status: SessionStatus, durationSeconds: number | null): string {
    if (status === 'paused') return 'Resume'
    if (status === 'running') return 'Pause'
    return durationSeconds === null ? 'First key starts' : 'Start'
}

function statusAnnouncement(status: SessionStatus): string {
    if (status === 'paused') return 'Round paused'
    if (status === 'running') return 'Round running'
    return 'Round ready'
}

export function SessionHeader({ eyebrow, title, status, durationSeconds, level, onToggle, onExit }: SessionHeaderProps) {
    const isPaused = status === 'paused'
    const paragraphView = useUiStore((s) => s.paragraphView)
    const toggleParagraphView = useUiStore((s) => s.toggleParagraphView)

    const showParagraphToggle = level !== undefined
    const paragraphMode = showParagraphToggle && resolveParagraphView(paragraphView, level)

    return (
        <header className="shrink-0 border-b border-line bg-background/60 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4 px-5 py-3 sm:px-8">
                <div className="flex min-w-0 items-center gap-3">
                    <Button variant="ghost" size="sm" onClick={onExit} className="-ml-2 shrink-0" aria-label="Back to the previous page">
                        <ArrowLeft className="size-4" />
                        <span>Back</span>
                    </Button>
                    <span className="h-5 w-px shrink-0 bg-line/70" aria-hidden />

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
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    <div className="flex items-center gap-1">
                        <SessionTools />
                        {showParagraphToggle ? (
                            <Button
                                variant="outline"
                                size="icon-sm"
                                onClick={() => toggleParagraphView(level)}
                                aria-pressed={paragraphMode}
                                aria-label={paragraphMode ? 'Show as a single line' : 'Wrap into a paragraph'}
                                title={paragraphMode ? 'Show as a single line' : 'Wrap into a paragraph'}
                                className={
                                    paragraphMode
                                        ? 'border-primary bg-primary/10 text-primary hover:border-primary hover:bg-primary/15 hover:text-primary'
                                        : undefined
                                }
                            >
                                {paragraphMode ? <AlignJustify className="size-4" /> : <WrapText className="size-4" />}
                            </Button>
                        ) : null}
                    </div>
                    <span className="mx-1 h-5 w-px bg-line/70" aria-hidden />
                    <Button size="sm" variant="default" onClick={onToggle}>
                        {isPaused ? <Play className="size-4" /> : status === 'running' ? <Pause className="size-4" /> : null}
                        {toggleLabel(status, durationSeconds)}
                    </Button>
                    <span className="sr-only" aria-live="polite">
                        {statusAnnouncement(status)}
                    </span>
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

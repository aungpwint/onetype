import { AlignJustify, WrapText } from 'lucide-react'
import { resolveParagraphView, useUiStore } from '@/stores/ui-store'
import type { Level } from '@/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const activeClasses =
    'border-primary bg-primary/10 text-primary hover:border-primary hover:bg-primary/15 hover:text-primary focus-visible:border-primary'

interface ParagraphToggleProps {
    level?: Level
    compact?: boolean
}

export function ParagraphToggle({ level, compact = false }: ParagraphToggleProps) {
    const paragraphView = useUiStore((s) => s.paragraphView)
    const toggleParagraphView = useUiStore((s) => s.toggleParagraphView)

    if (level === undefined) return null

    const paragraphMode = resolveParagraphView(paragraphView, level)
    const label = paragraphMode ? 'Show as a single line' : 'Wrap into a paragraph'

    return (
        <Button
            variant={compact ? 'ghost' : 'outline'}
            size={compact ? 'sm' : 'icon-sm'}
            onClick={(e) => {
                e.currentTarget.blur()
                toggleParagraphView(level)
            }}
            aria-pressed={paragraphMode}
            aria-label={label}
            title={label}
            className={cn(compact && paragraphMode && 'text-primary', !compact && paragraphMode && activeClasses)}
        >
            {paragraphMode ? <AlignJustify className={compact ? 'size-3.5' : 'size-4'} /> : <WrapText className={compact ? 'size-3.5' : 'size-4'} />}
        </Button>
    )
}

import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export interface BackButtonProps {
    onClick: () => void
    ariaLabel?: string
    compact?: boolean
}

export function BackButton({ onClick, ariaLabel = 'Back to the previous page', compact = false }: BackButtonProps) {
    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
                e.currentTarget.blur()
                onClick()
            }}
            aria-label={ariaLabel}
            className={cn('shrink-0', !compact && '-ml-2')}
        >
            <ArrowLeft className={compact ? 'size-3.5' : 'size-4'} />
            <span>Back</span>
        </Button>
    )
}

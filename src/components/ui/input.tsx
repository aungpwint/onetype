import * as React from 'react'
import { cn } from '@/lib/utils'

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, type, ...props }, ref) => (
    <input
        type={type}
        ref={ref}
        className={cn(
            'flex h-9 w-full rounded-lg border border-line-strong/60 bg-background px-3 py-1 text-sm shadow-sm transition-[border-color,box-shadow] placeholder:text-muted-foreground hover:border-line-strong focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
            className,
        )}
        {...props}
    />
))
Input.displayName = 'Input'

export { Input }

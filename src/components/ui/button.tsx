import * as React from 'react'
import { cn } from '@/lib/utils'

type Variant = 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link' | 'brass'
type Size = 'default' | 'sm' | 'lg' | 'icon' | 'icon-sm'

const variantClasses: Record<Variant, string> = {
    default: 'bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active',
    secondary: 'bg-secondary text-ink-soft hover:bg-surface-elevated hover:text-foreground',
    outline: 'border border-line-strong bg-background hover:bg-muted hover:text-foreground active:bg-muted',
    ghost: 'hover:bg-muted hover:text-foreground',
    destructive: 'bg-destructive text-white hover:bg-destructive/90',
    link: 'text-primary underline-offset-4 hover:underline',
    brass: 'bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active',
}

const sizeClasses: Record<Size, string> = {
    default: 'h-9 px-4 py-2 text-sm',
    sm: 'h-8 rounded-md px-3 text-xs',
    lg: 'h-10 rounded-md px-6 text-base',
    icon: 'h-9 w-9',
    'icon-sm': 'h-8 w-8',
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant
    size?: Size
    asChild?: boolean
}

const buttonClasses = ({ variant = 'default', size = 'default', className }: Partial<ButtonProps>) =>
    cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap transition-[color,background-color,border-color,box-shadow,transform] duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
        variantClasses[variant],
        sizeClasses[size],
        className,
    )

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'default', size = 'default', type = 'button', asChild, ...props }, ref) => {
        if (asChild && props.children) {
            const child = React.Children.only(props.children) as React.ReactElement<{ className?: string }>
            return React.cloneElement(child, {
                className: buttonClasses({ variant, size, className: cn(child.props.className, className) }),
            })
        }
        return <button ref={ref} type={type} className={buttonClasses({ variant, size, className })} {...props} />
    },
)
Button.displayName = 'Button'

import { Component, useEffect, useRef, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

import { RefreshCw, RotateCcw, X, type LucideIcon } from 'lucide-react'
import { Button, type ButtonProps } from './ui/button'
import { cn, cardClass, eyebrowClass, pageTitleClass, sectionTitleClass } from '@/lib/utils'

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
    state = { error: null as Error | null }

    static getDerivedStateFromError(error: Error) {
        return { error }
    }

    componentDidCatch(error: Error, info: unknown) {
        // Report error metadata only; never log typed content.
        console.error('OneType render error:', error, info)
    }

    retry = () => this.setState({ error: null })

    render() {
        if (this.state.error) {
            return (
                <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
                    <p className="font-display text-2xl">Something went wrong</p>
                    <p className="max-w-md text-sm text-muted-foreground">
                        OneType hit an unexpected error. Your saved progress is safe — reload to continue.
                    </p>
                    <p className="max-w-md font-mono text-xs text-muted-foreground">{String(this.state.error.message || this.state.error)}</p>
                    <div className="flex gap-2">
                        <Button onClick={this.retry}>
                            <RotateCcw className="size-4" />
                            Try again
                        </Button>
                        <Button variant="outline" onClick={() => window.location.reload()}>
                            Reload
                        </Button>
                    </div>
                </div>
            )
        }
        return this.props.children
    }
}

export function Atmosphere({ className }: { className?: string }) {
    return (
        <div aria-hidden className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}>
            <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-blue-600/8 blur-[120px]" />
            <div className="absolute top-16 -right-24 h-80 w-80 rounded-full bg-sky-500/6 blur-[110px]" />
            <div className="absolute -bottom-40 left-1/3 h-96 w-96 rounded-full bg-indigo-500/5 blur-[130px]" />
            <div className="absolute inset-0 bg-linear-to-br from-blue-500/4.5 via-transparent to-transparent" />
        </div>
    )
}

export function Spinner({ label }: { label?: string }) {
    return (
        <div className="flex items-center justify-center gap-3 py-10 text-muted-foreground" role="status">
            <span className="relative inline-flex h-5 w-5">
                <span className="absolute inset-0 rounded-full border-2 border-muted-foreground/25" />
                <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-accent" />
            </span>
            {label ? <span className="text-sm">{label}</span> : null}
            <span className="sr-only">Loading</span>
        </div>
    )
}

export function Modal({
    open,
    onClose,
    children,
    width = 'max-w-lg',
    ariaLabel = 'Dialog',
}: {
    open: boolean
    onClose: () => void
    children: ReactNode
    width?: string
    ariaLabel?: string
}) {
    const panelRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        if (!open) return
        const previouslyFocused = document.activeElement as HTMLElement | null
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', onKey)
        // Move focus into the panel on open so keyboard users land in the dialog.
        const raf = requestAnimationFrame(() => {
            panelRef.current?.focus()
        })
        return () => {
            cancelAnimationFrame(raf)
            window.removeEventListener('keydown', onKey)
            previouslyFocused?.focus()
        }
    }, [open, onClose])

    return (
        <AnimatePresence>
            {open ? (
                <motion.div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.16 }}
                >
                    <div className="absolute inset-0 bg-black/45" onClick={onClose} aria-hidden />
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-label={ariaLabel}
                        tabIndex={-1}
                        ref={panelRef}
                        className={cn(
                            'relative z-10 w-full rounded-xl border border-line bg-card/85 p-6 shadow-(--shadow-3) backdrop-blur-2xl outline-none',
                            width,
                        )}
                        initial={{ opacity: 0, y: 14, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.98 }}
                        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close dialog"
                            className="absolute top-4 right-4 rounded-md p-1 text-muted-foreground opacity-70 transition-colors hover:bg-muted hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        >
                            <X className="size-4" />
                        </button>
                        {children}
                    </motion.div>
                </motion.div>
            ) : null}
        </AnimatePresence>
    )
}

export function EmptyState({ icon, title, children }: { icon?: ReactNode; title: string; children: ReactNode }) {
    return (
        <div className={cn(cardClass, 'flex flex-col items-center gap-2 px-8 py-14 text-center')}>
            {icon ? (
                <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-muted/60 text-muted-foreground shadow-sm">
                    {icon}
                </div>
            ) : null}
            <p className={cn(sectionTitleClass, 'text-xl')}>{title}</p>
            <div className="max-w-md text-sm leading-relaxed text-muted-foreground">{children}</div>
        </div>
    )
}

export function Stat({ label, value, hint, icon }: { label: string; value: ReactNode; hint?: string; icon?: ReactNode }) {
    return (
        <div className={cn(cardClass, 'px-4 py-3.5')}>
            <div className="flex items-center gap-1.5">
                {icon ? <span className="text-accent">{icon}</span> : null}
                <p className={eyebrowClass}>{label}</p>
            </div>
            <p className="mt-1.5 font-display text-2xl leading-tight font-semibold tracking-tight tabular-nums">{value}</p>
            {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
    )
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
    return (
        <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-muted-foreground">{label}</span>
            {children}
            {hint ? <span className="mt-1 block text-xs text-muted-foreground">{hint}</span> : null}
        </label>
    )
}

export const inputClass =
    'flex h-9 w-full rounded-lg border border-line-strong/60 bg-background px-3 py-1 text-sm shadow-sm transition-[border-color,box-shadow] placeholder:text-muted-foreground hover:border-line-strong focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/30'

export function PageHeader({
    eyebrow,
    title,
    subtitle,
    children,
}: {
    eyebrow: string
    title: ReactNode
    subtitle?: ReactNode
    children?: ReactNode
}) {
    return (
        <header className="flex flex-wrap items-end justify-between gap-4">
            <div>
                <p className={eyebrowClass}>{eyebrow}</p>
                <h1 className={cn(pageTitleClass, 'mt-1.5')}>{title}</h1>
                {subtitle ? <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{subtitle}</p> : null}
            </div>
            {children}
        </header>
    )
}

export function Metric({
    label,
    value,
    align = 'center',
    size = 'md',
    tone,
}: {
    label: string
    value: ReactNode
    align?: 'center' | 'end'
    size?: 'md' | 'sm'
    tone?: 'success' | 'destructive' | 'muted'
}) {
    const toneClass =
        tone === 'success'
            ? 'text-success'
            : tone === 'destructive'
              ? 'text-destructive'
              : tone === 'muted'
                ? 'text-muted-foreground'
                : 'text-foreground'
    const valueClass =
        size === 'sm'
            ? 'text-sm leading-none font-semibold tabular-nums text-foreground md:text-base'
            : `text-lg leading-none font-semibold tabular-nums md:text-xl ${toneClass}`
    return (
        <div className={cn('flex flex-col gap-0.5', align === 'end' ? 'items-end' : 'items-center')}>
            <span className={valueClass}>{value}</span>
            <span
                className={cn(
                    size === 'sm' ? 'text-[0.625rem]' : 'text-[0.6875rem]',
                    'font-medium tracking-[0.12em] text-muted-foreground uppercase',
                )}
            >
                {label}
            </span>
        </div>
    )
}

export function AsyncButton({
    loading,
    loadingLabel = 'Working…',
    icon: Icon,
    loadingIcon: LoadingIcon = RefreshCw,
    className,
    disabled,
    children,
    ...props
}: ButtonProps & { loading: boolean; loadingLabel?: ReactNode; icon?: LucideIcon; loadingIcon?: LucideIcon }) {
    return (
        <Button disabled={loading || disabled} className={className} {...props}>
            {loading ? (
                <>
                    <LoadingIcon className="size-4 animate-spin" />
                    {loadingLabel}
                </>
            ) : (
                <>
                    {Icon ? <Icon className="size-4" /> : null}
                    {children}
                </>
            )}
        </Button>
    )
}

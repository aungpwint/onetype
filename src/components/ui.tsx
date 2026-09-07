import { Component, useEffect, useRef, type ReactNode, type SelectHTMLAttributes } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'

import { RefreshCw, RotateCcw, X, type LucideIcon } from 'lucide-react'
import { Button, type ButtonProps } from './ui/button'
import { Switch } from './ui/switch'
import { useSettingsStore } from '@/stores/settings-store'
import { useUiStore } from '@/stores/ui-store'
import { cn, cardClass, eyebrowClass, pageTitleClass, sectionTitleClass, selectClass } from '@/lib/utils'

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
    const effect = useSettingsStore((s) => s.getEnum('design.themeEffect', ['none', 'aurora', 'dots'] as const, 'none'))
    const focusMode = useUiStore((s) => s.focusMode)
    const hasEffect = effect === 'aurora' || effect === 'dots'
    const quiet = focusMode && hasEffect
    return (
        <div aria-hidden className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}>
            <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-[color-mix(in_srgb,var(--primary)_9%,transparent)] blur-[120px]" />
            <div className="absolute top-16 -right-24 h-80 w-80 rounded-full bg-[color-mix(in_srgb,var(--primary)_6%,transparent)] blur-[110px]" />
            <div className="absolute -bottom-40 left-1/3 h-96 w-96 rounded-full bg-[color-mix(in_srgb,var(--primary)_5%,transparent)] blur-[130px]" />
            <div className="absolute inset-0 bg-linear-to-br from-[color-mix(in_srgb,var(--primary)_5%,transparent)] via-transparent to-transparent" />

            {effect === 'aurora' ? (
                <div className={cn('tt-aurora absolute inset-0', quiet && 'opacity-40')}>
                    <div className="tt-aurora-blob tt-aurora-a" />
                    <div className="tt-aurora-blob tt-aurora-b" />
                    <div className="tt-aurora-blob tt-aurora-c" />
                </div>
            ) : null}
            {effect === 'dots' ? <div className={cn('tt-dots absolute inset-0', quiet && 'opacity-40')} /> : null}
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
    dismissable = true,
    className,
    closeOnBackdrop,
}: {
    open: boolean
    onClose: () => void
    children: ReactNode
    width?: string
    ariaLabel?: string
    dismissable?: boolean
    className?: string
    closeOnBackdrop?: boolean
}) {
    const panelRef = useRef<HTMLDivElement | null>(null)
    const reduceMotion = useReducedMotion()

    useEffect(() => {
        if (!open) return
        const previouslyFocused = document.activeElement as HTMLElement | null
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose()
        }
        if (dismissable) window.addEventListener('keydown', onKey)
        // Move focus into the panel on open so keyboard users land in the dialog.
        const raf = requestAnimationFrame(() => {
            panelRef.current?.focus()
        })
        return () => {
            cancelAnimationFrame(raf)
            if (dismissable) window.removeEventListener('keydown', onKey)
            previouslyFocused?.focus()
        }
    }, [open, onClose, dismissable])

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
                    <div
                        className="absolute inset-0 bg-black/45"
                        onClick={closeOnBackdrop !== false && dismissable ? onClose : undefined}
                        aria-hidden
                    />
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-label={ariaLabel}
                        tabIndex={-1}
                        ref={panelRef}
                        className={cn(
                            'relative z-10 w-full rounded-xl border border-line bg-card/85 p-6 shadow-(--shadow-3) backdrop-blur-2xl outline-none',
                            width,
                            className,
                        )}
                        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.98 }}
                        animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
                        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.98 }}
                        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    >
                        {dismissable && (
                            <button
                                type="button"
                                onClick={onClose}
                                aria-label="Close dialog"
                                className="absolute top-4 right-4 rounded-md p-1 text-muted-foreground opacity-70 transition-colors hover:bg-muted hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                            >
                                <X className="size-4" />
                            </button>
                        )}
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
            <p className="mt-1.5 text-2xl leading-tight font-semibold tracking-tight tabular-nums">{value}</p>
            {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
    )
}

export function StatCard({
    icon,
    label,
    value,
    hint,
    size = 'md',
}: {
    icon?: ReactNode
    label: string
    value: ReactNode
    hint?: string
    size?: 'md' | 'lg'
}) {
    const lg = size === 'lg'
    return (
        <div
            className={cn(
                'group relative overflow-hidden rounded-2xl border border-line bg-card shadow-(--shadow-1) transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:border-line-strong hover:shadow-(--shadow-3)',
                lg ? 'p-5' : 'p-4',
            )}
        >
            <span aria-hidden className="pointer-events-none absolute inset-0 bg-linear-to-b from-surface-elevated/60 to-transparent opacity-80" />
            <div className="relative flex items-center justify-between gap-2">
                <p className={eyebrowClass}>{label}</p>
                {icon ? (
                    <span
                        className={cn(
                            'flex shrink-0 items-center justify-center border border-line bg-paper-2/70 text-accent',
                            lg
                                ? 'h-8 w-8 rounded-lg transition-[border-color,background-color,color] duration-200 group-hover:border-accent/30 group-hover:bg-accent/10 group-hover:text-accent'
                                : 'h-7 w-7 rounded-md',
                        )}
                    >
                        {icon}
                    </span>
                ) : null}
            </div>
            <p className={cn('relative leading-none font-semibold tracking-tight tabular-nums', lg ? 'mt-2.5 text-3xl' : 'mt-2 text-2xl')}>{value}</p>
            {hint ? <p className={cn('relative text-muted-foreground', lg ? 'mt-2 text-xs' : 'mt-1.5 text-[0.6875rem]')}>{hint}</p> : null}
        </div>
    )
}

export function Field({
    label,
    children,
    hint,
    className,
    id,
}: {
    label: string
    children: ReactNode
    hint?: string
    className?: string
    id?: string
}) {
    return (
        <label id={id} className={cn('block', className)}>
            <span className="mb-1.5 block text-sm font-medium text-muted-foreground">{label}</span>
            {children}
            {hint ? <span className="mt-1 block text-xs text-muted-foreground">{hint}</span> : null}
        </label>
    )
}

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

export function CardSection({ icon, title, children, id }: { icon?: ReactNode; title: ReactNode; children?: ReactNode; id?: string }) {
    return (
        <section id={id} className={cn(cardClass, 'p-5')}>
            <h2 className={cn(sectionTitleClass, 'flex items-center gap-2')}>
                {icon ? <span className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-accent">{icon}</span> : null}
                {title}
            </h2>
            {children}
        </section>
    )
}

export function SettingRow({
    title,
    description,
    checked,
    onChecked,
    icon: Icon,
    id,
}: {
    title: string
    description: string
    checked: boolean
    onChecked: (v: boolean) => void
    icon?: LucideIcon
    id?: string
}) {
    return (
        <label
            id={id}
            className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-line px-4 py-3 transition-colors hover:bg-muted/40"
        >
            <span className="flex items-start gap-3">
                {Icon ? (
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <Icon className="size-4" />
                    </span>
                ) : null}
                <span>
                    <span className="block text-sm font-medium">{title}</span>
                    <span className="block text-xs text-muted-foreground">{description}</span>
                </span>
            </span>
            <Switch checked={checked} onCheckedChange={onChecked} />
        </label>
    )
}

export function SelectField({ className, disabled, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <select className={cn(selectClass, className)} disabled={disabled} {...props}>
            {children}
        </select>
    )
}

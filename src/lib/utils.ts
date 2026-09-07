import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value))
}

export const cardClass = cn(
    'rounded-2xl border border-line bg-surface shadow-[inset_0_1px_0_var(--card-hi),var(--shadow-1)]',
)

export const highlightClass = cn(
    'rounded-xl border border-accent/40 bg-linear-to-b from-accent/10 via-transparent to-transparent shadow-[inset_0_1px_0_color-mix(in_srgb,var(--accent)_10%,transparent)]',
)

export const featuredClass = cn(
    'relative overflow-hidden rounded-3xl border border-[color-mix(in_srgb,var(--primary)_24%,transparent)] bg-card/75 shadow-[var(--shadow-3)] backdrop-blur-2xl',
)

export const appPageClass = cn('mx-auto w-full min-w-0 max-w-[84rem] space-y-6 px-[clamp(1.5rem,2.5vw,2.5rem)] pt-8 pb-14')

export const eyebrowClass = cn('text-[0.6875rem] font-medium tracking-[0.16em] text-ink-faint uppercase')

export const microLabelClass = cn('text-[0.625rem] font-medium tracking-[0.12em] text-muted-foreground uppercase')

export const pageTitleClass = cn('font-display text-[clamp(1.5rem,1.15rem+0.9vw,2rem)] leading-[1.15] font-semibold tracking-[-0.02em]')

export const sectionTitleClass = cn('font-display text-lg leading-snug font-semibold tracking-[-0.012em]')

export const kbdClass = cn(
    'text-key-ink rounded border border-line-strong bg-key-top px-1.5 py-0.5 font-mono text-xs shadow-[0_1px_0_var(--line-strong)]',
)

export const chipClass = cn('inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-xs text-ink-soft')

export const selectClass = cn(
    'flex h-9 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
)

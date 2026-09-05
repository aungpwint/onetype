import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

/**
 * Shared class strings. Everything here is composed from plain Tailwind
 * utilities (mindful of the design tokens in app.css) so surfaces stay
 * consistent without bespoke CSS classes.
 */

/** Standard data-surface — solid white card on a quiet neutral page. */
export const cardClass = cn('rounded-xl border border-line bg-surface shadow-[var(--shadow-1)]')

/**
 * Positive / highlight card — a very subtle blue ambient treatment for the
 * one card in a section that carries the primary action or active state.
 * Intentionally restrained: never a bright gradient or glow.
 */
export const highlightClass = cn('rounded-xl border border-blue-500/20 bg-gradient-to-b from-blue-950/30 to-slate-900/40')

/** Page column wrapper: full-bleed scroll area with a roomy vertical rhythm. */
export const appPageClass = cn('w-full min-w-0 space-y-6 px-[clamp(1.5rem,2.5vw,2.5rem)] pt-8 pb-12')

/** Micro-label used above page and section titles. */
export const eyebrowClass = cn('font-mono text-[0.6875rem] font-medium tracking-[0.16em] text-ink-faint uppercase')

export const pageTitleClass = cn('font-display text-[clamp(1.5rem,1.15rem+0.9vw,2rem)] leading-[1.15] font-bold tracking-[-0.02em]')

export const sectionTitleClass = cn('font-display text-lg leading-snug font-semibold tracking-[-0.012em]')

/** Keycap-looking inline token (the F/J anchor nubs, shortcut hints). */
export const kbdClass = cn(
    'text-key-ink rounded border border-line-strong bg-key-top px-1.5 py-0.5 font-mono text-xs shadow-[0_1px_0_var(--line-strong)]',
)

export const chipClass = cn('inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-xs text-ink-soft')

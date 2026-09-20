import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { cn, cardClass, eyebrowClass, pageTitleClass } from '@/lib/utils'
import { useTypingStore } from '@/stores/typing-store'
import { useSettingsStore } from '@/stores/settings-store'
import { Session } from '@/components/session/session-workspace'
import { unsupportedGraphemes, type PracticeUnit } from '@/core/materials/practice-material'
import { layoutForLanguage } from '@/core/keyboard-layout/registry'
import { resolvedPracticePreferences } from '@/core/practice/preferences'
import { quotePool } from '@/data/quotes'
import { BackButton } from '@/components/session/back-button'
import { Hash, Play, Quote, Timer, Type, type LucideIcon } from 'lucide-react'

const TIME_OPTIONS = [15, 30, 60, 120]
const WORD_OPTIONS = [10, 25, 50, 100]

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

const MODES: Array<{ key: PracticeUnit; label: string; icon: LucideIcon }> = [
    { key: 'time', label: 'Time', icon: Timer },
    { key: 'words', label: 'Words', icon: Hash },
    { key: 'quote', label: 'Quote', icon: Quote },
    { key: 'text', label: 'Text', icon: Type },
]

function formatClock(seconds: number): string {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function Segment({ label, active, onClick }: { label: ReactNode; active: boolean; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={cn(
                'inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-[color,background-color,box-shadow] duration-150 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                active ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
        >
            {label}
        </button>
    )
}

function OptionPills({
    options,
    value,
    onChange,
    format,
}: {
    options: number[]
    value: number
    onChange: (v: number) => void
    format?: (v: number) => string
}) {
    return (
        <div className="flex flex-wrap gap-1.5">
            {options.map((opt) => (
                <button
                    key={opt}
                    type="button"
                    onClick={() => onChange(opt)}
                    aria-pressed={opt === value}
                    className={cn(
                        'rounded-lg border px-3.5 py-1.5 text-sm font-medium tabular-nums transition-[color,background-color,border-color] duration-150 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                        opt === value
                            ? 'border-accent/40 bg-accent/10 text-accent'
                            : 'border-line bg-card text-ink-soft hover:border-line-strong hover:text-foreground',
                    )}
                >
                    {format?.(opt) ?? String(opt)}
                </button>
            ))}
        </div>
    )
}

function AddonPill({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            type="button"
            onClick={() => onChange(!checked)}
            aria-pressed={checked}
            className={cn(
                'inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-[color,background-color,border-color] duration-150 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                checked
                    ? 'border-accent/45 bg-accent/10 text-accent'
                    : 'border-line bg-card text-muted-foreground hover:border-line-strong hover:text-foreground',
            )}
        >
            <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', checked ? 'bg-accent' : 'bg-line-strong')} />
            {label}
        </button>
    )
}

export default function PracticePage() {
    const setSetting = useSettingsStore((s) => s.set)
    const unit = useSettingsStore((s) => s.values['practice.unit']) as PracticeUnit
    const time = Number(useSettingsStore((s) => s.values['practice.time']))
    const words = Number(useSettingsStore((s) => s.values['practice.words']))
    const langValue = useSettingsStore((s) => s.values['practice.lang']) as 'english' | 'myanmar'
    const punctuationValue = useSettingsStore((s) => s.values['practice.punctuation']) === 'on'
    const numbersValue = useSettingsStore((s) => s.values['practice.numbers']) === 'on'
    const [text, setText] = useState('')
    const [startError, setStartError] = useState<string | null>(null)
    const navigate = useNavigate()
    const session = useTypingStore((s) => s.session)
    const beginPractice = useTypingStore((s) => s.beginPractice)
    const inSession = session?.kind === 'practice'
    const reduceMotion = useReducedMotion()

    const prefs = resolvedPracticePreferences({
        unit,
        time,
        words,
        lang: langValue,
        punctuation: punctuationValue,
        numbers: numbersValue,
    })

    const updateUnit = useCallback((v: PracticeUnit) => void setSetting('practice.unit', v), [setSetting])
    const updateTime = useCallback((v: number) => void setSetting('practice.time', String(v)), [setSetting])
    const updateWords = useCallback((v: number) => void setSetting('practice.words', String(v)), [setSetting])
    const updateLang = useCallback((v: 'english' | 'myanmar') => void setSetting('practice.lang', v), [setSetting])
    const updatePunctuation = useCallback((v: boolean) => void setSetting('practice.punctuation', v ? 'on' : 'off'), [setSetting])
    const updateNumbers = useCallback((v: boolean) => void setSetting('practice.numbers', v ? 'on' : 'off'), [setSetting])

    // Stable preview of the quotation you're about to type, so the readout
    // swaps language with the toggle without re-rolling on every render.
    const previewQuote = useMemo(() => quotePool(langValue)[0] ?? null, [langValue])

    const layout = useMemo(() => layoutForLanguage(langValue), [langValue])
    const badChars = useMemo(() => (unit === 'text' && text.trim() ? unsupportedGraphemes(layout, text) : []), [unit, text, layout])

    const start = useCallback(() => {
        if (badChars.length > 0) return
        setStartError(null)
        void beginPractice({
            language: prefs.lang,
            unit: prefs.unit,
            time: prefs.time,
            words: prefs.words,
            text,
            punctuation: prefs.punctuation,
            numbers: prefs.numbers,
        }).catch((err: unknown) => setStartError(err instanceof Error ? err.message : 'Could not start this run'))
    }, [beginPractice, prefs, text, badChars])

    const sourceName = unit === 'time' ? `${time}s practice` : unit === 'words' ? `${words} words` : unit === 'quote' ? 'Quote' : 'Custom text'

    if (inSession) {
        return (
            <Session
                durationSeconds={unit === 'time' ? time : null}
                sourceName={sourceName}
                eyebrow="Quick practice"
                keyboardDefault={false}
                onExit={() => navigate('/practice')}
            />
        )
    }

    const mode = MODES.find((m) => m.key === unit) ?? MODES[0]
    const ModeIcon = mode.icon
    const textEmpty = unit === 'text' && text.trim().length === 0
    const textBlocked = badChars.length > 0
    const langLabel = langValue === 'myanmar' ? 'Myanmar' : 'English'

    return (
        <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
            <header className="flex shrink-0 items-center border-b border-line bg-background/60 px-4 py-2.5 backdrop-blur-xl sm:px-6">
                <BackButton onClick={() => navigate(-1)} />
                <span className="ml-auto hidden font-mono text-[0.6875rem] tracking-[0.14em] text-ink-faint uppercase sm:block">Quick practice</span>
            </header>

            <main className="min-h-0 flex-1 overflow-y-auto">
                <div className="mx-auto w-full max-w-5xl px-5 pt-10 pb-14 sm:px-8">
                    <motion.div
                        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.22, ease: EASE }}
                    >
                        <p className={eyebrowClass}>Practice · အမြန်လေ့ကျင့်ခြင်း</p>
                        <h1 className={cn(pageTitleClass, 'mt-1.5')}>Warm-up desk</h1>
                        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
                            No student profile needed. Set a pace, pick a language, and start typing — this run lives in the moment, and lives here
                            only.
                        </p>
                    </motion.div>

                    <motion.div
                        className="mt-8 grid items-start gap-5 lg:grid-cols-[0.92fr_1.08fr]"
                        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.26, delay: 0.05, ease: EASE }}
                    >
                        <section className={cn(cardClass, 'order-1 flex flex-col p-5 sm:p-6 lg:order-2')}>
                            <div className="flex items-center justify-between gap-3">
                                <p className={eyebrowClass}>What you'll type</p>
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-line bg-muted/50 text-accent">
                                    <ModeIcon className="size-4" />
                                </span>
                            </div>

                            <div className="flex flex-1 flex-col items-center justify-center gap-3 py-8 text-center">
                                {unit === 'time' ? (
                                    <>
                                        <p className="font-mono text-6xl leading-none font-semibold tracking-tight text-foreground tabular-nums">
                                            {formatClock(time)}
                                        </p>
                                        <p className="text-xs leading-relaxed text-ink-faint">One steady run to the end · no pauses between lines.</p>
                                    </>
                                ) : unit === 'words' ? (
                                    <>
                                        <p className="font-mono text-6xl leading-none font-semibold tracking-tight text-foreground tabular-nums">
                                            {words}
                                            <span className="ml-2 text-2xl font-medium text-ink-faint">words</span>
                                        </p>
                                        <p className="text-xs leading-relaxed text-ink-faint">
                                            By the count, not the clock · the meter fills as you type.
                                        </p>
                                    </>
                                ) : unit === 'quote' && previewQuote ? (
                                    <figure className="max-w-sm">
                                        <blockquote
                                            className={cn(
                                                'font-display text-xl leading-relaxed font-medium tracking-[-0.01em] text-foreground',
                                                langValue === 'myanmar' ? 'font-myanmar' : '',
                                            )}
                                        >
                                            “{previewQuote.text}”
                                        </blockquote>
                                        <figcaption className="mt-3 text-xs text-ink-faint">— {previewQuote.source}</figcaption>
                                        <p className="mt-3 text-xs leading-relaxed text-ink-faint">
                                            A short quotation in {langLabel} · type it through, then get another.
                                        </p>
                                    </figure>
                                ) : (
                                    <div className="w-full">
                                        {text.trim() ? (
                                            <p className="line-clamp-4 font-display text-base leading-relaxed wrap-break-word text-foreground">{text}</p>
                                        ) : (
                                            <p className="text-sm leading-relaxed text-ink-faint">
                                                Type or paste your text in the setup panel and it appears here, ready to go.
                                            </p>
                                        )}
                                        <p className="mt-3 text-xs text-ink-faint">Your own words, typed in the {langLabel} layout.</p>
                                    </div>
                                )}
                            </div>

                            {startError ? (
                                <p className="mb-3 w-full rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs leading-relaxed text-destructive">
                                    {startError}
                                </p>
                            ) : null}

                            <button
                                type="button"
                                onClick={start}
                                disabled={textEmpty || textBlocked}
                                className={cn(
                                    'hover:bg-primary-hover active:bg-primary-active flex w-full items-center justify-center gap-2.5 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-(--shadow-2) transition-[background-color,transform,box-shadow] duration-150 ease-out active:scale-[0.985] disabled:pointer-events-none disabled:opacity-45 disabled:shadow-none',
                                )}
                            >
                                <Play className="size-4" />
                                {textEmpty ? 'Paste your text to begin' : textBlocked ? 'Fix unsupported characters' : 'Start typing'}
                            </button>
                        </section>

                        <section className={cn(cardClass, 'order-2 p-5 sm:p-6 lg:order-1')}>
                            <div>
                                <h2 className={eyebrowClass}>Pace</h2>
                                <div className="mt-2.5 flex flex-wrap gap-1 rounded-lg border border-line bg-muted/70 p-1">
                                    {MODES.map(({ key, label, icon: Icon }) => (
                                        <Segment
                                            key={key}
                                            label={
                                                <>
                                                    <Icon className="size-3.5" />
                                                    {label}
                                                </>
                                            }
                                            active={unit === key}
                                            onClick={() => updateUnit(key)}
                                        />
                                    ))}
                                </div>

                                <div className="mt-4">
                                    {unit === 'time' ? (
                                        <OptionPills options={TIME_OPTIONS} value={time} onChange={updateTime} format={(v) => `${v}s`} />
                                    ) : unit === 'words' ? (
                                        <OptionPills options={WORD_OPTIONS} value={words} onChange={updateWords} />
                                    ) : unit === 'quote' ? (
                                        <p className="text-sm leading-relaxed text-ink-faint">
                                            A short quotation in your chosen language — type it through, then get another.
                                        </p>
                                    ) : (
                                        <>
                                            <textarea
                                                value={text}
                                                onChange={(e) => {
                                                    setText(e.target.value)
                                                    setStartError(null)
                                                }}
                                                placeholder="Type or paste your text here…"
                                                rows={3}
                                                className={cn(
                                                    'w-full resize-none rounded-xl border bg-muted/40 px-3 py-2.5 text-sm text-foreground placeholder:text-ink-faint focus:ring-1 focus:outline-none',
                                                    badChars.length > 0
                                                        ? 'border-warning/60 focus:border-warning focus:ring-warning'
                                                        : 'border-line focus:border-accent focus:ring-accent',
                                                )}
                                            />
                                            {badChars.length > 0 ? (
                                                <p className="mt-2.5 flex flex-wrap items-start gap-x-1.5 gap-y-1 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-xs leading-relaxed text-warning">
                                                    <span>Characters below aren't typed on the {langLabel} layout:</span>
                                                    <span className="font-mono font-medium">{Array.from(new Set(badChars)).join(' ')}</span>
                                                </p>
                                            ) : null}
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="scale-rule my-6" aria-hidden />

                            <div>
                                <h2 className={eyebrowClass}>Language</h2>
                                <div className="mt-2.5 flex flex-wrap gap-1 rounded-lg border border-line bg-muted/70 p-1 sm:flex-nowrap">
                                    <Segment label="English" active={langValue === 'english'} onClick={() => updateLang('english')} />
                                    <Segment
                                        label={<span className="font-myanmar">မြန်မာ</span>}
                                        active={langValue === 'myanmar'}
                                        onClick={() => updateLang('myanmar')}
                                    />
                                </div>
                            </div>

                            {unit === 'time' || unit === 'words' ? (
                                <>
                                    <div className="scale-rule my-6" aria-hidden />
                                    <div>
                                        <h2 className={eyebrowClass}>Add-ons</h2>
                                        <div className="mt-2.5 flex flex-wrap gap-2">
                                            <AddonPill label="Punctuation" checked={punctuationValue} onChange={updatePunctuation} />
                                            <AddonPill label="Numbers" checked={numbersValue} onChange={updateNumbers} />
                                        </div>
                                        <p className="mt-3 text-xs leading-relaxed text-ink-faint">
                                            Sentence stops and capitals in English, or {`\u104B \u104A`} in Myanmar — and numbers mixed in as digits.
                                        </p>
                                    </div>
                                </>
                            ) : null}
                        </section>
                    </motion.div>
                </div>
            </main>
        </div>
    )
}

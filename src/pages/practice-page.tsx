import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useTypingStore } from '@/stores/typing-store'
import { useSettingsStore } from '@/stores/settings-store'
import { Session } from '@/components/session/session-workspace'
import type { PracticeUnit } from '@/core/materials/practice-material'
import { resolvedPracticePreferences } from '@/core/practice/preferences'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Timer, Hash, Type, RotateCcw, Quote } from 'lucide-react'

const TIME_OPTIONS = [15, 30, 60, 120]
const WORD_OPTIONS = [10, 25, 50, 100]

function ChipGroup<T extends string | number>({
    options,
    value,
    onChange,
    format,
}: {
    options: T[]
    value: T
    onChange: (v: T) => void
    format?: (v: T) => string
}) {
    return (
        <div className="flex gap-1">
            {options.map((opt) => (
                <button
                    key={String(opt)}
                    onClick={() => onChange(opt)}
                    className={cn(
                        'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                        opt === value ? 'text-accent-foreground bg-accent shadow-sm' : 'bg-muted text-muted-foreground hover:bg-muted/80',
                    )}
                >
                    {format?.(opt) ?? String(opt)}
                </button>
            ))}
        </div>
    )
}

function ToggleChip({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            onClick={() => onChange(!checked)}
            aria-pressed={checked}
            className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                checked ? 'text-accent-foreground bg-accent shadow-sm' : 'bg-muted text-muted-foreground hover:bg-muted/80',
            )}
        >
            <span
                className={cn('relative h-3.5 w-6 rounded-full transition-colors', checked ? 'bg-accent-foreground/30' : 'bg-line-strong/60')}
                aria-hidden
            >
                <span
                    className={cn(
                        'absolute top-0.5 size-2.5 rounded-full transition-transform',
                        checked ? 'bg-accent-foreground translate-x-3' : 'translate-x-0.5 bg-muted-foreground/70',
                    )}
                />
            </span>
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
    const navigate = useNavigate()
    const session = useTypingStore((s) => s.session)
    const beginPractice = useTypingStore((s) => s.beginPractice)
    const inSession = session?.kind === 'practice'

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

    const start = useCallback(() => {
        void beginPractice({
            language: prefs.lang,
            unit: prefs.unit,
            time: prefs.time,
            words: prefs.words,
            text,
            punctuation: prefs.punctuation,
            numbers: prefs.numbers,
        })
    }, [beginPractice, prefs, text])

    const sourceName = unit === 'time' ? `${time}s practice` : unit === 'words' ? `${words} words` : unit === 'quote' ? 'Quote' : 'Custom text'

    if (inSession) {
        return (
            <Session
                durationSeconds={unit === 'time' ? time : null}
                sourceName={sourceName}
                eyebrow="Quick practice"
                onExit={() => navigate('/practice')}
            />
        )
    }

    return (
        <>
            <header className="flex shrink-0 items-center border-b border-line bg-background/60 px-4 py-2.5 backdrop-blur-xl sm:px-6">
                <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2 shrink-0" aria-label="Go back to the previous page">
                    <ArrowLeft className="size-4" />
                    <span>Back</span>
                </Button>
            </header>

            <div className="mx-auto flex h-full min-h-0 w-full max-w-2xl flex-col items-center px-5 py-10 sm:px-8">
                <div className="mb-8 text-center">
                    <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Quick practice</h1>
                    <p className="mt-2 text-sm text-muted-foreground">Set your pace, start instantly — no student profile needed.</p>
                </div>

                <div className="flex w-full flex-col gap-6 rounded-2xl border border-line bg-card/60 p-6 shadow-sm backdrop-blur">
                    <div>
                        <p className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">Language</p>
                        <div className="flex gap-1">
                            <button
                                onClick={() => updateLang('english')}
                                className={cn(
                                    'rounded-md px-4 py-2 text-sm font-medium transition-colors',
                                    langValue === 'english'
                                        ? 'text-accent-foreground bg-accent shadow-sm'
                                        : 'bg-muted text-muted-foreground hover:bg-muted/80',
                                )}
                            >
                                English
                            </button>
                            <button
                                onClick={() => updateLang('myanmar')}
                                className={cn(
                                    'rounded-md px-4 py-2 text-sm font-medium transition-colors',
                                    langValue === 'myanmar'
                                        ? 'text-accent-foreground bg-accent shadow-sm'
                                        : 'bg-muted text-muted-foreground hover:bg-muted/80',
                                )}
                            >
                                မြန်မာ
                            </button>
                        </div>
                    </div>

                    <div>
                        <p className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">Mode</p>
                        <div className="flex gap-1">
                            {(
                                [
                                    { key: 'time' as const, label: 'Time', icon: Timer },
                                    { key: 'words' as const, label: 'Words', icon: Hash },
                                    { key: 'quote' as const, label: 'Quote', icon: Quote },
                                    { key: 'text' as const, label: 'Text', icon: Type },
                                ] as const
                            ).map(({ key, label, icon: Icon }) => (
                                <button
                                    key={key}
                                    onClick={() => updateUnit(key)}
                                    className={cn(
                                        'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                                        unit === key
                                            ? 'text-accent-foreground bg-accent shadow-sm'
                                            : 'bg-muted text-muted-foreground hover:bg-muted/80',
                                    )}
                                >
                                    <Icon className="size-3.5" />
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <p className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                            {unit === 'time' ? 'Duration' : unit === 'words' ? 'Word count' : unit === 'quote' ? 'Quotation' : 'Text'}
                        </p>
                        {unit === 'time' ? (
                            <ChipGroup options={TIME_OPTIONS} value={time} onChange={updateTime} format={(v) => `${v}s`} />
                        ) : unit === 'words' ? (
                            <ChipGroup options={WORD_OPTIONS} value={words} onChange={updateWords} />
                        ) : unit === 'quote' ? (
                            <p className="text-sm text-muted-foreground">
                                A short quotation in your chosen language — type it through, then get another one.
                            </p>
                        ) : (
                            <textarea
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                placeholder="Type or paste your text here…"
                                rows={3}
                                className="w-full rounded-lg border border-line bg-muted/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
                            />
                        )}
                    </div>

                    {unit === 'time' || unit === 'words' ? (
                        <div className="flex flex-wrap items-center gap-3">
                            <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Add-ons</p>
                            <div className="flex gap-1">
                                <ToggleChip label="Punctuation" checked={punctuationValue} onChange={updatePunctuation} />
                                <ToggleChip label="Numbers" checked={numbersValue} onChange={updateNumbers} />
                            </div>
                            <p className="w-full text-xs text-muted-foreground/80">
                                English gets .,!?;: and capitalised sentence starts; Myanmar gets ၊ ။ and Myanmar numerals.
                            </p>
                        </div>
                    ) : null}
                </div>

                <button
                    onClick={start}
                    className="text-accent-foreground mt-8 flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-semibold shadow-sm transition-colors hover:bg-accent/90 active:bg-accent/80"
                >
                    <RotateCcw className="size-4" />
                    Start
                </button>
            </div>
        </>
    )
}

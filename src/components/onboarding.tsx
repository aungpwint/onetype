import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Sparkles } from 'lucide-react'
import { useStudentStore } from '@/stores/student-store'
import { useSettingsStore } from '@/stores/settings-store'
import { useUiStore } from '@/stores/ui-store'
import { cn, eyebrowClass } from '@/lib/utils'
import { Atmosphere, Field, SelectField } from './ui'
import { Input } from './ui/input'
import { Button } from './ui/button'

export function Onboarding() {
    const navigate = useNavigate()
    const create = useStudentStore((s) => s.create)
    const select = useStudentStore((s) => s.select)
    const students = useStudentStore((s) => s.students)
    const setSetting = useSettingsStore((s) => s.set)
    const theme = useUiStore((s) => s.theme)
    const setTheme = useUiStore((s) => s.setTheme)

    const [name, setName] = useState('')
    const [displayName, setDisplayName] = useState('')
    const [defaultLang, setDefaultLang] = useState<'myanmar' | 'english'>('myanmar')
    const [busy, setBusy] = useState(false)
    const [message, setMessage] = useState('')

    const begin = async () => {
        if (!name.trim()) {
            setMessage('Give the learner a name to open the desk.')
            return
        }
        setBusy(true)
        try {
            if (students.length === 0) {
                const created = await create({ name: name.trim(), displayName: displayName.trim() || null })
                await select(created.id)
            }
            await setSetting('app.language', defaultLang)
            await setSetting('design.theme', theme)
            navigate('/', { replace: true })
        } catch {
            setMessage('Something went wrong opening the desk. Try again.')
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-bg p-6">
            {/* Themed ambient backdrop: everything pulls from the active palette
                so it reads native under every premium preset, dark and light. */}
            <div aria-hidden className="pointer-events-none absolute inset-0 -z-20">
                <div className="absolute top-[-22%] left-1/2 h-184 w-184 -translate-x-1/2 rounded-full bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] blur-[150px]" />
                <div className="absolute bottom-[-26%] left-[-12%] h-152 w-152 rounded-full bg-[color-mix(in_srgb,var(--typing-correct)_7%,transparent)] blur-[130px]" />
                <div className="absolute inset-0 bg-linear-to-br from-[color-mix(in_srgb,var(--primary)_5%,transparent)] via-transparent to-transparent" />
            </div>
            <Atmosphere className="-z-10" />

            <div className="relative z-10 w-full max-w-xl">
                <div className="relative overflow-hidden rounded-2xl border border-line bg-card/75 shadow-xl backdrop-blur-2xl">
                    <span
                        aria-hidden
                        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-[color-mix(in_srgb,var(--ink)_22%,transparent)] to-transparent"
                    />

                    <div className="relative border-b border-line bg-linear-to-b from-surface-elevated/80 to-transparent px-8 py-7 sm:px-9">
                        <div className="flex items-center justify-between gap-3">
                            <p className={eyebrowClass}>Desk № 1 · First lesson</p>
                            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-accent/25 bg-accent/10 text-accent shadow-sm">
                                <Sparkles className="size-3" />
                            </span>
                        </div>
                        <h1 className="mt-3 font-display text-3xl font-semibold tracking-[-0.02em]">
                            OneType <span className="font-myanmar text-2xl font-normal text-muted-foreground">ဝမ်းတိုက်</span>
                        </h1>
                        <p className="mt-2.5 max-w-md text-sm leading-relaxed text-muted-foreground">
                            Learn to touch-type English and Myanmar without looking at your hands. Your progress lives on this machine — nothing
                            leaves it.
                        </p>
                    </div>

                    <div className="relative space-y-5 px-8 py-7 sm:px-9">
                        <Field label="Learner's full name" hint="Goes on the teacher's roll.">
                            <Input value={name} onChange={(e) => setName(e.currentTarget.value)} placeholder="e.g. Aung Aung" autoFocus />
                        </Field>
                        <Field label="Display name" hint="Optional nickname.">
                            <Input value={displayName} onChange={(e) => setDisplayName(e.currentTarget.value)} placeholder="Aung" />
                        </Field>
                        <Field label="Start language">
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setDefaultLang('myanmar')}
                                    aria-pressed={defaultLang === 'myanmar'}
                                    className={cn(
                                        'relative rounded-2xl border p-4 pr-9 text-left transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                                        defaultLang === 'myanmar'
                                            ? 'border-accent/40 bg-accent/5 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--primary)_14%,transparent)]'
                                            : 'border-line bg-card/40 hover:border-line-strong hover:bg-muted/40',
                                    )}
                                >
                                    <span
                                        className={cn(
                                            'font-myanmar text-2xl leading-none',
                                            defaultLang === 'myanmar' ? 'text-foreground' : 'text-muted-foreground',
                                        )}
                                    >
                                        မြန်မာ
                                    </span>
                                    <span className="mt-1.5 block text-xs text-muted-foreground">Pyidaungsu layout</span>
                                    {defaultLang === 'myanmar' ? (
                                        <span className="absolute top-2.5 right-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-accent-ink shadow-sm">
                                            <Check className="size-3" strokeWidth={3} />
                                        </span>
                                    ) : null}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDefaultLang('english')}
                                    aria-pressed={defaultLang === 'english'}
                                    className={cn(
                                        'relative rounded-2xl border p-4 pr-9 text-left transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                                        defaultLang === 'english'
                                            ? 'border-accent/40 bg-accent/5 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--primary)_14%,transparent)]'
                                            : 'border-line bg-card/40 hover:border-line-strong hover:bg-muted/40',
                                    )}
                                >
                                    <span
                                        className={cn(
                                            'text-2xl leading-none font-semibold',
                                            defaultLang === 'english' ? 'text-foreground' : 'text-muted-foreground',
                                        )}
                                    >
                                        Aa
                                    </span>
                                    <span className="mt-1.5 block text-xs text-muted-foreground">QWERTY layout</span>
                                    {defaultLang === 'english' ? (
                                        <span className="absolute top-2.5 right-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-accent-ink shadow-sm">
                                            <Check className="size-3" strokeWidth={3} />
                                        </span>
                                    ) : null}
                                </button>
                            </div>
                        </Field>
                        <Field label="Appearance">
                            <SelectField
                                className="w-full sm:max-w-xs"
                                value={theme}
                                onChange={(e) => setTheme(e.currentTarget.value as typeof theme)}
                            >
                                <option value="system">Follow system</option>
                                <option value="light">Light desk</option>
                                <option value="dark">Night desk</option>
                            </SelectField>
                        </Field>
                        {message ? <p className="text-sm text-destructive">{message}</p> : null}
                        <Button
                            variant="brass"
                            size="lg"
                            className="w-full shadow-[0_10px_24px_-8px_color-mix(in_srgb,var(--primary)_55%,transparent)]"
                            disabled={busy}
                            onClick={begin}
                        >
                            {busy ? 'Opening the desk…' : 'Open the desk'}
                        </Button>
                    </div>
                </div>

                <p className="mt-5 text-center text-xs text-muted-foreground">Every key you press here stays on this device. No account, no cloud.</p>
            </div>
        </div>
    )
}

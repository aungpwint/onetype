import { useState } from 'react'
import {
    Palette,
    Keyboard,
    Bell,
    Database,
    DownloadCloud,
    UploadCloud,
    RefreshCw,
    Download,
    HardDrive,
    Volume2,
    Paintbrush,
    Hand,
    LogOut,
    Focus,
    Eye,
    Timer,
} from 'lucide-react'
import * as backend from '@/services/backend'
import { useUiStore, previewThemePreset, applyCurrentTheme } from '@/stores/ui-store'
import { useSettingsStore } from '@/stores/settings-store'
import { useStudentStore } from '@/stores/student-store'
import { useUpdater } from '@/services/updater/use-updater'
import type { ThemePreference } from '@/types'
import { THEMES, DEFAULT_THEME_PRESET_ID } from '@/core/themes/registry'
import { Field, Modal, PageHeader, AsyncButton } from '@/components/ui'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { cn, cardClass, appPageClass, sectionTitleClass } from '@/lib/utils'

export default function SettingsPage() {
    const theme = useUiStore((s) => s.theme)
    const setTheme = useUiStore((s) => s.setTheme)
    const themePreset = useUiStore((s) => s.themePreset)
    const setThemePreset = useUiStore((s) => s.setThemePreset)
    const sound = useUiStore((s) => s.soundEnabled)
    const setSound = useUiStore((s) => s.setSoundEnabled)
    const handGuide = useUiStore((s) => s.handGuideVisible)
    const toggleHandGuide = useUiStore((s) => s.toggleHandGuide)
    const focusMode = useUiStore((s) => s.focusMode)
    const setFocusMode = useUiStore((s) => s.setFocusMode)

    const settings = useSettingsStore()
    const active = useStudentStore((s) => s.active)
    const updater = useUpdater()

    const defaultLang = settings.get('app.language')
    const confirmExit = settings.get('practice.confirmExit')
    const focusGuard = settings.get('practice.focusGuard')
    const indicateTypos = settings.get('practice.indicateTypos')
    const quickRestart = settings.get('practice.quickRestart')
    const soundVolume = settings.get('practice.soundVolume')
    const timeWarning = settings.get('practice.timeWarning')
    const highlightMode = settings.get('practice.highlightMode')
    const blindMode = settings.get('practice.blindMode')
    const hideExtraLetters = settings.get('practice.hideExtraLetters')
    const caretStyle = settings.get('practice.caretStyle')
    const smoothCaret = settings.get('practice.smoothCaret')
    const paceCaret = settings.get('practice.paceCaret')
    const timerStyle = settings.get('practice.timerStyle')
    const notificationsEnabled = settings.get('notification.enabled')
    const notifyUpdates = settings.get('notification.notifyUpdates')
    const themeEffect = settings.get('design.themeEffect')

    const [report, setReport] = useState<{ kind: 'export' | 'import'; message: string } | null>(null)
    const [busy, setBusy] = useState<string | null>(null)

    const doExport = async (scope: 'all' | 'one') => {
        setBusy(`Export ${scope}…`)
        try {
            const result = await backend.exportBackup(scope === 'all' ? null : (active?.id ?? null))
            if (result) setReport({ kind: 'export', message: `Saved backup to ${result.path}` })
            else setReport({ kind: 'export', message: 'Export cancelled.' })
        } catch (error) {
            setReport({ kind: 'export', message: `Export failed: ${error instanceof Error ? error.message : error}` })
        } finally {
            setBusy(null)
        }
    }

    const doImport = async () => {
        setBusy('Import…')
        try {
            const result = await backend.importBackup()
            if (result) {
                setReport({
                    kind: 'import',
                    message: `Imported ${result.importedStudents} learner(s).${result.skippedStudents.length ? ` Skipped: ${result.skippedStudents.join(', ')}` : ''}`,
                })
                await useStudentStore.getState().load()
            } else {
                setReport({ kind: 'import', message: 'Import cancelled.' })
            }
        } catch (error) {
            setReport({ kind: 'import', message: `Import failed: ${error instanceof Error ? error.message : error}` })
        } finally {
            setBusy(null)
        }
    }

    const doHealthCheck = async () => {
        setBusy('Check…')
        try {
            const message = await backend.checkDatabaseIntegrity()
            setReport({ kind: 'import', message })
        } catch (error) {
            setReport({ kind: 'import', message: `Health check failed: ${error instanceof Error ? error.message : error}` })
        } finally {
            setBusy(null)
        }
    }

    return (
        <div className={appPageClass}>
            <PageHeader eyebrow="Preferences" title="Settings" subtitle="These are stored on this machine only. Nothing here is sent anywhere." />

            <Section icon={<Palette className="size-4" />} title="Appearance">
                <div className="mt-4 flex flex-wrap items-end gap-4">
                    <Field label="Theme">
                        <div className="relative">
                            <select
                                className="flex h-9 w-44 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                                value={theme}
                                onChange={(e) => setTheme(e.currentTarget.value as ThemePreference)}
                            >
                                <option value="system">Follow system</option>
                                <option value="light">Light desk</option>
                                <option value="dark">Night desk</option>
                            </select>
                        </div>
                    </Field>
                    <Field label="Default language">
                        <div className="relative">
                            <select
                                className="flex h-9 w-44 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                                value={defaultLang}
                                onChange={(e) => void settings.set('app.language', e.currentTarget.value)}
                            >
                                <option value="myanmar">Myanmar (မြန်မာ)</option>
                                <option value="english">English</option>
                            </select>
                        </div>
                    </Field>
                </div>

                <Field label="Desk palette" hint="A curated desk to write on. Live preview as you hover." className="mt-5">
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            title="The default OneType desk"
                            onClick={() => setThemePreset(DEFAULT_THEME_PRESET_ID)}
                            className={cn(
                                'flex h-11 w-20 flex-col items-center justify-center gap-1.5 rounded-lg border bg-background transition-colors',
                                themePreset === DEFAULT_THEME_PRESET_ID
                                    ? 'border-accent ring-2 ring-ring/30'
                                    : 'border-border hover:border-accent/60',
                            )}
                        >
                            <span className="flex h-4 w-10 overflow-hidden rounded-sm border border-border">
                                <span className="bg-bg" style={{ width: '50%' }} />
                                <span className="bg-ink" style={{ width: '50%' }} />
                            </span>
                            <span className="text-[10px] font-medium text-muted-foreground">Default</span>
                        </button>
                        {THEMES.map((preset) => {
                            const swatch = preset.light
                            return (
                                <button
                                    key={preset.id}
                                    type="button"
                                    title={`${preset.name} — ${preset.description}`}
                                    onClick={() => setThemePreset(preset.id)}
                                    onPointerEnter={() => previewThemePreset(preset.id)}
                                    onPointerLeave={() => applyCurrentTheme()}
                                    className={cn(
                                        'flex h-11 w-20 flex-col items-center justify-center gap-1.5 rounded-lg border transition-colors',
                                        themePreset === preset.id
                                            ? 'border-accent ring-2 ring-ring/30'
                                            : 'border-border hover:border-accent/60',
                                    )}
                                    style={{ background: swatch.bg }}
                                >
                                    <span className="flex h-4 w-10 overflow-hidden rounded-sm border border-[var(--line-strong)]">
                                        <span style={{ background: swatch.bg, width: '40%' }} />
                                        <span style={{ background: swatch.ink, width: '40%' }} />
                                        <span style={{ background: swatch.primary, width: '20%' }} />
                                    </span>
                                    <span className="text-[10px] font-medium" style={{ color: swatch.inkSoft }}>
                                        {preset.name}
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                </Field>

                <Field label="Background effect" className="mt-4">
                    <div className="relative">
                        <select
                            className="flex h-9 w-44 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                            value={themeEffect}
                            onChange={(e) => void settings.set('design.themeEffect', e.currentTarget.value)}
                        >
                            <option value="none">None</option>
                            <option value="aurora">Aurora</option>
                            <option value="dots">Point grid</option>
                        </select>
                    </div>
                </Field>
            </Section>

            <Section icon={<Palette className="size-4" />} title="Typing experience">
                <div className="mt-4 space-y-3">
                    <SettingRow
                        title="Time warning sound"
                        description="A soft chime when a timed test is almost over."
                        checked={timeWarning !== 'off'}
                        onChecked={(v) => void settings.set('practice.timeWarning', v ? 'on' : 'off')}
                        icon={Bell}
                    />
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <Field label="Quick restart key">
                        <div className="relative">
                            <select
                                className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                                value={quickRestart}
                                onChange={(e) => void settings.set('practice.quickRestart', e.currentTarget.value)}
                            >
                                <option value="tab">Tab</option>
                                <option value="enter">Enter</option>
                                <option value="off">Off</option>
                            </select>
                        </div>
                    </Field>
                    <Field label="Sound volume">
                        <div className="relative">
                            <input
                                type="range"
                                min={0}
                                max={1}
                                step={0.05}
                                className="w-full accent-[--accent]"
                                value={soundVolume ?? '0.5'}
                                onChange={(e) => void settings.set('practice.soundVolume', e.currentTarget.value)}
                                aria-label="Sound volume"
                            />
                        </div>
                    </Field>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <Field label="Highlight">
                        <div className="relative">
                            <select
                                className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                                value={highlightMode}
                                onChange={(e) => void settings.set('practice.highlightMode', e.currentTarget.value)}
                            >
                                <option value="word">Word</option>
                                <option value="letter">Letter</option>
                                <option value="none">Off</option>
                            </select>
                        </div>
                    </Field>
                    <Field label="Blind mode">
                        <div className="relative">
                            <select
                                className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                                value={blindMode}
                                onChange={(e) => void settings.set('practice.blindMode', e.currentTarget.value)}
                            >
                                <option value="off">Off</option>
                                <option value="on">Hide upcoming</option>
                            </select>
                        </div>
                    </Field>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <Field label="Caret style">
                        <div className="relative">
                            <select
                                className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                                value={caretStyle}
                                onChange={(e) => void settings.set('practice.caretStyle', e.currentTarget.value)}
                            >
                                <option value="bar">Bar</option>
                                <option value="block">Block</option>
                                <option value="line">Line</option>
                                <option value="underline">Underline</option>
                            </select>
                        </div>
                    </Field>
                    <Field label="Smooth caret">
                        <div className="relative">
                            <select
                                className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                                value={smoothCaret}
                                onChange={(e) => void settings.set('practice.smoothCaret', e.currentTarget.value)}
                            >
                                <option value="off">Instant</option>
                                <option value="slow">Slow</option>
                                <option value="medium">Medium</option>
                                <option value="fast">Fast</option>
                            </select>
                        </div>
                    </Field>
                </div>

                <div className="mt-4 space-y-3">
                    <SettingRow
                        title="Pace caret"
                        description="A second caret trails your typing pace (needs a timed test)."
                        checked={paceCaret !== 'off'}
                        onChecked={(v) => void settings.set('practice.paceCaret', v ? 'on' : 'off')}
                        icon={Timer}
                    />
                    <SettingRow
                        title="Hide extra letters"
                        description="Only show the current word as you type it."
                        checked={hideExtraLetters !== 'off'}
                        onChecked={(v) => void settings.set('practice.hideExtraLetters', v ? 'on' : 'off')}
                        icon={Eye}
                    />
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <Field label="Timer style">
                        <div className="relative">
                            <select
                                className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                                value={timerStyle}
                                onChange={(e) => void settings.set('practice.timerStyle', e.currentTarget.value)}
                            >
                                <option value="text">Text</option>
                                <option value="bar">Progress bar</option>
                                <option value="mini">Mini</option>
                                <option value="off">Hidden</option>
                            </select>
                        </div>
                    </Field>
                </div>
            </Section>

            <Section icon={<Keyboard className="size-4" />} title="Practice">
                <div className="mt-4 space-y-3">
                    <SettingRow
                        title="Key click sounds"
                        description="A short high note on correct, low on error."
                        checked={sound}
                        onChecked={(v) => setSound(v)}
                        icon={Volume2}
                    />
                    <SettingRow
                        title="Hand guide"
                        description="Show which finger to use next."
                        checked={handGuide}
                        onChecked={toggleHandGuide}
                        icon={Hand}
                    />
                    <SettingRow
                        title="Focus mode"
                        description="Hide the header while typing and keep only the text in view."
                        checked={focusMode}
                        onChecked={setFocusMode}
                        icon={Focus}
                    />
                    <SettingRow
                        title="Confirm before abandoning a round"
                        description="Prevents tapping Exit and losing a finished attempt."
                        checked={confirmExit !== 'off'}
                        onChecked={(v) => void settings.set('practice.confirmExit', v ? 'on' : 'off')}
                        icon={LogOut}
                    />
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <Field label="Pause when you leave the window">
                        <div className="relative">
                            <select
                                className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                                value={focusGuard}
                                onChange={(e) => void settings.set('practice.focusGuard', e.currentTarget.value)}
                            >
                                <option value="pause">Pause (recommended)</option>
                                <option value="soft">Keep timing</option>
                                <option value="off">Off</option>
                            </select>
                        </div>
                    </Field>
                    <Field label="How mistakes are shown">
                        <div className="relative">
                            <select
                                className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                                value={indicateTypos}
                                onChange={(e) => void settings.set('practice.indicateTypos', e.currentTarget.value)}
                            >
                                <option value="below">Underline</option>
                                <option value="replace">Replace</option>
                            </select>
                        </div>
                    </Field>
                </div>
            </Section>

            <Section icon={<Paintbrush className="size-4" />} title="Keyboard shortcuts">
                <p className="mt-1 text-sm text-muted-foreground">
                    Navigate the app without the mouse. During a round, plain keys are reserved for typing.
                </p>
                <dl className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
                    {[
                        ['Ctrl / Cmd + 1…5', 'Dashboard, Learn, Tests, Progress, Settings'],
                        ['Ctrl / Cmd + ,', 'Settings'],
                        ['Ctrl / Cmd + Shift + T', 'Timed tests'],
                        ['Ctrl / Cmd + Shift + L', 'Learn'],
                        ['Esc', 'Pause / resume a round'],
                        ['R', 'Restart round (ready or paused)'],
                    ].map(([keys, desc]) => (
                        <div key={keys} className="flex items-start justify-between gap-3">
                            <span className="shrink-0 font-mono text-xs text-muted-foreground">{keys}</span>
                            <span className="text-muted-foreground">{desc}</span>
                        </div>
                    ))}
                </dl>
            </Section>

            <Section icon={<Bell className="size-4" />} title="Notifications">
                <div className="mt-4 space-y-3">
                    <SettingRow
                        title="Enable notifications"
                        description="Allow OneType to send native OS notifications."
                        checked={notificationsEnabled !== 'off'}
                        onChecked={(v) => void settings.set('notification.enabled', v ? 'on' : 'off')}
                        icon={Bell}
                    />
                    <SettingRow
                        title="Notify about application updates"
                        description="Show a notification when a new version is available."
                        checked={notifyUpdates !== 'off'}
                        onChecked={(v) => void settings.set('notification.notifyUpdates', v ? 'on' : 'off')}
                        icon={Download}
                    />
                </div>
            </Section>

            <Section icon={<DownloadCloud className="size-4" />} title="Updates">
                <div className="mt-4 space-y-3">
                    <SettingRow
                        title="Check for updates automatically"
                        description="OneType will check every 6 hours. You can also check manually below."
                        checked={updater.autoUpdate !== 'off'}
                        onChecked={(v) => void settings.set('app.autoUpdate', v ? 'on' : 'off')}
                        icon={DownloadCloud}
                    />
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                    <AsyncButton
                        disabled={updater.status.state === 'checking'}
                        loading={updater.status.state === 'checking'}
                        loadingLabel="Checking…"
                        onClick={updater.check}
                    >
                        {updater.status.state === 'available'
                            ? `Update available (v${updater.status.version})`
                            : updater.status.state === 'downloaded'
                              ? 'Update ready to install'
                              : 'Check for updates'}
                    </AsyncButton>
                    {updater.status.state === 'available' && (
                        <Button variant="brass" onClick={updater.downloadAndInstall}>
                            <Download className="size-4" />
                            Download &amp; install
                        </Button>
                    )}
                    {updater.status.state === 'downloaded' && (
                        <Button onClick={updater.install}>
                            <RefreshCw className="size-4" />
                            Restart now
                        </Button>
                    )}
                    {updater.status.state === 'error' && <span className="text-xs text-destructive">{updater.status.message}</span>}
                </div>
            </Section>

            <Section icon={<Database className="size-4" />} title="Data">
                <p className="mt-1 text-sm text-muted-foreground">
                    Everything lives in an on-device database. Back it up or move it between machines by exporting.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                    <AsyncButton disabled={busy !== null} loading={busy === 'Export all…'} icon={DownloadCloud} onClick={() => void doExport('all')}>
                        Back up everything
                    </AsyncButton>
                    <AsyncButton
                        variant="outline"
                        disabled={busy !== null || !active}
                        loading={busy === 'Export one…'}
                        icon={HardDrive}
                        onClick={() => void doExport('one')}
                    >
                        Back up {active ? active.displayName : 'a learner'}
                    </AsyncButton>
                    <AsyncButton
                        variant="brass"
                        disabled={busy !== null}
                        loading={busy === 'Import…'}
                        icon={UploadCloud}
                        onClick={() => void doImport()}
                    >
                        Import from backup
                    </AsyncButton>
                    <AsyncButton
                        variant="outline"
                        disabled={busy !== null}
                        loading={busy === 'Check…'}
                        loadingLabel="Checking…"
                        icon={RefreshCw}
                        onClick={doHealthCheck}
                    >
                        Check database health
                    </AsyncButton>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                    In the browser/dev preview, export downloads a JSON file and import reads one back.
                </p>
            </Section>

            <Modal open={report !== null} onClose={() => setReport(null)} ariaLabel="Report">
                <h2 className="font-display text-lg capitalize">{report?.kind}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{report?.message}</p>
                <div className="mt-5 flex justify-end">
                    <Button onClick={() => setReport(null)}>Done</Button>
                </div>
            </Modal>
        </div>
    )
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
    return (
        <section className={cn(cardClass, 'p-5')}>
            <h2 className={cn(sectionTitleClass, 'flex items-center gap-2')}>
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-accent">{icon}</span>
                {title}
            </h2>
            {children}
        </section>
    )
}

function SettingRow({
    title,
    description,
    checked,
    onChecked,
    icon: Icon,
}: {
    title: string
    description: string
    checked: boolean
    onChecked: (v: boolean) => void
    icon: React.ComponentType<{ className?: string }>
}) {
    return (
        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-border px-4 py-3 transition-colors hover:bg-muted/40">
            <span className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Icon className="size-4" />
                </span>
                <span>
                    <span className="block text-sm font-medium">{title}</span>
                    <span className="block text-xs text-muted-foreground">{description}</span>
                </span>
            </span>
            <Switch checked={checked} onCheckedChange={onChecked} />
        </label>
    )
}

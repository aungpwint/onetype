import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, CornerDownLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useUiStore } from '@/stores/ui-store'
import { createCommands } from '@/commands/palette-commands'
import {
    COMMAND_GROUPS,
    filterCommands,
    moveSelection,
    type Command,
    type CommandContext,
} from '@/commands/registry'
import { cn, eyebrowClass } from '@/lib/utils'

export function CommandPalette({ openAddStudent, openLearnerPicker }: { openAddStudent: () => void; openLearnerPicker: () => void }) {
    const open = useUiStore((s) => s.commandPaletteOpen)
    const close = useUiStore((s) => s.setCommandPaletteOpen)
    const navigate = useNavigate()

    const context = useMemo<CommandContext>(
        () => ({
            navigate,
            openAddStudent,
            openLearnerPicker,
            toggleSidebar: () => useUiStore.getState().toggleSidebar(),
        }),
        [navigate, openAddStudent, openLearnerPicker],
    )

    return (
        <AnimatePresence>
            {open ? (
                <PalettePanel key="palette" context={context} close={close} />
            ) : null}
        </AnimatePresence>
    )
}

const GROUP_LABEL: Record<Command['group'], string> = {
    Navigate: 'Go to',
    Manage: 'Manage',
    Round: 'Round',
}

function PalettePanel({ context, close }: { context: CommandContext; close: (open: false) => void }) {
    const [query, setQuery] = useState('')
    const [browseIndex, setBrowseIndex] = useState(0)

    const commands = useMemo(() => createCommands(context), [context])

    const filtered = useMemo(() => filterCommands(commands, query), [commands, query])
    const selectable = useMemo(
        () => filtered.map((command, index) => ({ command, index })).filter((entry) => !entry.command.disabled()),
        [filtered],
    )

    const activeItem = selectable.length > 0 ? selectable[Math.min(browseIndex, selectable.length - 1)] : null

    const run = (command: Command) => {
        close(false)
        command.run(context)
    }

    const onKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === 'ArrowDown') {
            event.preventDefault()
            setBrowseIndex((i) => moveSelection(i, 1, selectable.length))
            return
        }
        if (event.key === 'ArrowUp') {
            event.preventDefault()
            setBrowseIndex((i) => moveSelection(i, -1, selectable.length))
            return
        }
        if (event.key === 'Enter' && activeItem) {
            event.preventDefault()
            run(activeItem.command)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[16vh]" role="dialog" aria-modal="true" aria-label="Command palette">
            <motion.button
                aria-label="Close command palette"
                className="absolute inset-0 bg-black/45 backdrop-blur-sm"
                onClick={() => close(false)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
            />
            <motion.div
                className="relative flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-(--shadow-3)"
                initial={{ opacity: 0, y: -10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.985 }}
                transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            >
                <div className="flex items-center gap-2.5 border-b border-line px-3.5 py-3">
                    <Search className="size-4 shrink-0 text-muted-foreground" />
                    <input
                        autoFocus
                        value={query}
                        onChange={(event) => {
                            setQuery(event.currentTarget.value)
                            setBrowseIndex(0)
                        }}
                        onKeyDown={onKeyDown}
                        placeholder="Type a command…"
                        className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-ink-faint"
                    />
                    <kbd className="rounded-md border border-line bg-muted px-1.5 py-0.5 font-mono text-[0.625rem] text-muted-foreground">esc</kbd>
                </div>

                <div className="max-h-[46vh] overflow-y-auto p-1.5">
                    {filtered.length === 0 ? (
                        <p className="px-3 py-6 text-center text-sm text-muted-foreground">No command matches “{query}”.</p>
                    ) : (
                        COMMAND_GROUPS.map((group) => {
                            const groupCommands = filtered.filter((command) => command.group === group)
                            if (groupCommands.length === 0) return null
                            return (
                                <div key={group} className="mb-1 last:mb-0">
                                    <p className={cn(eyebrowClass, 'px-3 pt-2 pb-1')}>{GROUP_LABEL[group]}</p>
                                    <ul className="space-y-0.5">
                                        {groupCommands.map((command) => {
                                            const disabled = command.disabled()
                                            const selected = activeItem?.command.id === command.id
                                            return (
                                                <li key={command.id}>
                                                    <button
                                                        type="button"
                                                        className={cn(
                                                            'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-1.5 text-left text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                                                            selected ? 'bg-accent/10 text-accent' : 'text-foreground',
                                                            disabled && 'cursor-not-allowed opacity-45',
                                                        )}
                                                        disabled={disabled}
                                                        onClick={() => {
                                                            void (document.activeElement as HTMLElement | null)?.blur()
                                                            run(command)
                                                        }}
                                                        onPointerMove={() => {
                                                            const index = selectable.findIndex((entry) => entry.command.id === command.id)
                                                            if (index >= 0) setBrowseIndex(index)
                                                        }}
                                                    >
                                                        <span className="truncate">{command.title}</span>
                                                        {command.hint ? (
                                                            <kbd className="shrink-0 rounded-md border border-line bg-muted px-1.5 py-0.5 font-mono text-[0.625rem] text-muted-foreground">
                                                                {command.hint}
                                                            </kbd>
                                                        ) : (
                                                            <CornerDownLeft className="size-3 shrink-0 text-ink-faint" />
                                                        )}
                                                    </button>
                                                </li>
                                            )
                                        })}
                                    </ul>
                                </div>
                            )
                        })
                    )}
                </div>
            </motion.div>
        </div>
    )
}
import type { AppSettingKey } from '@/stores/settings-store'

export type CommandGroup = 'Navigate' | 'Manage' | 'Round' | 'Settings'

export interface CommandContext {
    navigate: (to: string) => void
    openAddStudent: () => void
    openLearnerPicker: () => void
    toggleSidebar: () => void
    getSetting: (key: AppSettingKey) => string
    setSetting: (key: AppSettingKey, value: string) => void
}

export interface Command {
    id: string
    title: string
    hint: string
    keywords: string
    group: CommandGroup
    disabled: () => boolean
    run: (context: CommandContext) => void
}

export const COMMAND_GROUPS: CommandGroup[] = ['Navigate', 'Manage', 'Round', 'Settings']

export function searchableText(command: Command): string {
    return `${command.title} ${command.keywords} ${command.hint}`.toLowerCase()
}

export function matchScore(command: Command, query: string): number | null {
    const needle = query.trim().toLowerCase()
    if (!needle) return 0
    const title = command.title.toLowerCase()
    const rest = searchableText(command)
    if (title.startsWith(needle)) return 0
    if (title.includes(needle)) return 1
    if (rest.includes(needle)) return 2
    return null
}

export function filterCommands(commands: Command[], query: string): Command[] {
    const needle = query.trim().toLowerCase()
    if (!needle) return commands
    const scored = commands
        .map((command, index) => ({ command, index, score: matchScore(command, needle) }))
        .filter((entry): entry is { command: Command; index: number; score: number } => entry.score !== null)
    scored.sort((a, b) => a.score - b.score || a.index - b.index)
    return scored.map((entry) => entry.command)
}

export function moveSelection(current: number, delta: number, length: number): number {
    if (length <= 0) return 0
    return (((current + delta) % length) + length) % length
}

type SettingsEntryType = 'item' | 'section'

export interface SettingsEntry {
    id: string
    type: SettingsEntryType
    label: string
    section: string
    keywords: string[]
}

const SETTINGS_SECTIONS: SettingsEntry[] = [
    { id: 'appearance', type: 'section', label: 'Appearance', section: 'Appearance', keywords: ['theme', 'colour', 'color', 'desk', 'look'] },
    { id: 'typing-experience', type: 'section', label: 'Typing experience', section: 'Typing experience', keywords: ['caret', 'cursor', 'highlight', 'timer', 'errors'] },
    { id: 'practice', type: 'section', label: 'Practice', section: 'Practice', keywords: ['sound', 'finger', 'focus', 'goal'] },
    { id: 'shortcuts', type: 'section', label: 'Keyboard shortcuts', section: 'Keyboard shortcuts', keywords: ['keys', 'hotkeys', 'shortcut', 'restart'] },
    { id: 'notifications', type: 'section', label: 'Notifications', section: 'Notifications', keywords: ['notify', 'alerts', 'os'] },
    { id: 'updates', type: 'section', label: 'Updates', section: 'Updates', keywords: ['version', 'auto update', 'install'] },
    { id: 'data', type: 'section', label: 'Data', section: 'Data', keywords: ['backup', 'export', 'import', 'database', 'health'] },
]

const SETTINGS_ITEMS: SettingsEntry[] = [
    { id: 'theme', type: 'item', label: 'Theme', section: 'Appearance', keywords: ['dark', 'light', 'night', 'system', 'mode'] },
    { id: 'default-language', type: 'item', label: 'Default language', section: 'Appearance', keywords: ['myanmar', 'english', 'language'] },
    { id: 'palette', type: 'item', label: 'Desk palette', section: 'Appearance', keywords: ['preset', 'swatch', 'colour', 'color', 'default'] },
    { id: 'background-effect', type: 'item', label: 'Background effect', section: 'Appearance', keywords: ['aurora', 'dots', 'grid', 'noise'] },

    { id: 'time-warning', type: 'item', label: 'Time warning sound', section: 'Typing experience', keywords: ['chime', 'beep', 'timer', 'end'] },
    { id: 'quick-restart', type: 'item', label: 'Quick restart key', section: 'Typing experience', keywords: ['tab', 'enter', 'restart'] },
    { id: 'sound-volume', type: 'item', label: 'Sound volume', section: 'Typing experience', keywords: ['volume', 'loudness', 'click'] },
    { id: 'highlight', type: 'item', label: 'Highlight', section: 'Typing experience', keywords: ['word', 'letter', 'next'] },
    { id: 'blind-mode', type: 'item', label: 'Blind mode', section: 'Typing experience', keywords: ['hide', 'upcoming', 'blind'] },
    { id: 'caret-style', type: 'item', label: 'Caret style', section: 'Typing experience', keywords: ['cursor', 'bar', 'block', 'line', 'underline'] },
    { id: 'smooth-caret', type: 'item', label: 'Smooth caret', section: 'Typing experience', keywords: ['animation', 'cursor', 'glide'] },
    { id: 'pace-caret', type: 'item', label: 'Pace caret', section: 'Typing experience', keywords: ['second caret', 'trail', 'wpm'] },
    { id: 'hide-extra-letters', type: 'item', label: 'Hide extra letters', section: 'Typing experience', keywords: ['word', 'current', 'show'] },
    { id: 'timer-style', type: 'item', label: 'Timer style', section: 'Typing experience', keywords: ['progress bar', 'text', 'mini', 'hidden'] },

    { id: 'key-sounds', type: 'item', label: 'Key click sounds', section: 'Practice', keywords: ['click', 'type', 'volume', 'sound'] },
    { id: 'hand-guide', type: 'item', label: 'Hand guide', section: 'Practice', keywords: ['finger', 'next', 'hands', 'guide'] },
    { id: 'virtual-keyboard', type: 'item', label: 'Virtual keyboard', section: 'Practice', keywords: ['keyboard', 'keys', 'on-screen', 'keycap', 'show', 'hide'] },
    { id: 'focus-mode', type: 'item', label: 'Focus mode', section: 'Practice', keywords: ['minimal', 'hide header', 'zen'] },
    { id: 'confirm-exit', type: 'item', label: 'Confirm before abandoning a round', section: 'Practice', keywords: ['exit', 'abandon', 'confirm', 'leave'] },
    { id: 'focus-guard', type: 'item', label: 'Pause when you leave the window', section: 'Practice', keywords: ['out of focus', 'blur', 'pause', 'window'] },
    { id: 'indicate-typos', type: 'item', label: 'How mistakes are shown', section: 'Practice', keywords: ['errors', 'mistakes', 'underline', 'replace', 'typos'] },
    { id: 'daily-goal', type: 'item', label: 'Daily practice goal (minutes)', section: 'Practice', keywords: ['goal', 'ring', 'dashboard', 'minutes', 'streak'] },

    { id: 'notifications-enabled', type: 'item', label: 'Enable notifications', section: 'Notifications', keywords: ['os', 'native', 'alerts', 'on', 'off'] },
    { id: 'notify-updates', type: 'item', label: 'Notify about application updates', section: 'Notifications', keywords: ['new version', 'release'] },

    { id: 'auto-update', type: 'item', label: 'Check for updates automatically', section: 'Updates', keywords: ['6 hours', 'auto', 'version'] },

    { id: 'export-all', type: 'item', label: 'Back up everything', section: 'Data', keywords: ['export', 'all', 'backup', 'json'] },
    { id: 'export-one', type: 'item', label: 'Back up a learner', section: 'Data', keywords: ['export', 'student', 'one'] },
    { id: 'import-backup', type: 'item', label: 'Import from backup', section: 'Data', keywords: ['restore', 'import', 'json'] },
    { id: 'health-check', type: 'item', label: 'Check database health', section: 'Data', keywords: ['integrity', 'diagnose', 'database'] },
]

export const SETTINGS_CATALOG: SettingsEntry[] = [...SETTINGS_SECTIONS, ...SETTINGS_ITEMS]

interface SettingsMatch {
    entry: SettingsEntry
    rank: number
}

function normalized(query: string): string {
    return query.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function searchSettings(query: string, catalog: SettingsEntry[] = SETTINGS_CATALOG): SettingsMatch[] {
    const q = normalized(query)
    if (q === '') return catalog.map((entry) => ({ entry, rank: 0 }))

    const rankEntry = (entry: SettingsEntry): number => {
        const label = entry.label.toLowerCase()
        const section = entry.section.toLowerCase()
        const kw = entry.keywords.map((k) => k.toLowerCase())
        if (q === label) return 0
        if (label.startsWith(q)) return 1
        if (q === section || section.startsWith(q)) return 2
        if (label.includes(q)) return 3
        if (section.includes(q)) return 4
        if (kw.includes(q)) return 5
        if (kw.some((k) => k.includes(q))) return 6
        return -1
    }

    return catalog
        .map((entry) => ({ entry, rank: rankEntry(entry) }))
        .filter((m) => m.rank >= 0)
        .sort((a, b) => a.rank - b.rank || SETTINGS_CATALOG.indexOf(a.entry) - SETTINGS_CATALOG.indexOf(b.entry))
}

export function groupMatches(matches: SettingsMatch[]): { section: string; items: SettingsEntry[] }[] {
    const groups = new Map<string, SettingsEntry[]>()
    for (const { entry } of matches) {
        if (entry.type === 'section') continue
        const list = groups.get(entry.section) ?? []
        list.push(entry)
        groups.set(entry.section, list)
    }
    return [...groups.entries()].map(([section, items]) => ({ section, items }))
}

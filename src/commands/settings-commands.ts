import type { Command, CommandContext } from './registry'
import type { AppSettingKey } from '@/stores/settings-store'

export interface SettingCommandDef {
    id: string
    title: string
    keywords: string
    settingKey: AppSettingKey
    toggle?: boolean
    value?: string
}

export const SETTING_COMMANDS: SettingCommandDef[] = [
    {
        id: 'punctuation',
        title: 'Practice punctuation',
        keywords: 'add punctuation marks comma full stop',
        settingKey: 'practice.punctuation',
        toggle: true,
    },
    { id: 'numbers', title: 'Practice numbers', keywords: 'digits numerals 0 1 2 3 4 5 6 7 8 9', settingKey: 'practice.numbers', toggle: true },
    { id: 'blind-mode', title: 'Blind mode', keywords: 'hide text unseen cover ink', settingKey: 'practice.blindMode', toggle: true },
    {
        id: 'hide-extra-letters',
        title: 'Hide extra letters',
        keywords: 'only show current word',
        settingKey: 'practice.hideExtraLetters',
        toggle: true,
    },
    { id: 'pace-caret', title: 'Pace caret', keywords: 'second caret trail wpm guide', settingKey: 'practice.paceCaret', toggle: true },
    {
        id: 'confirm-exit',
        title: 'Confirm before abandoning',
        keywords: 'exit warn leave round confirm',
        settingKey: 'practice.confirmExit',
        toggle: true,
    },
    { id: 'time-warning', title: 'Time warning sound', keywords: 'chime countdown beep timer end', settingKey: 'practice.timeWarning', toggle: true },
    {
        id: 'virtual-keyboard',
        title: 'Virtual keyboard',
        keywords: 'keys on-screen keycap show hide',
        settingKey: 'practice.showKeyboard',
        toggle: true,
    },
    { id: 'timer-style-bar', title: 'Timer style: bar', keywords: 'progress bar time remaining', settingKey: 'practice.timerStyle', value: 'bar' },
    { id: 'timer-style-mini', title: 'Timer style: mini', keywords: 'compact small countdown', settingKey: 'practice.timerStyle', value: 'mini' },
    {
        id: 'timer-style-text',
        title: 'Timer style: text',
        keywords: 'plain time remaining numbers',
        settingKey: 'practice.timerStyle',
        value: 'text',
    },
    { id: 'timer-style-off', title: 'Timer style: off', keywords: 'hidden no timer', settingKey: 'practice.timerStyle', value: 'off' },
]

export function buildSettingCommands(context: CommandContext, defs: SettingCommandDef[] = SETTING_COMMANDS): Command[] {
    return defs.map((def) => ({
        id: `setting-${def.id}`,
        title: def.title,
        hint: '',
        keywords: def.keywords,
        group: 'Settings' as Command['group'],
        disabled: () => false,
        run: () => {
            if (def.toggle) {
                context.setSetting(def.settingKey, context.getSetting(def.settingKey) === 'on' ? 'off' : 'on')
            } else if (def.value !== undefined) {
                context.setSetting(def.settingKey, def.value)
            }
        },
    }))
}

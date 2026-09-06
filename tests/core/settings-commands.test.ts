import { describe, expect, it } from 'vitest'

import { SETTING_COMMANDS, buildSettingCommands } from '@/commands/settings-commands'
import { filterCommands } from '@/commands/registry'
import type { CommandContext } from '@/commands/registry'

function harness(initial: Record<string, string>) {
    const state: Record<string, string> = { ...initial }
    const context: CommandContext = {
        navigate: () => {},
        openAddStudent: () => {},
        openLearnerPicker: () => {},
        toggleSidebar: () => {},
        getSetting: (key) => state[key] ?? '',
        setSetting: (key, value) => {
            state[key] = value
        },
    }
    return { context, state }
}

describe('settings commands', () => {
    it('builds one command per definition in the Settings group', () => {
        const { context } = harness({})
        const commands = buildSettingCommands(context)
        expect(commands).toHaveLength(SETTING_COMMANDS.length)
        expect(commands.every((c) => c.group === 'Settings')).toBe(true)
        expect(new Set(commands.map((c) => c.id)).size).toBe(commands.length)
    })

    it('toggle commands flip the current on/off value and report live state', () => {
        const { context, state } = harness({ 'practice.punctuation': 'off' })
        const commands = buildSettingCommands(context)
        const punctuation = commands.find((c) => c.id === 'setting-punctuation')
        expect(punctuation).toBeDefined()

        punctuation?.run(context)
        expect(state['practice.punctuation']).toBe('on')
        expect(context.getSetting('practice.punctuation')).toBe('on')

        punctuation?.run(context)
        expect(state['practice.punctuation']).toBe('off')
    })

    it('toggle commands treat a missing setting as off', () => {
        const { context, state } = harness({})
        buildSettingCommands(context).find((c) => c.id === 'setting-numbers')?.run(context)
        expect(state['practice.numbers']).toBe('on')
    })

    it('value commands write a fixed value instead of toggling', () => {
        const { context, state } = harness({ 'practice.timerStyle': 'text' })
        const commands = buildSettingCommands(context)
        commands.find((c) => c.id === 'setting-timer-style-bar')?.run(context)
        expect(state['practice.timerStyle']).toBe('bar')
        commands.find((c) => c.id === 'setting-timer-style-off')?.run(context)
        expect(state['practice.timerStyle']).toBe('off')
    })

    it('is searchable by intent through the registry', () => {
        const { context } = harness({})
        const commands = buildSettingCommands(context)
        const byTitle = filterCommands(commands, 'punctuation').map((c) => c.id)
        expect(byTitle[0]).toBe('setting-punctuation')
        expect(filterCommands(commands, 'mini').map((c) => c.id)).toEqual(['setting-timer-style-mini'])
    })

    it('never reports itself disabled', () => {
        const { context } = harness({})
        expect(buildSettingCommands(context).every((c) => !c.disabled())).toBe(true)
    })
})
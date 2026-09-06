import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

import {
    COMMAND_GROUPS,
    filterCommands,
    findCommandIndex,
    matchScore,
    moveSelection,
    searchableText,
    type Command,
    type CommandContext,
} from '@/commands/registry'
import { createCommands } from '@/commands/palette-commands'
import { useTypingStore } from '@/stores/typing-store'
import { useUiStore } from '@/stores/ui-store'

class FakeWindow {
    handlers = new Map<string, Array<() => void>>()
    addEventListener(type: string, handler: () => void) {
        const arr = this.handlers.get(type) ?? []
        arr.push(handler)
        this.handlers.set(type, arr)
    }
    removeEventListener(type: string, handler: () => void) {
        const arr = (this.handlers.get(type) ?? []).filter((h) => h !== handler)
        this.handlers.set(type, arr)
    }
}
;(globalThis as Record<string, unknown>).window = new FakeWindow()
;(globalThis as Record<string, unknown>).document = { visibilityState: 'visible', addEventListener() {}, removeEventListener() {} }

function command(id: string, overrides: Partial<Command> = {}): Command {
    return {
        id,
        title: id,
        hint: '',
        keywords: '',
        group: 'Navigate',
        disabled: () => false,
        run: () => {},
        ...overrides,
    }
}

function makeContext(overrides: Partial<CommandContext> = {}): CommandContext {
    return {
        navigate: vi.fn(),
        openAddStudent: vi.fn(),
        openLearnerPicker: vi.fn(),
        toggleSidebar: vi.fn(),
        getSetting: vi.fn(() => 'off'),
        setSetting: vi.fn(),
        ...overrides,
    }
}

describe('command registry', () => {
    it('searchableText folds title, keywords and hint to lowercase', () => {
        const cmd = command('x', { title: 'Timed Tests', keywords: 'Time Exam', hint: 'Ctrl+3' })
        expect(searchableText(cmd)).toBe('timed tests time exam ctrl+3')
    })

    it('matchScore ranks an empty query as a full match', () => {
        expect(matchScore(command('x'), '   ')).toBe(0)
    })

    it('matchScore prefers title-prefix, then title-contains, then keywords', () => {
        const prefix = command('a', { title: 'timed tests' })
        const contains = command('b', { title: 'settings', keywords: '' })
        const keyword = command('c', { title: 'progress', keywords: 'stats chart' })
        expect(matchScore(prefix, 'ti')).toBe(0)
        expect(matchScore(contains, 'ti')).toBe(1)
        expect(matchScore(keyword, 'stats')).toBe(2)
        expect(matchScore(keyword, 'zzz')).toBeNull()
    })

    it('filterCommands returns everything for an empty query', () => {
        const cmds = [command('a'), command('b')]
        expect(filterCommands(cmds, '  ')).toEqual(cmds)
    })

    it('filterCommands orders prefix matches before substring and keyword matches', () => {
        const cmds = [
            command('settings', { title: 'Settings', keywords: 'preferences' }),
            command('timed', { title: 'Timed tests', keywords: 'exam' }),
            command('stats', { title: 'Progress', keywords: 'stats chart' }),
        ]
        const filtered = filterCommands(cmds, 'ti')
        expect(filtered.map((c) => c.id)).toEqual(['timed', 'settings'])
        expect(filterCommands(cmds, 'stat').map((c) => c.id)).toEqual(['stats'])
    })

    it('filterCommands keeps equal-score matches in original order', () => {
        const cmds = [command('one', { title: 'Ring ring' }), command('two', { title: 'Ring down' })]
        const filtered = filterCommands(cmds, 'ring')
        expect(filtered.map((c) => c.id)).toEqual(['one', 'two'])
    })

    it('filterCommands returns nothing when nothing matches', () => {
        expect(filterCommands([command('a')], 'nomatch')).toEqual([])
    })

    it('moveSelection wraps in both directions and guards empty lists', () => {
        expect(moveSelection(2, 1, 3)).toBe(0)
        expect(moveSelection(0, -1, 3)).toBe(2)
        expect(moveSelection(0, 0, 0)).toBe(0)
        expect(moveSelection(1, -5, 3)).toBe(2)
    })

    it('findCommandIndex locates a command by id', () => {
        const cmds = [command('a'), command('b')]
        expect(findCommandIndex(cmds, 'b')).toBe(1)
        expect(findCommandIndex(cmds, 'zz')).toBe(-1)
        expect(COMMAND_GROUPS).toContain('Navigate')
    })
})

describe('palette commands', () => {
    it('ships navigation, manage and round commands', () => {
        const commands = createCommands(makeContext())
        const ids = commands.map((c) => c.id)
        expect(ids).toContain('nav-/')
        expect(ids).toContain('nav-/learn')
        expect(ids).toContain('nav-/settings')
        expect(ids).toContain('choose-learner')
        expect(ids).toContain('add-student')
        expect(ids).toContain('toggle-sidebar')
        expect(ids).toContain('pause')
        expect(ids).toContain('restart')
        expect(ids).toContain('abandon')
    })

    it('navigation commands navigate via the context', () => {
        const context = makeContext()
        const commands = createCommands(context)
        const learn = commands.find((c) => c.id === 'nav-/learn')
        learn?.run(context)
        expect(context.navigate).toHaveBeenCalledWith('/learn')
    })

    it('manage commands call their context hooks', () => {
        const context = makeContext()
        const commands = createCommands(context)
        commands.find((c) => c.id === 'add-student')?.run(context)
        commands.find((c) => c.id === 'choose-learner')?.run(context)
        commands.find((c) => c.id === 'toggle-sidebar')?.run(context)
        expect(context.openAddStudent).toHaveBeenCalledOnce()
        expect(context.openLearnerPicker).toHaveBeenCalledOnce()
        expect(context.toggleSidebar).toHaveBeenCalledOnce()
    })

    it('round commands are disabled while idle and safe to ignore', () => {
        const context = makeContext()
        const commands = createCommands(context)
        expect(commands.find((c) => c.id === 'pause')?.disabled()).toBe(true)
        expect(commands.find((c) => c.id === 'restart')?.disabled()).toBe(true)
        expect(commands.find((c) => c.id === 'abandon')?.disabled()).toBe(true)
        expect(() => commands.map((c) => c.run(context))).not.toThrow()
    })

    it('ships settings commands that write through the context', () => {
        const context = makeContext()
        const commands = createCommands(context)
        expect(commands.find((c) => c.id === 'setting-punctuation')).toBeDefined()
        expect(commands.find((c) => c.id === 'setting-timer-style-bar')).toBeDefined()
        commands.find((c) => c.id === 'setting-timer-style-text')?.run(context)
        expect(context.setSetting).toHaveBeenCalledWith('practice.timerStyle', 'text')
    })
})

describe('ui-store palette state', () => {
    beforeEach(() => {
        useTypingStore.setState({ status: 'idle' })
        useUiStore.setState({ commandPaletteOpen: false })
    })

    afterEach(() => {
        useTypingStore.getState().clear()
        useUiStore.setState({ commandPaletteOpen: false })
    })

    it('starts closed and toggles through the setter', () => {
        expect(useUiStore.getState().commandPaletteOpen).toBe(false)
        useUiStore.getState().setCommandPaletteOpen(true)
        expect(useUiStore.getState().commandPaletteOpen).toBe(true)
        useUiStore.getState().setCommandPaletteOpen(false)
        expect(useUiStore.getState().commandPaletteOpen).toBe(false)
    })
})
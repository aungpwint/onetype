import { useTypingStore } from '@/stores/typing-store'
import type { Command, CommandContext, CommandGroup } from './registry'

const NAV = [
    { to: '/', title: 'Dashboard', hint: 'Ctrl+1', keywords: 'home start panel' },
    { to: '/learn', title: 'Learn', hint: 'Ctrl+2', keywords: 'lessons lesson curriculum' },
    { to: '/practice', title: 'Practice', hint: '', keywords: 'quick free text typing' },
    { to: '/drill', title: 'Adaptive drill', hint: '', keywords: 'weak keys focused weaknesses' },
    { to: '/tests', title: 'Timed tests', hint: 'Ctrl+3', keywords: 'timed time exam paper' },
    { to: '/progress', title: 'Progress', hint: 'Ctrl+4', keywords: 'stats heatmap history records' },
    { to: '/teacher', title: 'Teacher', hint: '', keywords: 'classroom monitor learners' },
    { to: '/students', title: 'Students', hint: '', keywords: 'learners kids class roster' },
    { to: '/settings', title: 'Settings', hint: 'Ctrl+5', keywords: 'preferences options configure config' },
]

function roundStatus(): string {
    return useTypingStore.getState().status
}

function groupFor(id: string): CommandGroup {
    return id === 'close'
        ? 'Manage'
        : id === 'pause' || id === 'restart' || id === 'abandon'
          ? 'Round'
          : 'Navigate'
}

export function createCommands(context: CommandContext): Command[] {
    const base: Command[] = NAV.map((item) => ({
        id: `nav-${item.to}`,
        title: item.title,
        hint: item.hint,
        keywords: item.keywords,
        group: groupFor(`nav-${item.to}`),
        disabled: () => false,
        run: () => context.navigate(item.to),
    }))

    const manage: Command[] = [
        {
            id: 'choose-learner',
            title: 'Choose a learner',
            hint: '',
            keywords: 'student select switch learner active',
            group: 'Manage',
            disabled: () => false,
            run: () => context.openLearnerPicker(),
        },
        {
            id: 'add-student',
            title: 'Add a student',
            hint: '',
            keywords: 'new learner create roster member',
            group: 'Manage',
            disabled: () => false,
            run: () => context.openAddStudent(),
        },
        {
            id: 'toggle-sidebar',
            title: 'Toggle sidebar',
            hint: '',
            keywords: 'rail panel navigation show hide',
            group: 'Manage',
            disabled: () => false,
            run: () => context.toggleSidebar(),
        },
    ]

    const round: Command[] = [
        {
            id: 'pause',
            title: 'Pause / resume run',
            hint: 'Esc',
            keywords: 'start stop hold continue break',
            group: 'Round',
            disabled: () => {
                const status = roundStatus()
                return status !== 'running' && status !== 'paused'
            },
            run: () => {
                const status = roundStatus()
                if (status === 'running' || status === 'paused') useTypingStore.getState().togglePause()
            },
        },
        {
            id: 'restart',
            title: 'Restart run',
            hint: 'R',
            keywords: 'retry again fresh redo reset',
            group: 'Round',
            disabled: () => {
                const status = roundStatus()
                return status !== 'ready' && status !== 'paused'
            },
            run: () => {
                const status = roundStatus()
                if (status === 'ready' || status === 'paused') useTypingStore.getState().restart()
            },
        },
        {
            id: 'abandon',
            title: 'Abandon run',
            hint: '',
            keywords: 'quit exit stop leave close round',
            group: 'Round',
            disabled: () => roundStatus() === 'idle',
            run: () => {
                if (roundStatus() !== 'idle') useTypingStore.getState().abandon()
            },
        },
    ]

    return [...base, ...manage, ...round]
}
import type { ReactNode } from 'react'
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'

export function SessionFocus({ children }: { children: ReactNode }) {
    useKeyboardShortcuts()
    return <div className="flex h-screen w-screen flex-col overflow-hidden bg-background">{children}</div>
}

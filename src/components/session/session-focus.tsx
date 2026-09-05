import type { ReactNode } from 'react'
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'
import { Atmosphere } from '@/components/ui'

export function SessionFocus({ children }: { children: ReactNode }) {
    useKeyboardShortcuts()
    return (
        <div className="relative isolate flex h-screen w-screen flex-col overflow-hidden bg-background">
            <Atmosphere className="-z-10" />
            {children}
        </div>
    )
}

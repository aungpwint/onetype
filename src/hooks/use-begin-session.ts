import { useEffect, useRef } from 'react'
import { useTypingStore } from '@/stores/typing-store'

export function useBeginSession(id: string | undefined, load: () => Promise<void>) {
    const status = useTypingStore((s) => s.status)
    const sessionKind = useTypingStore((s) => s.session?.kind)
    const startedFor = useRef<string | null>(null)

    useEffect(() => {
        if (!id) return
        if (status === 'idle' && startedFor.current !== id) {
            startedFor.current = id
            void load()
        }
    }, [id, status, sessionKind, load])
}

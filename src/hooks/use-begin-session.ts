import { useCallback, useEffect, useRef, useState } from 'react'
import { useTypingStore } from '@/stores/typing-store'

export function useBeginSession(id: string | undefined, load: () => Promise<void>): { reload: () => void } {
    const status = useTypingStore((s) => s.status)
    const [reloadToken, setReloadToken] = useState(0)
    const startedFor = useRef<{ id: string; token: number } | null>(null)

    const reload = useCallback(() => setReloadToken((token) => token + 1), [])

    useEffect(() => {
        if (!id) return
        if (status !== 'idle') return
        const started = startedFor.current
        if (started !== null && started.id === id && started.token === reloadToken) return
        startedFor.current = { id, token: reloadToken }
        // A rejected prepare must never leave the loading gate spinning forever:
        // surface it as the session error so the gate can respond.
        void Promise.resolve()
            .then(load)
            .catch((error: unknown) => {
                const message = error instanceof Error ? error.message : 'Could not prepare this session.'
                useTypingStore.setState({ error: message })
            })
    }, [id, status, reloadToken, load])

    return { reload }
}
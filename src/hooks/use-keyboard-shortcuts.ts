import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTypingStore } from '@/stores/typing-store'
import { useUiStore } from '@/stores/ui-store'

export function useKeyboardShortcuts() {
    const navigate = useNavigate()

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            const typingActive = useTypingStore.getState().status !== 'idle'
            const key = event.key.toLowerCase()
            const mod = event.ctrlKey || event.metaKey || event.altKey

            if (mod && key === 'k') {
                event.preventDefault()
                useUiStore.getState().setCommandPaletteOpen(true)
                return
            }
            if (key === 'escape' && useUiStore.getState().commandPaletteOpen) {
                event.preventDefault()
                useUiStore.getState().setCommandPaletteOpen(false)
                return
            }

            if (mod && event.key === '1') {
                event.preventDefault()
                navigate('/')
                return
            }
            if (mod && event.key === '2') {
                event.preventDefault()
                navigate('/learn')
                return
            }
            if (mod && event.key === '3') {
                event.preventDefault()
                navigate('/tests')
                return
            }
            if (mod && event.key === '4') {
                event.preventDefault()
                navigate('/progress')
                return
            }
            if (mod && event.key === '5') {
                event.preventDefault()
                navigate('/settings')
                return
            }
            if ((mod && key === ',') || (mod && event.shiftKey && key === 'm')) {
                event.preventDefault()
                navigate('/settings')
                return
            }
            if (mod && event.shiftKey && key === 't') {
                event.preventDefault()
                navigate('/tests')
                return
            }
            if (mod && event.shiftKey && key === 'l') {
                event.preventDefault()
                navigate('/learn')
                return
            }

            // Escape pauses a running session; R restarts only when typing is not live (see bindKeys).
            if (!mod && key === 'escape' && typingActive) {
                const st = useTypingStore.getState()
                if (st.status === 'running' || st.status === 'paused') st.togglePause()
                return
            }
            if (!mod && key === 'r' && typingActive) {
                const st = useTypingStore.getState()
                if (st.status === 'ready' || st.status === 'paused') {
                    st.restart()
                    return
                }
                if (st.status === 'finished') {
                    st.retry()
                    return
                }
            }
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [navigate])
}

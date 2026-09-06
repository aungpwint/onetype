import { useEffect, useState } from 'react'

export function useCapsLockState(): boolean {
    const [capsLockOn, setCapsLockOn] = useState(false)

    useEffect(() => {
        const sync = (event: KeyboardEvent) => {
            setCapsLockOn(event.getModifierState('CapsLock'))
        }
        window.addEventListener('keydown', sync, true)
        window.addEventListener('keyup', sync, true)
        return () => {
            window.removeEventListener('keydown', sync, true)
            window.removeEventListener('keyup', sync, true)
        }
    }, [])

    return capsLockOn
}

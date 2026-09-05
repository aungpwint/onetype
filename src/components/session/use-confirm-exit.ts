import { useState } from 'react'
import { useSettingsStore } from '@/stores/settings-store'

/**
 * Guards leaving a session behind the `practice.confirmExit` preference.
 * `requestExit` immediately abandons when confirmations are off, otherwise asks first.
 */
export function useConfirmExit(onExit: () => void) {
    const confirmExit = useSettingsStore((s) => s.get('practice.confirmExit'))
    const [open, setOpen] = useState(false)

    const requestExit = () => {
        if (confirmExit !== 'off') setOpen(true)
        else onExit()
    }

    const confirm = () => {
        setOpen(false)
        onExit()
    }

    const cancel = () => setOpen(false)

    return { open, requestExit, confirm, cancel }
}

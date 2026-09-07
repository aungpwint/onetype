import { useState } from 'react'
import { useSettingsStore } from '@/stores/settings-store'

export function useConfirmExit(onExit: () => void) {
    const confirmExit = useSettingsStore((s) => s.getEnum('practice.confirmExit', ['on', 'off'] as const, 'on'))
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

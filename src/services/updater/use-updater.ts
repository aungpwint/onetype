import { useState, useEffect, useRef, useCallback } from 'react'
import { updaterService } from './service'
import { CHECK_THROTTLE_MS, type UpdateStatus } from './types'
import { useSettingsStore } from '@/stores/settings-store'

import { notificationService } from '@/services/notification/service'

export function useUpdater() {
    const [status, setStatus] = useState<UpdateStatus>({ state: 'idle' })
    const autoUpdate = useSettingsStore((s) => s.get('app.autoUpdate'))

    useEffect(() => {
        return updaterService.subscribe(setStatus)
    }, [])

    const check = useCallback(() => updaterService.check(), [])
    const downloadAndInstall = useCallback(() => updaterService.downloadAndInstall(), [])
    const updateNow = useCallback(() => updaterService.downloadAndInstall(true), [])
    const install = useCallback(() => updaterService.install(), [])
    const reset = useCallback(() => updaterService.reset(), [])

    return { status, check, downloadAndInstall, updateNow, install, reset, autoUpdate }
}

export function useStartupUpdateCheck() {
    const lastChecked = useSettingsStore((s) => s.get('updater.lastChecked'))
    const autoUpdate = useSettingsStore((s) => s.get('app.autoUpdate'))
    const setSetting = useSettingsStore((s) => s.set)
    const checked = useRef(false)

    useEffect(() => {
        let disposed = false

        const runCheck = async (throttled: boolean) => {
            if (autoUpdate === 'off') return
            if (disposed) return

            const now = Date.now()
            const last = Number(lastChecked) || 0
            if (throttled && now - last < CHECK_THROTTLE_MS) return

            const available = await updaterService.check(undefined, { silent: true })
            if (disposed) return

            await setSetting('updater.lastChecked', String(now))

            if (available) {
                const status = updaterService.getStatus()
                if (status.state === 'available') {
                    const settings = useSettingsStore.getState()
                    const notificationsOn = settings.get('notification.enabled') !== 'off' && settings.get('notification.notifyUpdates') !== 'off'
                    const lastNotified = settings.get('notification.lastNotifiedVersion')
                    if (notificationsOn && status.version !== lastNotified) {
                        await notificationService.send({
                            title: 'OneType Update Available',
                            body: `A new version of OneType is available. Click to view the update.`,
                        })
                        await setSetting('notification.lastNotifiedVersion', status.version)
                    }
                }
            }
        }

        if (!checked.current) {
            checked.current = true
            void runCheck(true)
        }

        const interval = window.setInterval(() => void runCheck(false), CHECK_THROTTLE_MS)

        return () => {
            disposed = true
            window.clearInterval(interval)
        }
    }, [autoUpdate, lastChecked, setSetting])
}

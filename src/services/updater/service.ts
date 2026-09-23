import { type Update } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'
import {
    isUpdateAvailable,
    mapUpdateError,
    snoozeRemaining,
    UPDATE_SNOOZE_MS,
    type UpdateStatus,
} from './types'

import { isTauriRuntime } from '@/services/ipc'
import { notificationService } from '@/services/notification/service'
import { useSettingsStore } from '@/stores/settings-store'

function updateNotificationsEnabled(): boolean {
    const settings = useSettingsStore.getState()
    return settings.get('notification.enabled') !== 'off' && settings.get('notification.notifyUpdates') !== 'off'
}

type Listener = (status: UpdateStatus) => void

function snoozeUntil(): number {
    return Number(useSettingsStore.getState().get('updater.snoozeUntil')) || 0
}

export function updateSnoozeRemaining(version?: string): number {
    return snoozeRemaining(Date.now(), snoozeUntil(), useSettingsStore.getState().get('updater.snoozeVersion'), version)
}

export async function snoozeUpdate(version?: string): Promise<void> {
    const store = useSettingsStore.getState()
    const base = Math.max(Date.now(), snoozeUntil())
    await store.set('updater.snoozeUntil', String(base + UPDATE_SNOOZE_MS))
    if (version) await store.set('updater.snoozeVersion', version)
}

class UpdaterService {
    private status: UpdateStatus = { state: 'idle' }
    private listeners = new Set<Listener>()
    private updateObj: Update | null = null
    private version: string | undefined
    private checking = false
    private downloading = false
    private installedVersion: string | undefined
    private installedVersionRead = false

    subscribe(fn: Listener): () => void {
        this.listeners.add(fn)
        fn(this.status)
        return () => this.listeners.delete(fn)
    }

    private emit(status: UpdateStatus) {
        this.status = status
        for (const fn of this.listeners) fn(status)
    }

    getStatus(): UpdateStatus {
        return this.status
    }

    private async getCurrentVersion(): Promise<string | undefined> {
        try {
            const { getVersion } = await import('@tauri-apps/api/app')
            return await getVersion()
        } catch {
            return undefined
        }
    }

    private async getInstalledVersion(): Promise<string | undefined> {
        if (!this.installedVersionRead) {
            this.installedVersionRead = true
            this.installedVersion = await this.getCurrentVersion()
        }
        return this.installedVersion
    }

    private hasNetwork(): boolean {
        return typeof navigator === 'undefined' || navigator.onLine !== false
    }

    async check(currentVersion?: string, { silent = false, force = false } = {}): Promise<boolean> {
        if (this.checking) return false
        if (!isTauriRuntime()) {
            this.emit({ state: 'not-available' })
            return false
        }
        if (!this.hasNetwork()) {
            this.emit({ state: 'not-available' })
            return false
        }

        this.checking = true
        this.emit({ state: 'checking' })

        try {
            const { check } = await import('@tauri-apps/plugin-updater')
            const update = await check()

            if (!update) {
                this.updateObj = null
                this.version = undefined
                this.emit({ state: 'not-available' })
                return false
            }

            const installedVersion = currentVersion ?? (await this.getInstalledVersion()) ?? update.currentVersion
            if (!isUpdateAvailable(installedVersion, update.version)) {
                this.updateObj = null
                this.version = undefined
                this.emit({ state: 'not-available' })
                return false
            }

            if (!force && updateSnoozeRemaining(update.version) > 0) {
                this.updateObj = null
                this.version = undefined
                this.emit({ state: 'not-available' })
                return false
            }

            this.updateObj = update
            this.version = update.version
            this.emit({
                state: 'available',
                version: update.version,
                body: update.body,
                date: update.date,
            })
            return true
        } catch (err) {
            this.updateObj = null
            this.version = undefined
            if (!this.hasNetwork()) {
                this.emit({ state: 'not-available' })
                return false
            }
            if (!silent) {
                const message = mapUpdateError(err)
                this.emit({ state: 'error', message })
            } else {
                this.emit({ state: 'not-available' })
            }
            return false
        } finally {
            this.checking = false
        }
    }

    async downloadAndInstall(autoInstall = false): Promise<void> {
        if (!this.updateObj || this.downloading) return

        this.version = this.updateObj.version
        this.downloading = true
        this.emit({ state: 'downloading', progress: 0, version: this.version })

        try {
            await this.updateObj.downloadAndInstall((event) => {
                if (event.event === 'Started') {
                    const length = event.data.contentLength
                    this.emit({ state: 'downloading', progress: 0, contentLength: length, version: this.version })
                } else if (event.event === 'Progress') {
                    const chunk = event.data.chunkLength
                    const prev = this.status.state === 'downloading' ? this.status.progress : 0
                    this.emit({
                        state: 'downloading',
                        progress: prev + chunk,
                        contentLength: this.status.state === 'downloading' ? this.status.contentLength : undefined,
                        version: this.version,
                    })
                } else if (event.event === 'Finished') {
                    this.emit({ state: 'downloaded', version: this.version })
                }
            })

            if (autoInstall) {
                this.emit({ state: 'installing', version: this.version })
                await relaunch()
                return
            }

            this.emit({ state: 'downloaded', version: this.version })

            if (updateNotificationsEnabled()) {
                notificationService.send({
                    title: 'OneType Update Ready',
                    body: 'The latest update has been downloaded and is ready to install.',
                })
            }
        } catch (err) {
            const message = mapUpdateError(err)
            this.emit({ state: 'error', message })
        } finally {
            this.downloading = false
        }
    }

    async install(): Promise<void> {
        this.emit({ state: 'installing', version: this.version })
        await relaunch()
    }

    reset() {
        this.updateObj = null
        this.version = undefined
        this.checking = false
        this.downloading = false
        this.emit({ state: 'idle' })
    }
}

export const updaterService = new UpdaterService()

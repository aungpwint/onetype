export type UpdateStatus =
    | { state: 'idle' }
    | { state: 'checking' }
    | { state: 'not-available' }
    | { state: 'available'; version: string; body?: string; date?: string }
    | { state: 'downloading'; progress: number; contentLength?: number; version?: string }
    | { state: 'downloaded'; version?: string }
    | { state: 'installing'; version?: string }
    | { state: 'completed' }
    | { state: 'error'; message: string }

export const CHECK_THROTTLE_MS = 6 * 60 * 60 * 1000 // 6 hours
export const UPDATE_SNOOZE_MS = 24 * 60 * 60 * 1000 // 1 day

export function compareVersions(a: string, b: string): number {
    const pa = a.split('.').map(Number)
    const pb = b.split('.').map(Number)
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const na = pa[i] ?? 0
        const nb = pb[i] ?? 0
        if (na > nb) return 1
        if (na < nb) return -1
    }
    return 0
}

export function isNewerVersion(current: string, available: string): boolean {
    return compareVersions(available, current) > 0
}

export function isUpdateAvailable(current: string | undefined, available: string | undefined): boolean {
    if (!current || !available) return false
    return compareVersions(available, current) > 0
}

export function snoozeRemaining(
    now: number,
    untilMs: number,
    snoozedVersion: string | undefined,
    version: string | undefined,
): number {
    const remaining = untilMs - now
    if (remaining <= 0) return 0
    if (snoozedVersion && version && compareVersions(version, snoozedVersion) > 0) return 0
    return remaining
}

export function mapUpdateError(err: unknown): string {
    const message = err instanceof Error ? err.message : String(err)
    if (/network|fetch|connect|timeout|ECONNREFUSED/i.test(message)) {
        return 'Unable to check for updates right now.'
    }
    if (/signature|verify|certificate/i.test(message)) {
        return 'The update could not be verified.'
    }
    if (/download|transfer/i.test(message)) {
        return 'The update could not be downloaded.'
    }
    if (/install|extract|space|ENOSPC|disk/i.test(message)) {
        return 'The update could not be installed.'
    }
    return 'An update error occurred.'
}

export function isCapsLockWarningVisible(capsLockOn: boolean, status: string): boolean {
    return capsLockOn && (status === 'running' || status === 'paused')
}

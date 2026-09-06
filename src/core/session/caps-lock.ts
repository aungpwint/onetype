/** Whether the caps-lock warning should be shown for the given round state. */
export function isCapsLockWarningVisible(capsLockOn: boolean, status: string): boolean {
    return capsLockOn && (status === 'running' || status === 'paused')
}
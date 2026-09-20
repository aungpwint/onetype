import { beforeEach, describe, expect, it } from 'vitest'

const PREFIX = 'onetype:local:'
const STUDENTS_KEY = `${PREFIX}students`
const SETTINGS_KEY = `${PREFIX}settings`

function installLocalStorageShim() {
    const store = new Map<string, string>()
    const shim: Storage = {
        get length() {
            return store.size
        },
        clear: () => store.clear(),
        getItem: (key) => store.get(key) ?? null,
        key: (index) => [...store.keys()][index] ?? null,
        removeItem: (key) => void store.delete(key),
        setItem: (key, value) => void store.set(key, value),
    }
    Object.defineProperty(globalThis, 'localStorage', { value: shim, configurable: true })
}

describe('generated student codes honour the configured prefix', () => {
    beforeEach(() => {
        installLocalStorageShim()
    })

    it('defaults to STU with a zero-padded counter', async () => {
        const { localBackend } = await import('@/services/local')
        const first = await localBackend.createStudent({ name: 'A' })
        const second = await localBackend.createStudent({ name: 'B' })
        expect(first.studentCode).toBe('STU001')
        expect(second.studentCode).toBe('STU002')
    })

    it('uses the persisted teacher.studentCodePrefix for new codes only', async () => {
        await import('@/services/local')
        localStorage.setItem(SETTINGS_KEY, JSON.stringify({ 'teacher.studentCodePrefix': 'TEA' }))
        const { localBackend } = await import('@/services/local')
        const first = await localBackend.createStudent({ name: 'A' })
        const second = await localBackend.createStudent({ name: 'B' })
        // Existing default-prefix codes are ignored under the TEA family, so the
        // counter restarts from TEA001 instead of continuing to TEA003.
        expect(first.studentCode).toBe('TEA001')
        expect(second.studentCode).toBe('TEA002')
    })

    it('continues an existing prefix family instead of colliding', async () => {
        await import('@/services/local')
        localStorage.setItem(
            STUDENTS_KEY,
            JSON.stringify([
                { id: 'x', studentCode: 'TEA007', name: 'Old', displayName: 'Old', avatar: null, active: false, createdAt: 0, updatedAt: 0 },
            ]),
        )
        localStorage.setItem(SETTINGS_KEY, JSON.stringify({ 'teacher.studentCodePrefix': 'TEA' }))
        const { localBackend } = await import('@/services/local')
        const student = await localBackend.createStudent({ name: 'A' })
        expect(student.studentCode).toBe('TEA008')
    })

    it('falls back to STU when the stored prefix is invalid', async () => {
        await import('@/services/local')
        localStorage.setItem(SETTINGS_KEY, JSON.stringify({ 'teacher.studentCodePrefix': '9bad!!' }))
        const { localBackend } = await import('@/services/local')
        const student = await localBackend.createStudent({ name: 'A' })
        expect(student.studentCode).toBe('STU001')
    })

    it('still passes an explicit studentCode through untouched', async () => {
        const { localBackend } = await import('@/services/local')
        localStorage.setItem(SETTINGS_KEY, JSON.stringify({ 'teacher.studentCodePrefix': 'TEA' }))
        const student = await localBackend.createStudent({ name: 'A', studentCode: 'CUSTOM-42' })
        expect(student.studentCode).toBe('CUSTOM-42')
    })
})

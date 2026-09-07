import { beforeEach, describe, expect, it } from 'vitest'

const PREFIX = 'onetype:local:'
const TESTS_KEY = `${PREFIX}typingTests`

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

describe('seeded typing tests use the language-matched layout', () => {
    beforeEach(() => {
        installLocalStorageShim()
    })

    it('seeds mixed tests on the mixed layout and Myanmar tests on the myanmar layout', async () => {
        const { localBackend } = await import('@/services/local')
        const tests = await localBackend.listTypingTests()
        const byId = new Map(tests.map((t) => [t.id, t]))

        expect(byId.get('t5min')?.language).toBe('mixed')
        expect(byId.get('t5min')?.layoutId).toBe('english-myanmar-mixed')
        expect(byId.get('t10min')?.layoutId).toBe('english-myanmar-mixed')
        expect(byId.get('t1min')?.layoutId).toBe('myanmar')
        expect(byId.get('t3min')?.layoutId).toBe('myanmar')
    })

    it('migrates a stale mixed test (layoutId myanmar) to the mixed layout', async () => {
        const stale = [
            { id: 't-old', code: 't-old', name: 'Old mixed', durationSeconds: 60, language: 'mixed', layoutId: 'myanmar', minAccuracy: 85, minWpm: 20, contentVersion: 1 },
        ]
        localStorage.setItem(TESTS_KEY, JSON.stringify(stale))
        const { localBackend } = await import('@/services/local')
        const tests = await localBackend.listTypingTests()
        const persisted = JSON.parse(localStorage.getItem(TESTS_KEY) ?? '[]') as Array<{ id: string; layoutId: string }>

        expect(tests.length).toBe(1)
        expect(tests[0].layoutId).toBe('english-myanmar-mixed')
        expect(persisted[0].layoutId).toBe('english-myanmar-mixed')
    })

    it('leaves valid tests untouched', async () => {
        const valid = [
            { id: 't-en', code: 't-en', name: 'English', durationSeconds: 60, language: 'english', layoutId: 'english-qwerty', minAccuracy: 85, minWpm: 20, contentVersion: 1 },
        ]
        localStorage.setItem(TESTS_KEY, JSON.stringify(valid))
        const { localBackend } = await import('@/services/local')
        const tests = await localBackend.listTypingTests()

        expect(tests.length).toBe(1)
        expect(tests[0].layoutId).toBe('english-qwerty')
    })
})
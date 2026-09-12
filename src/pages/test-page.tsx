import { useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import * as backend from '@/services/backend'
import { useTypingStore } from '@/stores/typing-store'
import { Session, SessionGate } from '@/components/session/session-workspace'
import { useBeginSession } from '@/hooks/use-begin-session'

export default function TestPage() {
    const { testId } = useParams<{ testId: string }>()
    const navigate = useNavigate()
    const session = useTypingStore((s) => s.session)
    const beginTest = useTypingStore((s) => s.beginTest)

    const load = useCallback(async () => {
        if (!testId) return
        const tests = await backend.listTypingTests()
        const test = tests.find((t) => t.id === testId)
        if (test) await beginTest(test)
    }, [testId, beginTest])

    const { reload } = useBeginSession(testId, load)

    return (
        <SessionGate
            ready={session?.kind === 'test' && !!session?.test}
            loadingLabel="Preparing test text, keyboard and attempt…"
            steps={['Preparing test text', 'Warming up the keyboard', 'Setting up your attempt']}
            note="Every run is timed, scored and saved against the paper's target. Always prepare carefully and write."
            onReload={reload}
        >
            {session?.kind === 'test' && session.test ? (
                <Session durationSeconds={session.test.durationSeconds} sourceName={session.test.name} onExit={() => navigate('/tests')} />
            ) : null}
        </SessionGate>
    )
}

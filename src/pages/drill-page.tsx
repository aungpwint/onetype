import { useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTypingStore, buildAdaptiveDrill } from '@/stores/typing-store'
import { useSettingsStore } from '@/stores/settings-store'
import { ExerciseWorkspace } from '@/components/session/exercise-workspace'
import { SessionGate } from '@/components/session/session-workspace'
import { useBeginSession } from '@/hooks/use-begin-session'

export default function DrillPage() {
    const navigate = useNavigate()
    const session = useTypingStore((s) => s.session)
    const beginDrill = useTypingStore((s) => s.beginDrill)
    const practiceLang = useSettingsStore((s) => s.values['practice.lang'])
    const [searchParams] = useSearchParams()

    const layoutId =
        searchParams.get('layout') === 'myanmar' || (searchParams.get('layout') === null && practiceLang === 'myanmar') ? 'myanmar' : 'english-qwerty'

    const troubleKeys = searchParams.get('keys')?.split(',').filter(Boolean) ?? undefined

    const load = useCallback(async () => {
        const drill = await buildAdaptiveDrill({ layoutId, troubleKeys })
        if (!drill) throw new Error('Please add a student profile first.')
        await beginDrill(drill)
    }, [beginDrill, layoutId, troubleKeys])

    const { reload } = useBeginSession('drill', load)

    return (
        <SessionGate
            ready={session?.kind === 'drill'}
            loadingLabel="Building drill from your weak keys…"
            steps={['Building your drill', 'Warming up the keyboard', 'Setting up your attempt']}
            note="Built from the keys you keep missing — or, until there's enough typing data, a tour of the whole keyboard."
            onReload={reload}
            onLeave={() => navigate('/')}
        >
            {session?.kind === 'drill' ? <ExerciseWorkspace onExit={() => navigate('/')} backAriaLabel="Back to dashboard" /> : null}
        </SessionGate>
    )
}

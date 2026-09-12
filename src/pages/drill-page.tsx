import { useCallback, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AlertCircle, ArrowLeft, LayoutDashboard } from 'lucide-react'
import { useTypingStore, buildAdaptiveDrill } from '@/stores/typing-store'
import { useSettingsStore } from '@/stores/settings-store'
import { Session, SessionGate } from '@/components/session/session-workspace'
import { useBeginSession } from '@/hooks/use-begin-session'
import { EmptyState } from '@/components/ui'
import { Button } from '@/components/ui/button'

export default function DrillPage() {
    const navigate = useNavigate()
    const session = useTypingStore((s) => s.session)
    const beginDrill = useTypingStore((s) => s.beginDrill)
    const practiceLang = useSettingsStore((s) => s.values['practice.lang'])
    const [searchParams] = useSearchParams()
    const [error, setError] = useState<string | null>(null)

    const layoutId =
        searchParams.get('layout') === 'myanmar' || (searchParams.get('layout') === null && practiceLang === 'myanmar') ? 'myanmar' : 'english-qwerty'

    const troubleKeys = searchParams.get('keys')?.split(',').filter(Boolean) ?? undefined

    const load = useCallback(async () => {
        try {
            const drill = await buildAdaptiveDrill({ layoutId, troubleKeys })
            if (drill) await beginDrill(drill)
            else
                setError(
                    troubleKeys
                        ? 'Could not build a drill from those keys right now.'
                        : 'Not enough typing data yet to spot weaknesses. Finish a few lessons first.',
                )
        } catch {
            setError('Could not prepare an adaptive drill right now.')
        }
    }, [beginDrill, layoutId, troubleKeys])

    const { reload } = useBeginSession('drill', load)

    if (error && session?.kind !== 'drill') {
        return (
            <div className="flex h-full min-h-0 w-full flex-1 items-center justify-center px-6">
                <EmptyState icon={<AlertCircle className="size-8" />} title="Never mind the keys for now">
                    <p className="text-destructive">{error}</p>
                    <div className="mt-5 flex justify-center gap-2">
                        <Button variant="outline" onClick={() => navigate('/learn')}>
                            <ArrowLeft className="size-4" />
                            Back to lessons
                        </Button>
                        <Button onClick={() => navigate('/')}>
                            <LayoutDashboard className="size-4" />
                            Dashboard
                        </Button>
                    </div>
                </EmptyState>
            </div>
        )
    }

    return (
        <SessionGate
            ready={session?.kind === 'drill'}
            loadingLabel="Building drill from your weak keys…"
            steps={['Building your drill', 'Warming up the keyboard', 'Setting up your attempt']}
            note="Built from the keys you keep missing."
            onReload={reload}
        >
            {session?.kind === 'drill' && session.drill ? (
                <Session durationSeconds={null} sourceName={session.resolved.title} eyebrow="Adaptive drill" onExit={() => navigate('/')} />
            ) : null}
        </SessionGate>
    )
}

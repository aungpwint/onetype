import { useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTypingStore } from '@/stores/typing-store'
import { ExerciseWorkspace } from '@/components/session/exercise-workspace'
import { SessionGate } from '@/components/session/session-workspace'
import { useBeginSession } from '@/hooks/use-begin-session'
import { UI_KEYS } from '@/services/storage-keys'
import type { TypingMode } from '@/types'

export default function LessonPage() {
    const { lessonId } = useParams<{ lessonId: string }>()
    const navigate = useNavigate()
    const session = useTypingStore((s) => s.session)
    const beginLesson = useTypingStore((s) => s.beginLesson)

    const load = useCallback(() => {
        const mode = (localStorage.getItem(UI_KEYS.lessonMode) as TypingMode | null) ?? 'guided'
        return lessonId ? beginLesson(lessonId, mode) : Promise.resolve()
    }, [lessonId, beginLesson])

    useBeginSession(lessonId, load)

    return (
        <SessionGate
            ready={session?.kind === 'lesson'}
            loadingLabel="Loading lesson text, keyboard and attempt…"
            steps={['Loading lesson text', 'Warming up the keyboard', 'Setting up your attempt']}
            note="Your progress is saved after every run."
        >
            {session?.kind === 'lesson' ? <ExerciseWorkspace onExit={() => navigate('/learn')} /> : null}
        </SessionGate>
    )
}

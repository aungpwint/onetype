import { useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
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
    const [searchParams] = useSearchParams()

    // ?exercise=N (1-based) jumps straight into a specific exercise so a
    // previously completed one can be retaken without redoing the lesson.
    const exerciseParam = searchParams.get('exercise')
    const exerciseIndex = exerciseParam !== null && /^[1-9]\d*$/.test(exerciseParam) ? Math.max(0, parseInt(exerciseParam, 10) - 1) : undefined

    const load = useCallback(() => {
        const stored = localStorage.getItem(UI_KEYS.lessonMode)
        // Only the lesson-applicable modes are meaningful here; anything else
        // (test, quick, or a stale/unknown value) falls back to guided.
        const mode: TypingMode = stored === 'practice' || stored === 'strict' ? stored : 'guided'
        return lessonId ? beginLesson(lessonId, mode, exerciseIndex) : Promise.resolve()
    }, [lessonId, beginLesson, exerciseIndex])

    const { reload } = useBeginSession(lessonId, load)

    return (
        <SessionGate
            ready={session?.kind === 'lesson'}
            loadingLabel="Loading lesson text, keyboard and attempt…"
            steps={['Loading lesson text', 'Warming up the keyboard', 'Setting up your attempt']}
            note="Your progress is saved after every exercise. Leaving early keeps everything you finished."
            onReload={reload}
            onLeave={() => navigate('/learn')}
        >
            {session?.kind === 'lesson' ? <ExerciseWorkspace onExit={() => navigate('/learn')} /> : null}
        </SessionGate>
    )
}

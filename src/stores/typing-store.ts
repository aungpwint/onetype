import { create } from 'zustand'
import { TypingEngine } from '@/core/typing-engine/engine'
import { getLayout, getLayoutOrThrow, layoutForLanguage } from '@/core/keyboard-layout/registry'
import { englishQwerty } from '@/core/keyboard-layout/english-qwerty'
import { resolveLessonById } from '@/data/curriculum'
import type { ResolvedLesson } from '@/data/curriculum/generator'
import { buildTestMaterial, resolveTestLayout } from '@/core/materials/test-material'
import { buildPracticeMaterial, type PracticeConfig } from '@/core/materials/practice-material'
import { extractMissedWords } from '@/core/materials/missed-words'
import type { KeyboardLayout } from '@/core/keyboard-layout/layout'
import type { Modifier, TypingMode } from '@/types'
import { resolvePressedKey } from '@/core/input/key-resolution'
import type { ScoreMetrics } from '@/core/scoring/score'
import type { AchievementRecord, TypingStatRecord, TypingTest } from '@/services/types'
import { reinforcementFromWeakKeys, type ReinforcedDrill, type MuscleMemoryGoal } from '@/core/reinforcement'
import { projectMasteryDelta, type MasteryDelta } from '@/core/mastery'
import * as backend from '@/services/backend'
import { useStudentStore } from './student-store'
import { useLessonStore } from './lesson-store'
import { useUiStore } from './ui-store'
import { useSettingsStore } from './settings-store'
import { useProgressionStore } from './progression-store'
import { CONTENT_VERSION } from '@/services/local'
import { playAchievementSound, playCompletionSound, playErrorSound, playKeySound } from '@/lib/sound'
import { bindWindowFocusGuard, type FocusPolicy } from './window-focus'

export interface LiveStats {
    unitIndex: number
    totalUnits: number
    correctCount: number
    incorrectCount: number
    backspaceCount: number
    accuracy: number
    wpm: number
    cpm: number
    elapsedMs: number
}

export interface FinishedResult {
    lessonId?: string
    testId?: string
    mode: TypingMode
    metrics: ScoreMetrics
    passed: boolean
    finishReason: 'completed' | 'time-up'
    attempt: number
    newlyUnlocked: string[]
    masteryDelta?: MasteryDelta
    saveError?: string
}

interface TypingSessionState {
    kind: 'lesson' | 'test' | 'drill' | 'practice'
    lessonId?: string
    test?: TypingTest
    drill?: ReinforcedDrill
    practice?: PracticeConfig
    resolved: ResolvedLesson
    layout: KeyboardLayout
    mode: TypingMode
    durationSeconds: number | null
    attempt: number
    startedAt: number
}

interface TypingState {
    session: TypingSessionState | null
    engine: TypingEngine | null
    status: 'idle' | 'ready' | 'running' | 'paused' | 'finished'
    error: string | null
    wrongFlash: { unitIndex: number; at: number } | null
    tick: number
    result: FinishedResult | null
    windowFocused: boolean
    lostFocusAt: number | null
    afkGapMs: number | null
    pendingRestartAt: number | null
    markOutOfFocus: () => void
    markRefocused: (afkGapMs: number) => void
    acknowledgeAway: () => void
    requestQuickRestart: () => boolean
    practiceMissedWords: () => Promise<void>
    beginLesson: (lessonId: string, mode?: TypingMode) => Promise<void>
    beginTest: (test: TypingTest) => Promise<void>
    beginDrill: (drill: ReinforcedDrill) => Promise<void>
    beginPractice: (config: PracticeConfig) => Promise<void>
    start: () => void
    togglePause: () => void
    restart: () => void
    retry: () => void
    abandon: () => void
    persistAndFinish: (guardEngine?: TypingEngine) => Promise<void>
    clear: () => void
    clearError: () => void
    getLiveStats: () => LiveStats
    expectedKey: () => { code: string; modifier: Modifier } | null
}

const INITIAL_RUN_STATE: Partial<TypingState> = {
    status: 'ready',
    result: null,
    error: null,
    wrongFlash: null,
    tick: 0,
    windowFocused: true,
    lostFocusAt: null,
    afkGapMs: null,
    pendingRestartAt: null,
}

function liveStats(engine: TypingEngine | null, totalUnits: number): LiveStats {
    if (!engine) {
        return { unitIndex: 0, totalUnits, correctCount: 0, incorrectCount: 0, backspaceCount: 0, accuracy: 0, wpm: 0, cpm: 0, elapsedMs: 0 }
    }
    const metrics = engine.currentMetrics()
    return {
        unitIndex: engine.unitIndex,
        totalUnits,
        correctCount: engine.correctCount,
        incorrectCount: engine.incorrectCount,
        backspaceCount: engine.backspaceCount,
        accuracy: metrics.accuracy,
        wpm: metrics.grossWpm,
        cpm: metrics.cpm,
        elapsedMs: engine.elapsedMs(),
    }
}

const IGNORED_CODES = new Set([
    'ShiftLeft',
    'ShiftRight',
    'AltLeft',
    'AltRight',
    'ControlLeft',
    'ControlRight',
    'MetaLeft',
    'MetaRight',
    'CapsLock',
    'Tab',
    'Enter',
    'Escape',
    'F1',
    'F2',
    'F3',
    'F4',
    'F5',
    'F6',
    'F7',
    'F8',
    'F9',
    'F10',
    'F11',
    'F12',
    'ArrowUp',
    'ArrowDown',
    'ArrowLeft',
    'ArrowRight',
])

const ENGLISH_LAYOUT_ID = 'english-qwerty'

function drillResolvedLesson(drill: ReinforcedDrill, layoutId: string): ResolvedLesson {
    const plan = drill.plan
    const seq = plan.sequence
    return {
        id: 'drill:weakness',
        level: 'beginner',
        number: 0,
        sequence: seq,
        layoutId: layoutId === 'english-qwerty' || layoutId === 'myanmar' ? layoutId : 'english-qwerty',
        totalUnits: seq.units.length,
        totalCharacters: seq.charCount,
        phases: [],
        difficulty: 'adaptive',
        estimatedMinutes: 0,
        completion: { minAccuracy: 0, minWpm: null },
        title: `Weakness drill · ${plan.goal}`,
        titleMy: '',
        description: 'Adaptive drill targeting detected weak keys.',
        language: layoutId === 'myanmar' ? 'myanmar' : 'english',
        focusKeys: plan.keys,
    }
}

export async function buildAdaptiveDrill(
    opts: { goal?: MuscleMemoryGoal; layoutId?: string; troubleKeys?: string[] } = {},
): Promise<ReinforcedDrill | null> {
    const active = useStudentStore.getState().active
    const layoutId = opts.layoutId ?? ENGLISH_LAYOUT_ID
    const layout = getLayout(layoutId) ?? englishQwerty
    // Position order means weakness: a lower index is a weaker key, which the
    // reinforcement layer's ascend-and-cap keeps first.
    if (opts.troubleKeys && opts.troubleKeys.length > 0) {
        return reinforcementFromWeakKeys(
            opts.troubleKeys.map((key, i) => ({ key, lowerBound: i })),
            { goal: opts.goal, layout },
        )
    }
    if (!active) return null
    const keys = await backend.weakKeys(active.id, layoutId, 8)
    if (keys.length === 0) return null
    const weakIds = keys.map((k, i) => ({ key: k.key, lowerBound: i }))
    return reinforcementFromWeakKeys(weakIds, { goal: opts.goal, layout })
}

export const useTypingStore = create<TypingState>((set, get) => {
    const launchSession = (session: TypingSessionState) => {
        const engine = createEngine(session)
        set({ session, engine, ...INITIAL_RUN_STATE })
        bindKeys()
        bindFocusGuard()
    }
    const teardownSession = () => {
        unbindKeys()
        unbindFocusGuard()
        set({ session: null, engine: null, status: 'idle', ...INITIAL_RUN_STATE })
    }

    return {
        session: null,
        engine: null,
        status: 'idle',
        error: null,
        wrongFlash: null,
        tick: 0,
        result: null,
        windowFocused: true,
        lostFocusAt: null,
        afkGapMs: null,
        pendingRestartAt: null,

        markOutOfFocus: () =>
            set((state) => ({
                windowFocused: false,
                lostFocusAt: state.lostFocusAt ?? Date.now(),
            })),
        markRefocused: (afkGapMs) => set({ windowFocused: true, lostFocusAt: null, afkGapMs }),
        acknowledgeAway: () => set({ windowFocused: true, lostFocusAt: null, afkGapMs: null }),
        requestQuickRestart: () => {
            const st = get()
            if (!st.engine || (st.status !== 'running' && st.status !== 'paused' && st.status !== 'ready')) return false
            // Double-press safety: the first press arms the restart, a second
            // press within the window actually restarts.
            const now = Date.now()
            const ARMED_WINDOW_MS = 600
            if (st.pendingRestartAt !== null && now - st.pendingRestartAt <= ARMED_WINDOW_MS) {
                set({ pendingRestartAt: null })
                st.restart()
                return true
            }
            set({ pendingRestartAt: now })
            return false
        },
        practiceMissedWords: async () => {
            const st = get()
            if (st.status !== 'finished' || !st.session || !st.engine) return
            const { engine, session } = st
            // The learner typed this text on this layout, so every missed word
            // is encodable by the same layout's practice builder.
            const language = session.layout.language === 'myanmar' ? ('myanmar' as const) : ('english' as const)
            const missed = extractMissedWords(engine)
            if (missed.count === 0) return
            st.clear()
            try {
                await get().beginPractice({ language, unit: 'text', text: missed.text })
            } catch (error) {
                set({ error: error instanceof Error ? error.message : 'Could not build the missed-words practice.' })
            }
        },

        beginLesson: async (lessonId, mode = 'guided') => {
            const active = await useStudentStore.getState().ensureActive()
            if (!active) {
                set({ error: 'Please add a student profile first.' })
                return
            }
            const resolved = resolveLessonById(lessonId)
            const layout = getLayoutOrThrow(resolved.layoutId)
            const attempt = await backend.nextExerciseAttempt(active.id, lessonId)
            const session: TypingSessionState = {
                kind: 'lesson',
                lessonId,
                resolved,
                layout,
                mode,
                durationSeconds: null,
                attempt,
                startedAt: Date.now(),
            }
            launchSession(session)
        },

        beginTest: async (test) => {
            const active = await useStudentStore.getState().ensureActive()
            if (!active) {
                set({ error: 'Please add a student profile first.' })
                return
            }
            const resolved = buildTestMaterial(test)
            const layout = resolveTestLayout(test)
            const attempt = await backend.nextTestAttempt(active.id, test.id)
            const session: TypingSessionState = {
                kind: 'test',
                test,
                resolved,
                layout,
                mode: 'test',
                durationSeconds: test.durationSeconds,
                attempt,
                startedAt: Date.now(),
            }
            launchSession(session)
        },

        beginDrill: async (drill) => {
            const active = await useStudentStore.getState().ensureActive()
            if (!active) {
                set({ error: 'Please add a student profile first.' })
                return
            }
            const session: TypingSessionState = {
                kind: 'drill',
                drill,
                resolved: drillResolvedLesson(drill, drill.layoutId),
                layout: getLayout(drill.layoutId) ?? englishQwerty,
                mode: 'guided',
                durationSeconds: null,
                attempt: 1,
                startedAt: Date.now(),
            }
            launchSession(session)
        },

        beginPractice: async (config) => {
            // Quick practice is untracked: no student profile, attempts or
            // backend writes are needed.
            const resolved = buildPracticeMaterial(config)
            const layout = layoutForLanguage(config.language)
            const session: TypingSessionState = {
                kind: 'practice',
                practice: config,
                resolved,
                layout,
                mode: 'quick',
                durationSeconds: config.unit === 'time' ? (config.time ?? null) : null,
                attempt: 1,
                startedAt: Date.now(),
            }
            launchSession(session)
        },

        start: () => {
            const { engine } = get()
            if (!engine) return
            engine.start()
            set({ status: engine.status })
        },

        togglePause: () => {
            const { engine } = get()
            if (!engine) return
            if (engine.status === 'running') engine.pause()
            else if (engine.status === 'paused') engine.resume()
            set({ status: engine.status })
        },

        restart: () => {
            const { engine } = get()
            if (!engine) return
            // A finished run has an async save in flight; only mid-run restart
            // is allowed to stay visibly instant.
            if (engine.finishReason !== null) return
            engine.restart()
            set({ ...INITIAL_RUN_STATE, pendingRestartAt: null })
        },

        retry: () => {
            const st = get()
            if (st.status !== 'finished' || !st.session) return
            const { clear, beginLesson, beginTest, beginPractice } = st
            const flagPrepareError = (error: unknown) => {
                set({ status: 'idle', error: error instanceof Error ? error.message : 'Could not rebuild this run.' })
            }
            const prepare = (run: Promise<void>) => void run.catch(flagPrepareError)
            if (st.session.kind === 'lesson') {
                const id = st.session.lessonId!
                const mode = st.session.mode
                clear()
                prepare(beginLesson(id, mode))
            } else if (st.session.kind === 'drill') {
                const layoutId = st.session.drill?.layoutId
                clear()
                void buildAdaptiveDrill({ layoutId }).then(
                    (drill) => {
                        if (drill) prepare(get().beginDrill(drill))
                    },
                    (error: unknown) => flagPrepareError(error),
                )
            } else if (st.session.kind === 'practice') {
                const config = st.session.practice!
                clear()
                prepare(beginPractice(config))
            } else {
                const test = st.session.test!
                clear()
                prepare(beginTest(test))
            }
        },

        abandon: () => {
            const { engine } = get()
            if (engine) engine.finish('stopped')
            teardownSession()
        },

        persistAndFinish: async (guardEngine) => {
            const { engine, session } = get()
            if (!engine || !session) return
            // If a fresh run already replaced this engine, the delayed save must
            // not attribute stale metrics to it.
            if (guardEngine && (engine !== guardEngine || get().status !== 'finished')) return
            const active = useStudentStore.getState().active
            if (!active) return
            unbindKeys()

            const metrics = engine.currentMetrics()
            const reason: 'completed' | 'time-up' = engine.finishReason === 'time-up' ? 'time-up' : 'completed'
            const now = Date.now()
            const layoutVersion = session.layout.version
            const contentVersion = CONTENT_VERSION
            const lesson = session.resolved

            if (session.kind === 'practice') {
                // Untracked by design: show the verdict but write nothing. The
                // diagnosis data still rides along for the result screen.
                return set({
                    result: {
                        mode: session.mode,
                        metrics,
                        passed: true,
                        finishReason: reason,
                        attempt: session.attempt,
                        newlyUnlocked: [],
                    },
                    status: 'finished',
                })
            }

            // Show the verdict immediately; the writes below upgrade the screen
            // (achievements, mastery, save-error) as they settle.
            const passed =
                session.kind === 'lesson'
                    ? reason === 'completed' && passes(metrics, lesson.completion.minAccuracy, lesson.completion.minWpm)
                    : session.kind === 'drill'
                      ? true
                      : (() => {
                            const test = session.test!
                            const passedAccuracy = metrics.accuracy >= test.minAccuracy
                            const passedWpm = test.minWpm === null ? null : metrics.grossWpm >= test.minWpm
                            return reason === 'completed' && passedAccuracy && (passedWpm === null || passedWpm)
                        })()

            set({
                result: {
                    ...(session.kind === 'lesson' ? { lessonId: session.lessonId } : {}),
                    ...(session.kind === 'test' ? { testId: session.test!.id } : {}),
                    mode: session.mode,
                    metrics,
                    passed,
                    finishReason: reason,
                    attempt: session.attempt,
                    newlyUnlocked: [],
                },
                status: 'finished',
            })

            // Never resurrect a stale round onto a fresh run.
            const publish = (patch: Partial<FinishedResult>) => {
                if (get().session !== session) return
                set((state) => ({ ...state, result: state.result ? { ...state.result, ...patch } : state.result }))
            }

            // Persistence is best-effort: even when a write fails the verdict
            // stays on screen, flagged so the learner never loses their score.
            try {
                await backend.saveTypingSession({
                    studentId: active.id,
                    lessonId: session.lessonId ?? null,
                    exerciseId: session.kind === 'lesson' ? (session.lessonId ?? null) : null,
                    level: session.kind === 'lesson' ? lesson.level : null,
                    lessonNumber: session.kind === 'lesson' ? lesson.number : null,
                    startedAt: session.startedAt,
                    endedAt: now,
                    durationMs: Math.round(engine.elapsedMs()),
                    targetLength: engine.sequence.charCount,
                    completedCount: engine.unitIndex,
                    correctCount: engine.correctCount,
                    errorCount: engine.incorrectCount,
                    backspaceCount: engine.backspaceCount,
                    wpm: metrics.grossWpm,
                    cpm: metrics.cpm,
                    accuracy: metrics.accuracy,
                    layoutId: session.layout.id,
                    layoutVersion,
                    contentVersion,
                    status: reason,
                })

                if (session.kind === 'lesson') {
                    await backend.saveExerciseResult({
                        studentId: active.id,
                        lessonId: session.lessonId ?? '',
                        exerciseId: session.lessonId ?? '',
                        level: lesson.level,
                        lessonNumber: lesson.number,
                        attempt: session.attempt,
                        startedAt: session.startedAt,
                        endedAt: now,
                        durationMs: Math.round(engine.elapsedMs()),
                        wpm: metrics.grossWpm,
                        cpm: metrics.cpm,
                        accuracy: metrics.accuracy,
                        correctCount: engine.correctCount,
                        errorCount: engine.incorrectCount,
                        totalCount: engine.sequence.units.length,
                        backspaceCount: engine.backspaceCount,
                        passed,
                        layoutId: session.layout.id,
                        layoutVersion,
                        contentVersion,
                    })
                    await useLessonStore.getState().saveProgress({
                        studentId: active.id,
                        lessonId: session.lessonId ?? '',
                        level: lesson.level,
                        lessonNumber: lesson.number,
                        wpm: metrics.grossWpm,
                        accuracy: metrics.accuracy,
                        completed: passed,
                        contentVersion,
                    })
                    await saveStatistics(active.id, session.layout.id)
                    // The current attempt was already persisted by
                    // saveExerciseResult, so the fetched history includes it.
                    let masteryDelta: MasteryDelta | undefined
                    try {
                        const history = await backend.listExerciseResults(active.id)
                        const attemptsForLesson = history
                            .filter((r) => r.lessonId === session.lessonId)
                            .sort((a, b) => a.attempt - b.attempt)
                            .map((r) => ({ passed: r.passed, accuracy: r.accuracy }))
                        masteryDelta = projectMasteryDelta(attemptsForLesson, lesson.completion.minAccuracy)
                    } catch {
                        masteryDelta = undefined
                    }
                    publish({ masteryDelta, newlyUnlocked: await recordProgression(metrics, passed, reason) })
                    return
                }

                if (session.kind === 'drill') {
                    // Drills count toward practice/achievement stats and key
                    // weakness tracking, but are never a lesson or test result.
                    await saveStatistics(active.id, session.layout.id)
                    publish({ newlyUnlocked: await recordProgression(metrics, true, reason) })
                    return
                }

                const test = session.test!
                await backend.saveTestResult({
                    studentId: active.id,
                    testId: test.id,
                    attempt: session.attempt,
                    wpm: metrics.grossWpm,
                    cpm: metrics.cpm,
                    accuracy: metrics.accuracy,
                    errors: engine.incorrectCount,
                    correctCount: engine.correctCount,
                    durationSeconds: Math.round(engine.elapsedSeconds()),
                    passed,
                    passedAccuracy: metrics.accuracy >= test.minAccuracy,
                    passedWpm: test.minWpm === null ? null : metrics.grossWpm >= test.minWpm,
                    layoutId: session.layout.id,
                    contentVersion,
                })
                await saveStatistics(active.id, session.layout.id)
                publish({ newlyUnlocked: await recordProgression(metrics, passed, reason) })
            } catch (error) {
                // Show the result anyway, flagging that it could not be saved.
                publish({ saveError: error instanceof Error ? error.message : String(error), newlyUnlocked: [] })
            }
        },

        clear: () => {
            teardownSession()
        },

        clearError: () => set({ error: null }),

        getLiveStats: () => {
            const { engine, session } = get()
            return liveStats(engine, session?.resolved.totalUnits ?? 0)
        },

        expectedKey: () => {
            const { engine } = get()
            const unit = engine?.expectedUnit ?? null
            if (!unit) return null
            return { code: unit.keyCode, modifier: unit.modifier }
        },
    }
})

function passes(metrics: ScoreMetrics, minAccuracy: number, minWpm: number | null): boolean {
    if (metrics.accuracy < minAccuracy) return false
    if (minWpm !== null && metrics.grossWpm < minWpm) return false
    return true
}

function createEngine(session: TypingSessionState): TypingEngine {
    const engine = new TypingEngine({
        sequence: session.resolved.sequence,
        layout: session.layout,
        mode: session.mode,
        durationSeconds:
            session.kind === 'test'
                ? session.test!.durationSeconds
                : session.kind === 'practice'
                  ? (session.durationSeconds ?? undefined)
                  : undefined,
        onEvent: (event) => {
            useTypingStore.setState((state) => ({ tick: state.tick + 1 }))
            if (event.type === 'incorrect' || event.type === 'backspace') {
                useTypingStore.setState({ wrongFlash: { unitIndex: event.expected?.index ?? 0, at: Date.now() } })
            } else if (event.type === 'correct' || event.type === 'restart') {
                useTypingStore.setState({ wrongFlash: null })
            }
            if (event.type === 'finish' || event.type === 'time-up') {
                bindKeys()
                window.setTimeout(() => {
                    void useTypingStore.getState().persistAndFinish(engine)
                }, 60)
            }
            const current = useTypingStore.getState().status
            const next = engine.status
            if (current !== next) {
                useTypingStore.setState({ status: next })
            }
        },
    })
    return engine
}

function bindKeys() {
    unbindKeys()
    const onKey = (event: KeyboardEvent) => {
        const { engine, status, session, windowFocused } = useTypingStore.getState()
        if (!engine) return
        // Keystrokes are only credentials while the window actually has focus.
        if (!windowFocused) return
        // Quick restart (Monkeytype parity): the configured key restarts a
        // running round in place, with double-press arming.
        const quickRestartCode = readQuickRestartCode()
        if ((status === 'running' || status === 'paused') && quickRestartCode !== null && event.code === quickRestartCode) {
            event.preventDefault()
            useTypingStore.getState().requestQuickRestart()
            return
        }
        if (status !== 'running' && status !== 'ready') return
        if (status === 'ready') {
            // Lesson exercises follow the trainer's "Press Tab to start" gate;
            // timed tests and drills keep the snappier first-key start.
            if (session?.kind === 'lesson' && event.code !== 'Tab') return
            useTypingStore.getState().start()
        }
        if (event.altKey || event.ctrlKey || event.metaKey) return
        if (event.repeat) return
        if (IGNORED_CODES.has(event.code)) return
        if (event.code === 'Backspace') {
            engine.processKey('Backspace', 'none')
            return
        }
        event.preventDefault()
        const pressed = resolvePressedKey(event, engine.layout)
        if (!pressed) return
        const expected = engine.expectedUnit
        const correct = expected ? pressed.code === expected.keyCode && pressed.modifier === expected.modifier : pressed.code === 'Space'
        engine.processKey(pressed.code, pressed.modifier)
        if (useUiStore.getState().soundEnabled) {
            if (correct) playKeySound(true)
            else playErrorSound()
        }
        const { engine: after } = useTypingStore.getState()
        if (after && (after.status === 'finished' || after.finishReason !== null)) {
            useTypingStore.setState({ status: after.status })
        }
    }
    window.addEventListener('keydown', onKey as EventListener)
    ;(window as unknown as { __otKeyHandler?: EventListener }).__otKeyHandler = onKey as EventListener
}

function unbindKeys() {
    const handler = (window as unknown as { __otKeyHandler?: EventListener }).__otKeyHandler
    if (handler) {
        window.removeEventListener('keydown', handler)
        delete (window as unknown as { __otKeyHandler?: EventListener }).__otKeyHandler
    }
}

let focusPolicy: FocusPolicy = 'off'
let focusGuardCleanup: (() => void) | null = null

function readFocusPolicy(): FocusPolicy {
    try {
        const value = useSettingsStore.getState().get('practice.focusGuard')
        if (value === 'pause') return 'pause'
        if (value === 'soft') return 'soft'
    } catch {
        /* fall through */
    }
    return 'off'
}

function readQuickRestartCode(): string | null {
    try {
        const value = useSettingsStore.getState().get('practice.quickRestart')
        if (value === 'tab') return 'Tab'
        if (value === 'enter') return 'Enter'
    } catch {
        /* fall through */
    }
    return null
}

function bindFocusGuard() {
    unbindFocusGuard()
    focusPolicy = readFocusPolicy()
    focusGuardCleanup = bindWindowFocusGuard({
        isSessionActive: () => {
            const s = useTypingStore.getState()
            return s.status === 'running' || s.status === 'ready' || s.status === 'paused'
        },
        onLostFocus: () => {
            const st = useTypingStore.getState()
            if (focusPolicy === 'off') return
            // Pause the clock the moment focus is lost so a quick tab-out never
            // silently inflates timing. `soft` dims + blocks keys without pausing.
            if (focusPolicy === 'pause' && st.status === 'running') {
                st.togglePause()
            }
            st.markOutOfFocus()
        },
        onRegainedFocus: (afkGapMs) => {
            const st = useTypingStore.getState()
            st.markRefocused(afkGapMs)
        },
    })
}

function unbindFocusGuard() {
    focusGuardCleanup?.()
    focusGuardCleanup = null
}

async function saveStatistics(studentId: string, layoutId: string) {
    const { engine } = useTypingStore.getState()
    if (!engine) return
    const layout = engine.layout
    const keyStats: TypingStatRecord[] = []
    const fingerAgg = new Map<string, { correct: number; incorrect: number }>()
    for (const [keyId, outcome] of engine.keyOutcomes) {
        if (outcome.correct > 0 || outcome.incorrect > 0) {
            keyStats.push({ key: keyId, layoutId, correct: outcome.correct, incorrect: outcome.incorrect })
            const idx = keyId.indexOf(':')
            const code = idx === -1 ? keyId : keyId.slice(0, idx)
            const finger = layout.getKey(code)?.finger
            if (finger) {
                const agg = fingerAgg.get(finger) ?? { correct: 0, incorrect: 0 }
                agg.correct += outcome.correct
                agg.incorrect += outcome.incorrect
                fingerAgg.set(finger, agg)
            }
        }
    }
    const fingerStats: TypingStatRecord[] = [...fingerAgg.entries()].map(([finger, o]) => ({
        key: finger,
        layoutId,
        correct: o.correct,
        incorrect: o.incorrect,
    }))
    try {
        await backend.saveStatistics({ studentId, keyStats, fingerStats, characterStats: [] })
    } catch {
        // statistics are best-effort
    }
}

async function recordProgression(metrics: ScoreMetrics, passed: boolean, reason: 'completed' | 'time-up'): Promise<string[]> {
    const { engine, session } = useTypingStore.getState()
    const active = useStudentStore.getState().active
    let records: AchievementRecord[] = []
    if (engine && session && active && reason === 'completed') {
        records = await useProgressionStore
            .getState()
            .onSessionFinished({
                studentId: active.id,
                durationMs: Math.round(engine.elapsedMs()),
                wpm: metrics.grossWpm,
                accuracy: metrics.accuracy,
                completed: true,
            })
            .catch(() => [])
    }
    const sound = useUiStore.getState().soundEnabled
    if (sound) {
        if (records.length > 0) playAchievementSound()
        else if (passed) playCompletionSound()
    }
    return records.map((a) => a.achievementId)
}

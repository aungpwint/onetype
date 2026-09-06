import { memo, useCallback, useLayoutEffect, useMemo, useRef } from 'react'
import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion'
import { useShallow } from 'zustand/react/shallow'
import { useTypingStore } from '@/stores/typing-store'
import { useSettingsStore } from '@/stores/settings-store'
import { cn } from '@/lib/utils'
import { containsMyanmar } from '@/core/unicode/myanmar'
import { graphemeUnitRuns, type GraphemeRun } from '@/core/typing-engine/sequence'
import { graphemeCorrectness, graphemeViewState, flashIndexMatches, rangeHasIncorrect } from '@/core/typing-engine/char-state'

const CARET_ANCHOR = 0.45
const CONTENT_INSET = 24
const WORDS_PER_MIN = 5

/** Presentation settings that only change on the settings page. */
interface TypingLens {
    highlightMode: string
    blindMode: string
    hideExtraLetters: string
    caretStyle: string
    smoothCaret: string
    paceCaret: string
    indicateTypos: string
}

function useTypingLens(): TypingLens {
    return {
        highlightMode: useSettingsStore((s) => s.get('practice.highlightMode') ?? 'word'),
        blindMode: useSettingsStore((s) => s.get('practice.blindMode') ?? 'off'),
        hideExtraLetters: useSettingsStore((s) => s.get('practice.hideExtraLetters') ?? 'off'),
        caretStyle: useSettingsStore((s) => s.get('practice.caretStyle') ?? 'bar'),
        smoothCaret: useSettingsStore((s) => s.get('practice.smoothCaret') ?? 'medium'),
        paceCaret: useSettingsStore((s) => s.get('practice.paceCaret') ?? 'off'),
        indicateTypos: useSettingsStore((s) => s.get('practice.indicateTypos') ?? 'below'),
    }
}

export function TargetText() {
    const session = useTypingStore((s) => s.session)
    const engine = useTypingStore((s) => s.engine)
    const reducedMotion = useReducedMotion()
    const lens = useTypingLens()

    const viewportRef = useRef<HTMLDivElement | null>(null)
    const contentRef = useRef<HTMLDivElement | null>(null)
    const caretRef = useRef<HTMLSpanElement | null>(null)
    const paceCaretRef = useRef<HTMLSpanElement | null>(null)

    const unitIndex = useTypingStore((s) => s.engine?.unitIndex ?? 0)
    const sequence = engine?.sequence
    const phases = useMemo(() => session?.resolved.phases ?? [], [session])
    const windowFocused = useTypingStore((s) => s.windowFocused)

    // Pace caret: only on timed rounds, and only once we have a speed signal.
    // Target progress = how far the round would have gone at the current
    // cumulative average speed; the caret trails that position.
    const paceEnabled = lens.paceCaret === 'on'
    const paceUnitIndex = useTypingStore((s) => {
        if (!paceEnabled) return null
        const e = s.engine
        if (!e) return null
        if ((s.session?.durationSeconds ?? null) === null) return null
        const elapsed = e.elapsedSeconds()
        if (elapsed < 1) return null
        const metrics = e.currentMetrics()
        const perMinUnits = metrics.speedUnit === 'units/min' ? metrics.speed : metrics.speed * WORDS_PER_MIN
        const total = e.sequence.units.length
        const expected = Math.round((perMinUnits * elapsed) / 60) + 1
        return Math.max(0, Math.min(total, expected))
    })

    const activePhase = useMemo(() => {
        if (phases.length === 0) return null
        const index = phases.findIndex((p) => unitIndex >= p.startUnit && unitIndex < p.endUnit)

        return phases[index === -1 ? phases.length - 1 : index]
    }, [phases, unitIndex])

    const activePhaseKey = activePhase ? `${activePhase.label}-${activePhase.startUnit}` : null

    const runs = useMemo(() => {
        const all = sequence ? graphemeUnitRuns(sequence) : []
        if (!activePhase) return all
        return all.filter((g) => g.startUnit >= activePhase.startUnit && g.endUnit <= activePhase.endUnit)
    }, [sequence, activePhase])

    // Stable per-phase word geometry (wordStart/wordEnd per run), so character
    // props don't change on every keystroke and memoized Chars can bail out.
    const wordGeometry = useMemo(() => {
        const starts: number[] = []
        let nextWordStart = 0
        for (const g of runs) {
            starts.push(nextWordStart)
            if (g.text.trim() === '') nextWordStart = g.endUnit
        }
        const totalUnits = runs.length > 0 ? runs[runs.length - 1].endUnit : 0
        const boundaries = [...new Set(starts)]
        const wordEnd = new Array<number>(runs.length)
        for (let i = runs.length - 1; i >= 0; i -= 1) {
            const idx = boundaries.indexOf(starts[i])
            wordEnd[i] = idx === boundaries.length - 1 ? totalUnits : boundaries[idx + 1]
        }
        return { wordStart: starts, wordEnd }
    }, [runs])

    const motionOffset = useMotionValue(0)
    const springOffset = useSpring(motionOffset, {
        stiffness: reducedMotion ? 2000 : 1100,
        damping: reducedMotion ? 150 : 60,
        mass: reducedMotion ? 0.01 : 0.22,
    })

    const sessionKey = session ? `${session.kind}-${session.lessonId ?? session.test?.id ?? ''}-${session.attempt}` : null

    useLayoutEffect(() => {
        const viewport = viewportRef.current
        const caret = caretRef.current
        const content = contentRef.current
        if (!viewport || !caret || !content) return

        const caretRect = caret.getBoundingClientRect()
        if (caretRect.width === 0) return

        const viewportRect = viewport.getBoundingClientRect()
        const contentRect = content.getBoundingClientRect()

        const caretCenter = caretRect.left + caretRect.width / 2 - viewportRect.left
        const targetCenter = viewportRect.width * CARET_ANCHOR

        const viewportWidth = viewportRect.width
        const contentWidth = content.scrollWidth
        const maxOffset = Math.max(0, (viewportWidth - contentWidth) / 2)
        const minOffset = Math.min(maxOffset, viewportWidth - contentWidth - CONTENT_INSET)

        const currentLeft = contentRect.left - viewportRect.left
        const nextOffset = Math.min(maxOffset, Math.max(minOffset, currentLeft - (caretCenter - targetCenter)))

        if (Math.abs(currentLeft - nextOffset) < 0.5) return

        motionOffset.set(nextOffset)
    }, [sessionKey, activePhaseKey, unitIndex, motionOffset])

    // Park the pace caret at the left edge of the pace character. The character
    // positions themselves never change on pan, so this only depends on which
    // character is the pace target.
    useLayoutEffect(() => {
        const content = contentRef.current
        const paceCaret = paceCaretRef.current
        if (!content || !paceCaret) return
        const anchor = content.querySelector<HTMLElement>('[data-pace-char]')
        if (!anchor) {
            paceCaret.classList.remove('tt-pace-caret--visible')
            return
        }
        paceCaret.style.left = `${anchor.offsetLeft + 1}px`
        paceCaret.classList.add('tt-pace-caret--visible')
    }, [paceUnitIndex, activePhaseKey, runs])

    const onCaretRef = useCallback((el: HTMLSpanElement | null) => {
        caretRef.current = el
    }, [])

    if (!session || !engine) return null

    return (
        <motion.div
            className="mx-auto w-full max-w-4xl"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
        >
            <div className="tt-container">
                <div ref={viewportRef} className="tt-viewport">
                    <motion.div ref={contentRef} className="tt-content" style={{ x: springOffset }}>
                        <motion.p
                            key={activePhaseKey ?? 'all'}
                            className={cn(
                                'mx-auto text-4xl leading-tight tracking-normal whitespace-nowrap md:text-5xl',
                                windowFocused ? '' : 'tt-blurred',
                            )}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.22, ease: 'easeOut' }}
                        >
                            <TextContent
                                runs={runs}
                                wordStart={wordGeometry.wordStart}
                                wordEnd={wordGeometry.wordEnd}
                                onCaret={onCaretRef}
                                focused={windowFocused}
                                highlightMode={lens.highlightMode}
                                blindMode={lens.blindMode}
                                hideExtraLetters={lens.hideExtraLetters}
                                caretStyle={lens.caretStyle}
                                smoothCaret={lens.smoothCaret}
                                indicateTypos={lens.indicateTypos}
                                paceUnitIndex={paceUnitIndex}
                            />
                        </motion.p>
                        <span ref={paceCaretRef} className="tt-pace-caret" aria-hidden />
                    </motion.div>
                </div>
            </div>
        </motion.div>
    )
}

interface WordAwareProps {
    runs: GraphemeRun[]
    wordStart: number[]
    wordEnd: number[]
    onCaret: (el: HTMLSpanElement | null) => void
    focused: boolean
    highlightMode: string
    blindMode: string
    hideExtraLetters: string
    caretStyle: string
    smoothCaret: string
    indicateTypos: string
    paceUnitIndex: number | null
}

const TextContent = memo(function TextContent({
    runs,
    wordStart,
    wordEnd,
    onCaret,
    focused,
    highlightMode,
    blindMode,
    hideExtraLetters,
    caretStyle,
    smoothCaret,
    indicateTypos,
    paceUnitIndex,
}: WordAwareProps) {
    return (
        <>
            {runs.map((g, i) => (
                <Char
                    key={g.index}
                    text={g.text}
                    graphemeIndex={g.index}
                    startUnit={g.startUnit}
                    endUnit={g.endUnit}
                    wordStart={wordStart[i]}
                    wordEnd={wordEnd[i]}
                    onCaret={onCaret}
                    focused={focused}
                    highlightMode={highlightMode}
                    blindMode={blindMode}
                    hideExtraLetters={hideExtraLetters}
                    caretStyle={caretStyle}
                    smoothCaret={smoothCaret}
                    indicateTypos={indicateTypos}
                    isPaceChar={paceUnitIndex !== null && g.startUnit <= paceUnitIndex && paceUnitIndex < g.endUnit}
                />
            ))}
        </>
    )
})

interface CharProps {
    text: string
    graphemeIndex: number
    startUnit: number
    endUnit: number
    wordStart: number
    wordEnd: number
    onCaret: (el: HTMLSpanElement | null) => void
    focused: boolean
    highlightMode: string
    blindMode: string
    hideExtraLetters: string
    caretStyle: string
    smoothCaret: string
    indicateTypos: string
    isPaceChar: boolean
}

const Char = memo(function Char({
    text,
    graphemeIndex,
    startUnit,
    endUnit,
    wordStart,
    wordEnd,
    onCaret,
    focused,
    highlightMode,
    blindMode,
    hideExtraLetters,
    caretStyle,
    smoothCaret,
    indicateTypos,
    isPaceChar,
}: CharProps) {
    const view = useTypingStore(
        useShallow((s) => {
            const unit = s.engine?.unitIndex ?? 0
            const incorrect = s.engine !== null && rangeHasIncorrect(s.engine, startUnit, endUnit)
            return graphemeViewState(unit, startUnit, endUnit, incorrect)
        }),
    )
    const flashing = useTypingStore((s) => flashIndexMatches(s.wrongFlash?.unitIndex, startUnit, endUnit))

    const slipKind = useTypingStore((s) => {
        const unit = s.engine?.unitIndex ?? 0
        const incorrect = s.engine !== null && rangeHasIncorrect(s.engine, startUnit, endUnit)
        if (graphemeCorrectness(unit, endUnit, incorrect) !== 'incorrect' || !s.engine) return null
        const d = s.engine.clusterDiagnosisFor(graphemeIndex)
        return d ? d.kind : null
    })

    const inCurrentWordUpcoming = useTypingStore((s) => {
        const unit = s.engine?.unitIndex ?? 0
        if (unit >= endUnit) return false
        return unit >= wordStart && unit < wordEnd
    })

    const pending = view.correctness === 'pending' && !view.isCurrent
    const hideBlind = blindMode === 'on' && pending
    const hideExtra = hideExtraLetters === 'on' && pending && !inCurrentWordUpcoming
    const hidden = hideBlind || hideExtra ? 'tt-char-blind' : null

    const font = containsMyanmar(text) ? 'font-myanmar' : 'font-heavy'

    const missClass = indicateTypos === 'replace' ? 'tt-char-miss tt-char-miss-replace' : 'tt-char-miss'

    const caretClass =
        caretStyle === 'block'
            ? 'tt-caret--block'
            : caretStyle === 'underline'
              ? 'tt-caret--underline'
              : caretStyle === 'line'
                ? 'tt-caret--line'
                : null
    const smoothClass =
        smoothCaret === 'slow'
            ? 'tt-caret--smooth-slow'
            : smoothCaret === 'fast'
              ? 'tt-caret--smooth-fast'
              : smoothCaret === 'medium'
                ? 'tt-caret--smooth-medium'
                : null

    if (view.isCurrent) {
        const isCaretAnchoredBar = caretClass !== 'tt-caret--block' && caretClass !== 'tt-caret--underline'
        return (
            <span
                ref={onCaret}
                data-pace-char={isPaceChar ? '' : undefined}
                className={cn(
                    'tt-char tt-char-now char-pop',
                    font,
                    flashing ? 'tt-char-flash' : highlightMode === 'none' ? null : 'tt-char-focus',
                    highlightMode === 'word' ? 'tt-word-now' : null,
                    focused ? '' : 'tt-char-dim',
                    hidden ?? undefined,
                )}
            >
                {text}
                {focused ? (
                    <span
                        aria-hidden
                        className={cn('tt-caret z-10', caretClass, smoothClass)}
                        style={isCaretAnchoredBar ? { left: `clamp(0px, ${view.progress * 100}%, calc(100% - var(--tt-caret-w)))` } : undefined}
                    />
                ) : null}
            </span>
        )
    }

    const visual = view.correctness
    const cls = cn(
        'tt-char',
        visual === 'correct'
            ? 'tt-char-ok'
            : visual === 'incorrect'
              ? cn(missClass, slipKind ? `tt-cl-slip tt-cl-slip--${slipKind}` : null)
              : 'tt-char-typed',
        font,
        hidden ?? undefined,
    )

    return (
        <span data-pace-char={isPaceChar ? '' : undefined} className={cls}>
            {text}
        </span>
    )
})

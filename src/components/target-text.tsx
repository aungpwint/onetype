import { memo, useCallback, useLayoutEffect, useMemo, useRef } from 'react'
import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion'
import { useShallow } from 'zustand/shallow'
import { useTypingStore } from '@/stores/typing-store'
import { resolveParagraphView, useUiStore } from '@/stores/ui-store'
import { useSettingsStore } from '@/stores/settings-store'
import { cn } from '@/lib/utils'
import { containsMyanmar } from '@/core/unicode/myanmar'
import { graphemeUnitRuns, type GraphemeRun, type GraphemeSlot } from '@/core/typing-engine/sequence'
import { graphemePresentation, rangeHasIncorrect, type UnitOutcomeQuery } from '@/core/typing-engine/char-state'
import { useParagraphWrap } from '@/hooks/use-paragraph-wrap'

const NO_OUTCOMES: UnitOutcomeQuery = { unitOutcomeAt: () => null }

const CARET_ANCHOR = 0.45
const CONTENT_INSET = 24
const WORDS_PER_MIN = 5

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
        highlightMode: useSettingsStore((s) => s.getEnum('practice.highlightMode', ['word', 'letter', 'none'] as const, 'word')),
        blindMode: useSettingsStore((s) => s.getEnum('practice.blindMode', ['on', 'off'] as const, 'off')),
        hideExtraLetters: useSettingsStore((s) => s.getEnum('practice.hideExtraLetters', ['on', 'off'] as const, 'off')),
        caretStyle: useSettingsStore((s) => s.getEnum('practice.caretStyle', ['bar', 'block', 'underline', 'line'] as const, 'bar')),
        smoothCaret: useSettingsStore((s) => s.getEnum('practice.smoothCaret', ['off', 'slow', 'medium', 'fast'] as const, 'medium')),
        paceCaret: useSettingsStore((s) => s.getEnum('practice.paceCaret', ['on', 'off'] as const, 'off')),
        indicateTypos: useSettingsStore((s) => s.getEnum('practice.indicateTypos', ['below', 'replace', 'off'] as const, 'below')),
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

    const levelAdvancedLesson = session?.kind === 'lesson' && session.resolved.level === 'advanced'

    // Lessons hand the header toggle through as an explicit display choice
    // (beginner always stays on a clean single line), while practice prose
    // (quotes / custom texts) keeps its built-in paragraph behaviour and the
    // rest falls back to the automatic length-driven layout.
    const paragraphView = useUiStore((s) => s.paragraphView)
    const paragraphMode = useMemo<boolean | null>(() => {
        if (!session) return null
        if (session.kind === 'lesson') {
            // 'auto' defaults to paragraph from the advanced level onward.
            return session.resolved.level === 'beginner' ? false : resolveParagraphView(paragraphView, session.resolved.level)
        }
        if (session.kind === 'practice') {
            // An explicit header toggle is authoritative for the whole run;
            // otherwise quote/text keep their built-in paragraph layout and
            // timed/word runs fall back to the length-driven single-line pan.
            if (paragraphView !== null) return paragraphView
            const unit = session.practice?.unit
            return unit === 'quote' || unit === 'text' ? true : null
        }
        return null
    }, [session, paragraphView])

    const { wrapMode } = useParagraphWrap({
        session,
        engine,
        paragraphMode,
        activePhase,
        sessionKey,
        activePhaseKey,
        viewportRef,
        contentRef,
    })

    useLayoutEffect(() => {
        if (wrapMode) return
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
    }, [sessionKey, activePhaseKey, unitIndex, motionOffset, wrapMode])

    const wrapScrollKey = wrapMode ? `${sessionKey ?? ''}|${activePhaseKey ?? ''}` : null
    const previousScrollKeyRef = useRef<string | null>(null)
    const verticalFollowRef = useRef({ raf: 0 })

    const stopVerticalFollow = useCallback(() => {
        const state = verticalFollowRef.current
        if (state.raf !== 0) {
            cancelAnimationFrame(state.raf)
            state.raf = 0
        }
    }, [])

    useLayoutEffect(() => stopVerticalFollow, [stopVerticalFollow])

    useLayoutEffect(() => {
        const viewport = viewportRef.current
        if (!viewport) return
        if (!wrapMode) {
            previousScrollKeyRef.current = null
            stopVerticalFollow()
            viewport.scrollTop = 0
            return
        }
        if (previousScrollKeyRef.current !== wrapScrollKey) {
            previousScrollKeyRef.current = wrapScrollKey
            stopVerticalFollow()
            viewport.scrollTop = 0
            return
        }
        const caret = caretRef.current
        if (!caret) return
        const caretRect = caret.getBoundingClientRect()
        if (caretRect.width === 0) return
        const viewportRect = viewport.getBoundingClientRect()
        const caretCenter = caretRect.top + caretRect.height / 2 - viewportRect.top
        const targetCenter = viewportRect.height * CARET_ANCHOR
        const delta = caretCenter - targetCenter
        if (Math.abs(delta) < 0.5) {
            stopVerticalFollow()
            return
        }
        const maxScroll = Math.max(0, viewport.scrollHeight - viewport.clientHeight)
        const target = Math.min(maxScroll, Math.max(0, viewport.scrollTop + delta))
        const from = viewport.scrollTop
        if (Math.abs(target - from) < 1) return

        if (reducedMotion) {
            viewport.scrollTop = target
            stopVerticalFollow()
            return
        }

        // Glide the caret back to its anchor over a beat instead of snapping:
        // line-tracked text stays calm while reading ahead down the paragraph.
        const state = verticalFollowRef.current
        if (state.raf !== 0) cancelAnimationFrame(state.raf)
        const start = performance.now()
        const duration = 200
        const easeOut = (t: number) => 1 - Math.pow(1 - t, 4)
        const step = (now: number) => {
            const t = Math.min(1, (now - start) / duration)
            viewport.scrollTop = from + (target - from) * easeOut(t)
            state.raf = t < 1 ? requestAnimationFrame(step) : 0
        }
        state.raf = requestAnimationFrame(step)
    }, [wrapMode, wrapScrollKey, unitIndex, reducedMotion, stopVerticalFollow])

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

    // Derived wrap layout, hoisted so the render reads as a flat declaration.
    // Long prose (advanced quote/custom-text practice, e.g. the complex-
    // sentence lines) flips the target to a wrapped paragraph column; short
    // drills stay a single panned line.
    const viewportWrapStyle = wrapMode ? { maxHeight: '60vh' } : undefined
    const contentWrapClass = wrapMode ? 'tt-content--paragraph' : null
    const contentWrapOffset = wrapMode ? 0 : springOffset
    const targetLayoutClass = wrapMode ? 'tt-target--paragraph' : 'whitespace-nowrap'
    const targetQuoteClass = wrapMode && levelAdvancedLesson ? 'tt-target--quote' : null
    const targetFocusClass = windowFocused ? '' : 'tt-blurred'

    return (
        <motion.div
            className="mx-auto w-full max-w-5xl pb-4"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
        >
            <div className="tt-container">
                <div ref={viewportRef} className="tt-viewport" style={viewportWrapStyle}>
                    <motion.div ref={contentRef} className={cn('tt-content', contentWrapClass)} style={{ x: contentWrapOffset }}>
                        <motion.p
                            key={activePhaseKey ?? 'all'}
                            className={cn('tt-target mx-auto', targetLayoutClass, targetQuoteClass, targetFocusClass)}
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
                    slots={g.slots}
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
    slots: GraphemeSlot[]
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
    slots,
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
            const engine = s.engine
            return graphemePresentation(engine?.unitIndex ?? 0, startUnit, slots, engine ?? NO_OUTCOMES)
        }),
    )
    const flashing = useTypingStore((s) => s.wrongFlash !== null && s.wrongFlash.unitIndex === (s.engine?.unitIndex ?? 0))

    const slipKind = useTypingStore((s) => {
        const engine = s.engine
        if (!engine) return null
        // Committed slips only: a partial/composing grapheme has no verdict.
        if (engine.unitIndex < endUnit) return null
        if (!rangeHasIncorrect(engine, startUnit, endUnit)) return null
        const d = engine.clusterDiagnosisFor(graphemeIndex)
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

    const font = containsMyanmar(text) ? 'font-myanmar' : undefined

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
        // myantyper-style two-layer reveal. The syllable is shaped once as a
        // composed dim ground layer (correct joined Myanmar), and a green
        // overlay is drawn on top containing ONLY the typed prefix. A partial
        // prefix shapes the same way as the composed whole for typical
        // syllables, so every key press turns exactly its letter green at the
        // moment of the keystroke — no per-unit boxes (spaced-out marks), no
        // first-box colour bleed, no overlay misalignment.
        const activeInk = highlightMode === 'word' || highlightMode === 'letter' ? 'tt-char-focus' : null
        const typedText = (view.slots ?? [])
            .filter((slot) => slot.completed)
            .map((slot) => slot.text)
            .join('')
        const spanCount = Math.max(1, endUnit - startUnit)
        const slotWidth = `${100 / spanCount}%`
        const barAnchored = caretClass !== 'tt-caret--block' && caretClass !== 'tt-caret--underline'
        return (
            <span
                ref={onCaret}
                data-pace-char={isPaceChar ? '' : undefined}
                className={cn(
                    'tt-char tt-char-now char-pop',
                    activeInk,
                    flashing ? 'tt-char-flash' : null,
                    font,
                    focused ? '' : 'tt-char-dim',
                    hidden ?? undefined,
                )}
            >
                <span className="tt-char-ground">{text}</span>
                {typedText ? (
                    <span aria-hidden className="tt-char-progress">
                        <span>{typedText}</span>
                    </span>
                ) : null}
                {focused ? (
                    <span
                        aria-hidden
                        className={cn('tt-caret z-10', caretClass, smoothClass)}
                        style={
                            barAnchored
                                ? {
                                      left: `clamp(0px, ${view.progress * 100}%, calc(100% - var(--tt-caret-w)))`,
                                  }
                                : {
                                      left: `clamp(0px, ${view.progress * 100}%, calc(100% - ${slotWidth}))`,
                                      width: slotWidth,
                                  }
                        }
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

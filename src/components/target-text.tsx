import { memo, useCallback, useLayoutEffect, useMemo, useRef } from 'react'
import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion'
import { useTypingStore } from '@/stores/typing-store'
import { cn } from '@/lib/utils'
import { containsMyanmar } from '@/core/unicode/myanmar'
import { graphemeUnitRuns, type GraphemeRun } from '@/core/typing-engine/sequence'
import { CHAR_CORRECT, CHAR_INCORRECT, clusterPhaseCode, flashIndexMatches, rangeHasIncorrect } from '@/core/typing-engine/char-state'

const CARET_ANCHOR = 0.45
const CONTENT_INSET = 24

export function TargetText() {
    const session = useTypingStore((s) => s.session)
    const engine = useTypingStore((s) => s.engine)
    const reducedMotion = useReducedMotion()

    const viewportRef = useRef<HTMLDivElement | null>(null)
    const contentRef = useRef<HTMLDivElement | null>(null)
    const caretRef = useRef<HTMLSpanElement | null>(null)

    const unitIndex = useTypingStore((s) => s.engine?.unitIndex ?? 0)
    const sequence = engine?.sequence
    const phases = useMemo(() => session?.resolved.phases ?? [], [session])

    const activePhase = useMemo(() => {
        if (phases.length === 0) return null
        const index = phases.findIndex((p) => unitIndex >= p.startUnit && unitIndex < p.endUnit)

        return phases[index === -1 ? phases.length - 1 : index]
    }, [phases, unitIndex])

    const activePhaseKey = activePhase ? `${activePhase.label}-${activePhase.startUnit}` : null

    // The run list is stable across keystrokes within a phase (its memo output is
    // re-used while `activePhase` keeps its identity), so TextContent can bail out
    // completely on every caret advance instead of re-creating every char.
    const runs = useMemo(() => {
        const all = sequence ? graphemeUnitRuns(sequence) : []
        if (!activePhase) return all
        return all.filter((g) => g.startUnit >= activePhase.startUnit && g.endUnit <= activePhase.endUnit)
    }, [sequence, activePhase])

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
                            className="mx-auto text-4xl leading-tight tracking-normal whitespace-nowrap md:text-5xl"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.22, ease: 'easeOut' }}
                        >
                            <TextContent runs={runs} onCaret={onCaretRef} />
                        </motion.p>
                    </motion.div>
                </div>
            </div>
        </motion.div>
    )
}

const TextContent = memo(function TextContent({ runs, onCaret }: { runs: GraphemeRun[]; onCaret: (el: HTMLSpanElement | null) => void }) {
    return (
        <>
            {runs.map((g) => (
                <Char
                    key={g.index}
                    text={g.text}
                    graphemeIndex={g.index}
                    startUnit={g.startUnit}
                    endUnit={g.endUnit}
                    onCaret={onCaret}
                />
            ))}
        </>
    )
})

const Char = memo(function Char({
    text,
    graphemeIndex,
    startUnit,
    endUnit,
    onCaret,
}: {
    text: string
    graphemeIndex: number
    startUnit: number
    endUnit: number
    onCaret: (el: HTMLSpanElement | null) => void
}) {
    // Each component reads its own presentation state straight from the store as
    // a single primitive. Only the few clusters around the caret change between
    // keystrokes, so only those components re-render (React compares selector
    // snapshots by identity).
    const phase = useTypingStore((s) => {
        const engine = s.engine
        const unit = engine?.unitIndex ?? 0
        if (unit >= endUnit) {
            if (engine && rangeHasIncorrect(engine, startUnit, endUnit)) return CHAR_INCORRECT
            return CHAR_CORRECT
        }
        return clusterPhaseCode(unit, startUnit, endUnit)
    })
    const flashing = useTypingStore((s) => flashIndexMatches(s.wrongFlash?.unitIndex, startUnit, endUnit))
    const slipKind = useTypingStore((s) => {
        if (phase === CHAR_INCORRECT && s.engine) {
            const d = s.engine.clusterDiagnosisFor(graphemeIndex)
            return d ? d.kind : null
        }
        return null
    })

    const font = containsMyanmar(text) ? 'font-myanmar' : 'font-heavy'

    if (phase >= 1 && phase < 2) {
        const progress = phase - 1
        return (
            <span ref={onCaret} className={cn('tt-char tt-char-now char-pop', font, flashing ? 'tt-char-flash' : 'tt-char-focus')}>
                {text}
                <span aria-hidden className="tt-caret z-10" style={{ left: `clamp(0px, ${progress * 100}%, calc(100% - var(--tt-caret-w)))` }} />
            </span>
        )
    }

    const visual = phase === CHAR_INCORRECT ? 'incorrect' : phase === CHAR_CORRECT ? 'correct' : 'pending'
    const cls = cn(
        'tt-char',
        visual === 'correct' ? 'tt-char-ok' : visual === 'incorrect' ? cn('tt-char-miss', slipKind ? `tt-cl-slip tt-cl-slip--${slipKind}` : null) : 'tt-char-typed',
        font,
    )

    return <span className={cls}>{text}</span>
})
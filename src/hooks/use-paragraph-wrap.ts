import { useLayoutEffect, useMemo, useState } from 'react'
import type { RefObject } from 'react'
import type { TypingEngine } from '@/core/typing-engine/engine'

// A phase stays on a single panned line until it would overflow this many
// viewport widths. Drills (keys/words/short sentences) keep their clean,
// distinct single line; only genuinely long prose adopts the paragraph wrap.
export const WRAP_OVERFLOW_FACTOR = 2

interface ParagraphWrapInput {
    session: { kind: string } | null | undefined
    engine: TypingEngine | null | undefined
    paragraphMode: boolean
    activePhase: { text: string } | null | undefined
    sessionKey: string | null
    activePhaseKey: string | null
    viewportRef: RefObject<HTMLDivElement | null>
    contentRef: RefObject<HTMLDivElement | null>
}

/**
 * Decides whether the active phase should be rendered as wrapped paragraphs
 * (soft-wrapped across lines, read top-to-bottom) rather than a single
 * horizontally-panned line.
 *
 * - Practice prose (quotes / long texts) and phases whose text already
 *   contains a newline always adopt the paragraph wrap.
 * - Everything else (drills and short sentences) keeps its clean single line
 *   unless it would overflow the viewport by WRAP_OVERFLOW_FACTOR.
 */
export function useParagraphWrap({
    session,
    engine,
    paragraphMode,
    activePhase,
    sessionKey,
    activePhaseKey,
    viewportRef,
    contentRef,
}: ParagraphWrapInput): { wrapMode: boolean } {
    const wrapPhaseIsProse = useMemo(() => {
        if (paragraphMode) return true
        return Boolean(activePhase?.text.includes('\n'))
    }, [paragraphMode, activePhase])

    const wrapMeasureKey = engine && session && !wrapPhaseIsProse ? `${sessionKey ?? ''}|${activePhaseKey ?? 'all'}` : null

    const [wrapMeasured, setWrapMeasured] = useState<{ key: string; long: boolean } | null>(null)

    useLayoutEffect(() => {
        // Only measure a phase once, and only when it's not already prose.
        // There is no reset branch: a null wrapMeasureKey simply leaves the
        // last measurement unused, since wrapMode gates on a live key match.
        if (!wrapMeasureKey) return
        if (wrapMeasured?.key === wrapMeasureKey) return
        const viewport = viewportRef.current
        const content = contentRef.current
        if (!viewport || !content) return
        const lineWidth = content.scrollWidth
        const viewportWidth = viewport.clientWidth
        const isLong = lineWidth > viewportWidth * WRAP_OVERFLOW_FACTOR
        setWrapMeasured({ key: wrapMeasureKey, long: isLong })
    }, [wrapMeasureKey, wrapMeasured, viewportRef, contentRef])

    const wrapMode = wrapPhaseIsProse || (wrapMeasured?.key === wrapMeasureKey && wrapMeasured.long)

    return { wrapMode }
}

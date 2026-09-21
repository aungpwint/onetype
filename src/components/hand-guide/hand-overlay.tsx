import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Hand } from '@/types'
import { TYPING_CLUB_VIEWBOX, typingClubHandSvg } from './hand-assets'
import { handForFinger, fingerForCodeOrNull as resolveFinger } from '@/core/finger-mapping/finger-map'
import { computeHandLayout, type KeyAnchor, type KeyboardGeometry, type HandLayout } from './hand-geometry'

interface HandOverlayProps {
    layout: {
        rows: { code: string; width?: number }[][]
    }
    activeKey?: string | null
    shiftKey?: string | null
    isActive?: boolean
    children?: ReactNode
}

const REFERENCE_HAND_ANCHORS = {
    left: { x: 243, y: 228.4 },
    right: { x: 342, y: 228.4 },
    pitch: 99,
    scale: 0.9,
    leftOffsetX: -40,
    offsetY: -5,
}

const KEY_GROUPS: Record<string, string> = {
    Backquote: 'tilda',
    Digit1: 'key-1',
    Digit2: 'key-2',
    Digit3: 'key-3',
    Digit4: 'key-4',
    Digit5: 'key-5',
    Digit6: 'key-6',
    Digit7: 'key-7',
    Digit8: 'key-8',
    Digit9: 'key-9',
    Digit0: 'key-0',
    Minus: 'minus',
    Equal: 'equal',
    Tab: 'tab',
    KeyQ: 'q',
    KeyW: 'w',
    KeyE: 'e',
    KeyR: 'r',
    KeyT: 't',
    KeyY: 'y',
    KeyU: 'u',
    KeyI: 'i',
    KeyO: 'o',
    KeyP: 'p',
    BracketLeft: 'open-bracket',
    BracketRight: 'close-bracket',
    Backslash: 'backslash',
    KeyA: 'a',
    KeyS: 's',
    KeyD: 'd',
    KeyF: 'f',
    KeyG: 'g',
    KeyH: 'h',
    KeyJ: 'j',
    KeyK: 'k',
    KeyL: 'l',
    Semicolon: 'semicolon',
    Quote: 'quote',
    Enter: 'enter',
    KeyZ: 'z',
    KeyX: 'x',
    KeyC: 'c',
    KeyV: 'v',
    KeyB: 'b',
    KeyN: 'n',
    KeyM: 'm',
    Comma: 'comma',
    Period: 'dot',
    Slash: 'slash',
    Space: 'space',
}

function visibleGroups(hand: Hand, activeKey: string | null | undefined, shiftKey: string | null | undefined): Set<string> {
    const neutralId = hand === 'left' ? 'neutral-left' : 'neutral-right'
    const groups = new Set<string>()
    const keyGroup = activeKey ? KEY_GROUPS[activeKey] : undefined
    // The sprite draws the space-bar press with the right thumb, so the pose is
    // owned by the right hand even though the finger mapping resolves to left.
    const keyHand: Hand | null = activeKey
        ? activeKey === 'Space'
            ? 'right'
            : handForFinger(resolveFinger(activeKey) ?? 'left-pinky')
        : null
    if (keyGroup && keyHand === hand) groups.add(keyGroup)
    if (shiftKey === 'ShiftLeft' && hand === 'left') groups.add('shift-left')
    if (shiftKey === 'ShiftRight' && hand === 'right') groups.add('shift-right')
    if (groups.size === 0) groups.add(neutralId)
    return groups
}

export function HandOverlay({ layout, activeKey, shiftKey, isActive = true, children }: HandOverlayProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [geometry, setGeometry] = useState<{
        kb: KeyboardGeometry
        anchors: Map<string, KeyAnchor>
    } | null>(null)

    const measure = useCallback(() => {
        const container = containerRef.current
        if (!container) return
        const rootEl = container.closest('[data-keyboard-root]')
        const cRect = container.getBoundingClientRect()
        const root = rootEl?.getBoundingClientRect() ?? cRect

        const kb: KeyboardGeometry = {
            x: root.left - cRect.left,
            y: root.top - cRect.top,
            width: root.width,
            height: root.height,
        }

        const anchors = new Map<string, KeyAnchor>()
        container.querySelectorAll<HTMLElement>('[data-key]').forEach((el) => {
            const code = el.dataset.key
            if (!code) return
            const r = el.getBoundingClientRect()
            anchors.set(code, {
                code,
                x: r.left - cRect.left - kb.x + r.width / 2,
                y: r.top - cRect.top - kb.y + r.height / 2,
                width: r.width / kb.width,
                height: r.height / kb.height,
            })
        })

        setGeometry({ kb, anchors })
    }, [])

    useEffect(() => {
        measure()
        const raf = requestAnimationFrame(measure)
        return () => cancelAnimationFrame(raf)
    }, [layout, measure])

    useEffect(() => {
        const root = containerRef.current?.closest('[data-keyboard-root]')
        if (!root) return

        let scheduled = false
        const schedule = () => {
            if (scheduled) return
            scheduled = true
            requestAnimationFrame(() => {
                scheduled = false
                measure()
            })
        }

        const observer = new ResizeObserver(schedule)
        observer.observe(root)
        window.addEventListener('resize', schedule)
        return () => {
            observer.disconnect()
            window.removeEventListener('resize', schedule)
        }
    }, [measure])

    const handLayout = useMemo<HandLayout | null>(() => (geometry ? computeHandLayout(geometry.anchors) : null), [geometry])

    if (!handLayout) {
        return (
            <div ref={containerRef} className="hand-overlay-container">
                {children}
            </div>
        )
    }

    const spriteScale = (((geometry!.anchors.get('KeyJ')?.x ?? 0) - (geometry!.anchors.get('KeyF')?.x ?? 99)) / 99) * REFERENCE_HAND_ANCHORS.scale
    const leftPos = {
        x:
            geometry!.kb.x +
            (geometry!.anchors.get('KeyF')?.x ?? 0) -
            REFERENCE_HAND_ANCHORS.left.x * spriteScale +
            REFERENCE_HAND_ANCHORS.leftOffsetX,
        y:
            geometry!.kb.y +
            (geometry!.anchors.get('KeyF')?.y ?? 0) -
            REFERENCE_HAND_ANCHORS.left.y * spriteScale +
            REFERENCE_HAND_ANCHORS.pitch +
            REFERENCE_HAND_ANCHORS.offsetY,
    }
    const rightPos = {
        x: geometry!.kb.x + (geometry!.anchors.get('KeyJ')?.x ?? 0) - REFERENCE_HAND_ANCHORS.right.x * spriteScale,
        y:
            geometry!.kb.y +
            (geometry!.anchors.get('KeyJ')?.y ?? 0) -
            REFERENCE_HAND_ANCHORS.right.y * spriteScale +
            REFERENCE_HAND_ANCHORS.pitch +
            REFERENCE_HAND_ANCHORS.offsetY,
    }
    const leftGroups = visibleGroups('left', isActive ? activeKey : null, isActive ? shiftKey : null)
    const rightGroups = visibleGroups('right', isActive ? activeKey : null, isActive ? shiftKey : null)
    const leftSvg = typingClubHandSvg('left', leftGroups)
    const rightSvg = typingClubHandSvg('right', rightGroups)

    return (
        <div ref={containerRef} className="hand-overlay-container">
            <div className="hand-overlay-keyboard">{children}</div>

            <div
                key={`left-${[...leftGroups].sort().join(',')}`}
                className="hand-overlay-hand hand-overlay-left"
                style={{
                    width: TYPING_CLUB_VIEWBOX.width * spriteScale,
                    height: TYPING_CLUB_VIEWBOX.height * spriteScale,
                    transform: `translate(${leftPos.x}px, ${leftPos.y}px)`,
                    transformOrigin: '0 0',
                }}
                aria-hidden
                dangerouslySetInnerHTML={{ __html: leftSvg }}
            />
            <div
                key={`right-${[...rightGroups].sort().join(',')}`}
                className="hand-overlay-hand hand-overlay-right"
                style={{
                    width: TYPING_CLUB_VIEWBOX.width * spriteScale,
                    height: TYPING_CLUB_VIEWBOX.height * spriteScale,
                    transform: `translate(${rightPos.x}px, ${rightPos.y}px)`,
                    transformOrigin: '0 0',
                }}
                aria-hidden
                dangerouslySetInnerHTML={{ __html: rightSvg }}
            />
        </div>
    )
}

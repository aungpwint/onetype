import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Hand } from '@/types'
import { POSE_PADS, poseHand, TYPING_CLUB_VIEWBOX, typingClubHandSprite } from './hand-assets'
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

// Placement of the Typing Club sprite relative to the measured keyboard.
// The sprite's own home-row finger pads and key pitch were recovered from the
// artwork (typing-club-hands.svg): left index pad (f pose) at (261.7, 160.4),
// right index pad (j pose) at (355.5, 157.0), average home-row pitch 29.5u.
// Anchoring those pads on the real KeyF/KeyJ centres and scaling to the DOM
// gap between them keeps every home-row key aligned and both hands symmetric.
const SPRITE_INDEX_ANCHOR = {
    left: { x: 261.7, y: 160.4 },
    right: { x: 355.5, y: 157.0 },
}
const SPRITE_KEY_PITCH = 29.5

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

/** Reverse of KEY_GROUPS: pose id -> the key it targets (those with pads). */
const POSE_TO_KEY: Record<string, string> = Object.fromEntries(
    Object.entries(KEY_GROUPS).map(([code, pose]) => [pose, code]),
)

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

/** Reveal the visible pose groups inside a mounted hand sprite and crossfade
 *  the newly shown pose (reusing the pose-in easing) while hiding the rest.
 *  Sprites are mounted once per hand, so rapid keystrokes only flip a couple
 *  of `display` styles instead of re-parsing the artwork.
 *
 *  `transforms` carries the per-pose pad corrections computed from the measured
 *  keyboard: each pose's artwork shifts so its pressed pad sits dead-centre on
 *  the real key, fixing the fixed vertical/horizontal offset baked into the
 *  sprite drawing (e.g. the Tab reach landing low). */
function revealPoses(
    root: HTMLElement | null,
    visible: ReadonlySet<string>,
    transforms: ReadonlyMap<string, { x: number; y: number }> | null,
): void {
    if (!root) return
    const reduced =
        typeof window !== 'undefined' && typeof window.matchMedia === 'function'
            ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
            : false
    for (const el of root.querySelectorAll<SVGGElement>('[data-hand-pose]')) {
        const id = el.dataset.handPose ?? ''
        const moved = transforms?.get(id)
        el.style.transform = moved ? `translate(${moved.x}px, ${moved.y}px)` : ''
        const show = visible.has(id)
        if (show) {
            if (el.style.display === 'none') {
                el.style.opacity = '0'
                el.style.transition = reduced ? 'none' : 'opacity 150ms ease-out'
                el.style.display = 'block'
                requestAnimationFrame(() => {
                    if (el.isConnected && el.style.display === 'block') el.style.opacity = '1'
                })
            }
        } else if (el.style.display !== 'none') {
            el.style.transition = 'none'
            el.style.opacity = '1'
            el.style.display = 'none'
        }
    }
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

    const leftGroups = useMemo(
        () => visibleGroups('left', isActive ? activeKey : null, isActive ? shiftKey : null),
        [isActive, activeKey, shiftKey],
    )
    const rightGroups = useMemo(
        () => visibleGroups('right', isActive ? activeKey : null, isActive ? shiftKey : null),
        [isActive, activeKey, shiftKey],
    )
    const poseTransforms = useMemo(() => {
        const transforms = new Map<string, { x: number; y: number }>()
        if (!geometry) return transforms
        const scale =
            ((geometry.anchors.get('KeyJ')?.x ?? 0) - (geometry.anchors.get('KeyF')?.x ?? 0)) / (3 * SPRITE_KEY_PITCH)
        for (const [pose, pad] of Object.entries(POSE_PADS)) {
            const hand = poseHand(pose)
            const code = POSE_TO_KEY[pose]
            if (!hand || !code || !pad) continue
            const key = geometry.anchors.get(code)
            const host = geometry.anchors.get(hand === 'left' ? 'KeyF' : 'KeyJ')
            if (!key || !host) continue
            const anchor = SPRITE_INDEX_ANCHOR[hand]
            // Correction that lands the pose's pad on the real key centre. The
            // measurement is in DOM px but group transforms live in the sprite's
            // viewBox units (scale px each), so the pixel delta is divided by
            // `scale` — e.g. the Tab reach is lifted by ~13px / scale ~= 5 units.
            transforms.set(pose, {
                x: (key.x - host.x) / scale - (pad.x - anchor.x),
                y: (key.y - host.y) / scale - (pad.y - anchor.y),
            })
        }
        return transforms
    }, [geometry])
    const leftSprite = useMemo(() => typingClubHandSprite('left'), [])
    const rightSprite = useMemo(() => typingClubHandSprite('right'), [])
    const leftRef = useRef<HTMLDivElement>(null)
    const rightRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        revealPoses(leftRef.current, leftGroups, poseTransforms)
    }, [leftGroups, poseTransforms])
    useEffect(() => {
        revealPoses(rightRef.current, rightGroups, poseTransforms)
    }, [rightGroups, poseTransforms])

    if (!handLayout) {
        return (
            <div ref={containerRef} className="hand-overlay-container">
                {children}
            </div>
        )
    }

    const spriteScale = ((geometry!.anchors.get('KeyJ')?.x ?? 0) - (geometry!.anchors.get('KeyF')?.x ?? 0)) / (3 * SPRITE_KEY_PITCH)
    const leftPos = {
        x: geometry!.kb.x + (geometry!.anchors.get('KeyF')?.x ?? 0) - SPRITE_INDEX_ANCHOR.left.x * spriteScale,
        y: geometry!.kb.y + (geometry!.anchors.get('KeyF')?.y ?? 0) - SPRITE_INDEX_ANCHOR.left.y * spriteScale,
    }
    const rightPos = {
        x: geometry!.kb.x + (geometry!.anchors.get('KeyJ')?.x ?? 0) - SPRITE_INDEX_ANCHOR.right.x * spriteScale,
        y: geometry!.kb.y + (geometry!.anchors.get('KeyJ')?.y ?? 0) - SPRITE_INDEX_ANCHOR.right.y * spriteScale,
    }

    return (
        <div ref={containerRef} className="hand-overlay-container">
            <div className="hand-overlay-keyboard">{children}</div>

            <div
                className="hand-overlay-hand hand-overlay-left"
                ref={leftRef}
                style={{
                    width: TYPING_CLUB_VIEWBOX.width * spriteScale,
                    height: TYPING_CLUB_VIEWBOX.height * spriteScale,
                    transform: `translate(${leftPos.x}px, ${leftPos.y}px)`,
                    transformOrigin: '0 0',
                }}
                aria-hidden
                dangerouslySetInnerHTML={{ __html: leftSprite }}
            />
            <div
                className="hand-overlay-hand hand-overlay-right"
                ref={rightRef}
                style={{
                    width: TYPING_CLUB_VIEWBOX.width * spriteScale,
                    height: TYPING_CLUB_VIEWBOX.height * spriteScale,
                    transform: `translate(${rightPos.x}px, ${rightPos.y}px)`,
                    transformOrigin: '0 0',
                }}
                aria-hidden
                dangerouslySetInnerHTML={{ __html: rightSprite }}
            />
        </div>
    )
}

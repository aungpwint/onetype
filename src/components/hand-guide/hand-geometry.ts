import type { FingerId, Hand } from '@/types'

export interface Vec2 {
    x: number
    y: number
}

export interface KeyboardGeometry extends Vec2 {
    width: number
    height: number
}

export interface KeyAnchor extends Vec2 {
    code: string
    width: number
    height: number
}

export interface HandGeometry {
    view: { w: number; h: number; minX: number; minY: number }
    pitch: number
    index: Vec2
    tips: Partial<Record<FingerId, Vec2>>
    bases: Partial<Record<FingerId, Vec2>>
    artBounds: { minX: number; maxX: number }
}

export interface HandPlacement {
    x: number
    y: number
    scale: number
}

export interface HandLayout {
    left: HandPlacement
    right: HandPlacement
    axisX: number
    homeRowY: number
    pitchPx: number
}

const SHARED = {
    w: 185,
    h: 250,
    minY: 136,
    pitch: 25.6667,
}

const BAND = { x0: 40, x1: 145 }

export const LEFT_GEOMETRY: HandGeometry = {
    view: { w: SHARED.w, h: SHARED.h, minX: 120, minY: SHARED.minY },
    pitch: SHARED.pitch,
    index: { x: 131.6, y: 10.1 },
    tips: {
        'left-pinky': { x: 54.6, y: 15.9 },
        'left-ring': { x: 80.27, y: 9.9 },
        'left-middle': { x: 105.93, y: 7.1 },
        'left-index': { x: 131.6, y: 10.1 },
        'left-thumb': { x: 172.6, y: 69.2 },
    },
    bases: {
        'left-pinky': { x: 58, y: 88 },
        'left-ring': { x: 72.4, y: 104.5 },
        'left-middle': { x: 107.5, y: 113.9 },
        'left-index': { x: 148, y: 92.4 },
        'left-thumb': { x: 146.4, y: 168.2 },
    },
    artBounds: { minX: BAND.x0, maxX: BAND.x1 },
}

export const RIGHT_GEOMETRY: HandGeometry = {
    view: { w: SHARED.w, h: SHARED.h, minX: 305, minY: SHARED.minY },
    pitch: SHARED.pitch,
    index: { x: 53.4, y: 10.1 },
    tips: {
        'right-pinky': { x: 130.4, y: 15.9 },
        'right-ring': { x: 104.73, y: 9.9 },
        'right-middle': { x: 79.07, y: 7.1 },
        'right-index': { x: 53.4, y: 10.1 },
        'right-thumb': { x: 12.4, y: 69.2 },
    },
    bases: {
        'right-pinky': { x: 127, y: 88 },
        'right-ring': { x: 112.6, y: 104.5 },
        'right-middle': { x: 77.5, y: 113.9 },
        'right-index': { x: 37, y: 92.4 },
        'right-thumb': { x: 38.6, y: 168.2 },
    },
    artBounds: { minX: BAND.x0, maxX: BAND.x1 },
}

export function keyboardToPixel(kb: KeyboardGeometry, point: Vec2): Vec2 {
    return { x: kb.x + point.x, y: kb.y + point.y }
}

export function handToKeyboard(place: HandPlacement, local: Vec2): Vec2 {
    return {
        x: place.x + local.x * place.scale,
        y: place.y + local.y * place.scale,
    }
}

export function fingerRest(place: HandPlacement, geom: HandGeometry, finger: FingerId): Vec2 {
    return handToKeyboard(place, geom.tips[finger] ?? geom.index)
}

export function computeHandLayout(anchors: ReadonlyMap<string, KeyAnchor>): HandLayout | null {
    const a = anchors.get('KeyA')
    const f = anchors.get('KeyF')
    const j = anchors.get('KeyJ')
    const semi = anchors.get('Semicolon')
    if (!a || !f || !j) return null

    const leftPitchPx = Math.max(1, (f.x - a.x) / 3)
    const rightPitchPx = semi ? Math.max(1, (semi.x - j.x) / 3) : leftPitchPx

    const axisX = (f.x + j.x) / 2
    const homeRowY = (f.y + j.y) / 2

    const leftScale = Math.max(0.1, leftPitchPx / LEFT_GEOMETRY.pitch)
    const rightScale = Math.max(0.1, rightPitchPx / RIGHT_GEOMETRY.pitch)

    const leftOffset = axisX - f.x + LEFT_GEOMETRY.index.x * leftScale
    const left: HandPlacement = {
        x: axisX - leftOffset,
        y: homeRowY - LEFT_GEOMETRY.index.y * leftScale,
        scale: leftScale,
    }

    const right: HandPlacement = {
        x: 2 * axisX - (left.x + LEFT_GEOMETRY.view.w * leftScale),
        y: homeRowY - RIGHT_GEOMETRY.index.y * rightScale,
        scale: rightScale,
    }

    return { left, right, axisX, homeRowY, pitchPx: (leftPitchPx + rightPitchPx) / 2 }
}

export function handArtExtent(place: HandPlacement, geom: HandGeometry) {
    return {
        left: place.x + geom.artBounds.minX * place.scale,
        right: place.x + geom.artBounds.maxX * place.scale,
    }
}

export interface LayoutDiagnostics {
    keyboardWidthPx: number
    axisX: number
    leftAnchor: HandPlacement
    rightAnchor: HandPlacement
    leftArt: { left: number; right: number }
    rightArt: { left: number; right: number }
    axisClearancePx: number
}

export function inspectHandLayout(layout: HandLayout, kb: KeyboardGeometry): LayoutDiagnostics {
    const leftArt = handArtExtent(layout.left, LEFT_GEOMETRY)
    const rightArt = handArtExtent(layout.right, RIGHT_GEOMETRY)
    return {
        keyboardWidthPx: kb.width,
        axisX: layout.axisX,
        leftAnchor: layout.left,
        rightAnchor: layout.right,
        leftArt,
        rightArt,
        axisClearancePx: rightArt.left - leftArt.right,
    }
}

export function validateHandLayout(layout: HandLayout, kb: KeyboardGeometry): boolean {
    const d = inspectHandLayout(layout, kb)
    const clear = d.axisClearancePx >= 0
    if (!clear && typeof console !== 'undefined') {
        console.warn(
            '[hand-guide] Hand finger bands overlap at the keyboard axis. Inspect the coordinate mapping:\n' +
                `  keyboard width ${d.keyboardWidthPx.toFixed(1)}px, axis ${d.axisX.toFixed(1)}\n` +
                `  left  anchor (${d.leftAnchor.x.toFixed(1)}, ${d.leftAnchor.y.toFixed(1)}) scale ${d.leftAnchor.scale.toFixed(3)}\n` +
                `  right anchor (${d.rightAnchor.x.toFixed(1)}, ${d.rightAnchor.y.toFixed(1)}) scale ${d.rightAnchor.scale.toFixed(3)}\n` +
                `  left  band x[${d.leftArt.left.toFixed(1)}, ${d.leftArt.right.toFixed(1)}]\n` +
                `  right band x[${d.rightArt.left.toFixed(1)}, ${d.rightArt.right.toFixed(1)}]\n` +
                `  axis clearance ${d.axisClearancePx.toFixed(1)}px`,
        )
    }
    return clear
}

export function fingerAnchors(geom: HandGeometry): Set<[FingerId, Vec2]> {
    const out = new Set<[FingerId, Vec2]>()
    for (const id of Object.keys(geom.tips) as FingerId[]) {
        out.add([id, geom.tips[id] as Vec2])
    }
    return out
}

export const HAND_WIDTH = SHARED.w

export function mirrorHandLocalX(point: Vec2): Vec2 {
    return { x: HAND_WIDTH - point.x, y: point.y }
}

export interface FingerGeometry {
    hand: Hand
    finger: FingerId
    tip: Vec2
    base: Vec2
    length: number
}

export function fingerGeometry(hand: Hand, geom: HandGeometry, finger: FingerId): FingerGeometry {
    const tip = geom.tips[finger] ?? geom.index
    const base = geom.bases[finger] ?? { x: tip.x, y: tip.y + geom.pitch }
    return { hand, finger, tip, base, length: Math.hypot(tip.x - base.x, tip.y - base.y) }
}

import { describe, expect, it } from 'vitest'
import {
    LEFT_GEOMETRY,
    RIGHT_GEOMETRY,
    computeHandLayout,
    fingerGeometry,
    fingerRest,
    handArtExtent,
    handToKeyboard,
    keyboardToPixel,
    mirrorHandLocalX,
    validateHandLayout,
    type KeyAnchor,
    type KeyboardGeometry,
} from '@/components/hand-guide/hand-geometry'
import { fingerForCodeOrNull as resolveFinger, handForFinger } from '@/core/finger-mapping/finger-map'
import type { FingerId } from '@/types'

function standardKeyboard(): { kb: KeyboardGeometry; anchors: Map<string, KeyAnchor> } {
    const kb: KeyboardGeometry = { x: 0, y: 0, width: 600, height: 260 }
    const anchors = new Map<string, KeyAnchor>()
    const centers: Record<string, number> = {
        KeyA: 120,
        KeyS: 160,
        KeyD: 200,
        KeyF: 240,
        KeyG: 280,
        KeyH: 320,
        KeyJ: 360,
        KeyK: 400,
        KeyL: 440,
        Semicolon: 480,
    }
    for (const [code, x] of Object.entries(centers)) {
        anchors.set(code, { code, x, y: 400, width: 40 / kb.width, height: 40 / kb.height })
    }
    return { kb, anchors }
}

function homeAnchor(anchors: ReadonlyMap<string, KeyAnchor>, code: string): KeyAnchor {
    const k = anchors.get(code)
    if (!k) throw new Error(`missing fixture anchor ${code}`)
    return k
}

describe('computeHandLayout', () => {
    const { kb, anchors } = standardKeyboard()
    const f = homeAnchor(anchors, 'KeyF')
    const j = homeAnchor(anchors, 'KeyJ')

    it('anchors both hands from the measured keyboard geometry, mirrored about the axis', () => {
        const layout = computeHandLayout(anchors)
        expect(layout).not.toBeNull()
        if (!layout) return

        const scale = 40 / LEFT_GEOMETRY.pitch

        // No seam: the left index fingertip takes the KeyF centre exactly.
        expect(layout.left.x).toBeCloseTo(f.x - LEFT_GEOMETRY.index.x * scale, 1)

        // The right hand window is the exact mirror of the left about the axis.
        expect(layout.right.x).toBeCloseTo(2 * layout.axisX - (layout.left.x + LEFT_GEOMETRY.view.w * scale), 1)

        expect(layout.axisX).toBeCloseTo((f.x + j.x) / 2, 6)
        expect(layout.homeRowY).toBeCloseTo(400, 6)
        expect(layout.pitchPx).toBeCloseTo(40, 6)
    })

    it('rests every finger tip EXACTLY on its home key centre (keyboard is the source of truth)', () => {
        const layout = computeHandLayout(anchors)
        if (!layout) return
        // Left: pinky→A, ring→S, middle→D, index→F. Right: index→J, middle→K, ring→L, pinky→;.
        expect(fingerRest(layout.left, LEFT_GEOMETRY, 'left-pinky').x).toBeCloseTo(120, 1)
        expect(fingerRest(layout.left, LEFT_GEOMETRY, 'left-ring').x).toBeCloseTo(160, 1)
        expect(fingerRest(layout.left, LEFT_GEOMETRY, 'left-middle').x).toBeCloseTo(200, 1)
        expect(fingerRest(layout.left, LEFT_GEOMETRY, 'left-index').x).toBeCloseTo(240, 1)
        expect(fingerRest(layout.right, RIGHT_GEOMETRY, 'right-index').x).toBeCloseTo(360, 1)
        expect(fingerRest(layout.right, RIGHT_GEOMETRY, 'right-middle').x).toBeCloseTo(400, 1)
        expect(fingerRest(layout.right, RIGHT_GEOMETRY, 'right-ring').x).toBeCloseTo(440, 1)
        expect(fingerRest(layout.right, RIGHT_GEOMETRY, 'right-pinky').x).toBeCloseTo(480, 1)
        for (const [hand, geom, place] of [
            ['left', LEFT_GEOMETRY, layout.left],
            ['right', RIGHT_GEOMETRY, layout.right],
        ] as const) {
            const homeY = fingerRest(place, geom, `${hand}-index`)
            expect(homeY.y).toBeCloseTo(400, 1)
        }
    })

    it('rests both thumbs toward the shared space-key region near the axis', () => {
        const layout = computeHandLayout(anchors)
        if (!layout) return
        const leftThumb = fingerRest(layout.left, LEFT_GEOMETRY, 'left-thumb')
        const rightThumb = fingerRest(layout.right, RIGHT_GEOMETRY, 'right-thumb')
        for (const t of [leftThumb, rightThumb]) {
            expect(Math.abs(t.x - layout.axisX)).toBeLessThan(40)
        }
    })

    it('keeps the finger bands clear of the axis while the thumbs converge', () => {
        const layout = computeHandLayout(anchors)
        if (!layout) return
        const leftArt = handArtExtent(layout.left, LEFT_GEOMETRY)
        const rightArt = handArtExtent(layout.right, RIGHT_GEOMETRY)
        expect(rightArt.left).toBeGreaterThan(leftArt.right)
        expect(validateHandLayout(layout, kb)).toBe(true)
    })

    it('returns null when the key anchors are not measured', () => {
        const empty = new Map<string, KeyAnchor>()
        expect(computeHandLayout(empty)).toBeNull()
        const partial = new Map<string, KeyAnchor>(anchors)
        partial.delete('KeyF')
        expect(computeHandLayout(partial)).toBeNull()
    })
})

describe('coordinate conversions', () => {
    it('keyboardToPixel lifts keyboard-local points into container space', () => {
        const kb: KeyboardGeometry = { x: 12, y: 34, width: 600, height: 260 }
        expect(keyboardToPixel(kb, { x: 100, y: 200 })).toEqual({ x: 112, y: 234 })
    })

    it('handToKeyboard maps hand-local user units through anchor and scale', () => {
        const place = { x: 24.91, y: 384.26, scale: 1.55844 }
        const p = handToKeyboard(place, { x: 53.4, y: 10.1 })
        expect(p.x).toBeCloseTo(place.x + 53.4 * place.scale, 1)
        expect(p.y).toBeCloseTo(place.y + 10.1 * place.scale, 1)
    })
})

describe('every mapped finger has a resting anchor', () => {
    const cases: Record<string, string> = {
        // Left hand.
        KeyQ: 'left-pinky',
        KeyA: 'left-pinky',
        KeyZ: 'left-pinky',
        KeyW: 'left-ring',
        KeyS: 'left-ring',
        KeyX: 'left-ring',
        KeyE: 'left-middle',
        KeyD: 'left-middle',
        KeyC: 'left-middle',
        KeyR: 'left-index',
        KeyT: 'left-index',
        KeyF: 'left-index',
        KeyG: 'left-index',
        KeyV: 'left-index',
        KeyB: 'left-index',
        // Right hand.
        KeyY: 'right-index',
        KeyU: 'right-index',
        KeyH: 'right-index',
        KeyJ: 'right-index',
        KeyN: 'right-index',
        KeyM: 'right-index',
        KeyI: 'right-middle',
        KeyK: 'right-middle',
        Comma: 'right-middle',
        KeyO: 'right-ring',
        KeyL: 'right-ring',
        Period: 'right-ring',
        KeyP: 'right-pinky',
        Semicolon: 'right-pinky',
        Slash: 'right-pinky',
        Space: 'left-thumb',
    }

    it('resolves every listed key to its finger and anchor', () => {
        for (const [code, expected] of Object.entries(cases)) {
            const finger = resolveFinger(code)
            expect(finger, code).toBe(expected)
            const hand = handForFinger(finger as FingerId)
            const geom = hand === 'left' ? LEFT_GEOMETRY : RIGHT_GEOMETRY
            expect(geom.tips[finger as FingerId], code).toBeDefined()
        }
    })
})

describe('finger pivot geometry (bases)', () => {
    const fingers = Object.keys(LEFT_GEOMETRY.tips) as FingerId[]

    it('mirrors every left tip + base to the right hand across the axis', () => {
        expect(fingers.length).toBe(5)
        for (const f of fingers) {
            const rightId = f.replace('left', 'right') as FingerId
            const lt = LEFT_GEOMETRY.tips[f] as { x: number; y: number }
            const lb = LEFT_GEOMETRY.bases[f] as { x: number; y: number }
            const rt = RIGHT_GEOMETRY.tips[rightId] as { x: number; y: number } | undefined
            const rb = RIGHT_GEOMETRY.bases[rightId] as { x: number; y: number } | undefined
            expect(rt, `${rightId} tip`).toBeDefined()
            expect(rb, `${rightId} base`).toBeDefined()
            if (!rt || !rb) continue
            const mirrorTip = mirrorHandLocalX(lt)
            const mirrorBase = mirrorHandLocalX(lb)
            expect(rt.x, `${rightId} tip.x`).toBeCloseTo(mirrorTip.x, 2)
            expect(rt.y, `${rightId} tip.y`).toBeCloseTo(mirrorTip.y, 2)
            expect(rb.x, `${rightId} base.x`).toBeCloseTo(mirrorBase.x, 2)
            expect(rb.y, `${rightId} base.y`).toBeCloseTo(mirrorBase.y, 2)
        }
    })

    it('gives every finger a positive lever arm with a defined base pivot', () => {
        for (const f of fingers) {
            const geo = fingerGeometry('left', LEFT_GEOMETRY, f)
            expect(LEFT_GEOMETRY.bases[f], `${f} base configured`).toBeDefined()
            expect(geo.base).toEqual(LEFT_GEOMETRY.bases[f])
            expect(geo.tip).toEqual(LEFT_GEOMETRY.tips[f])
            expect(geo.length, `${f} lever arm`).toBeGreaterThan(0)
            // The base must sit below the tip (toward the palm/wrist on the +Y axis).
            expect(geo.base.y, `${f} base above tip`).toBeGreaterThan(geo.tip.y)
        }
    })

    it("no base falls outside its hand's div-local bounds (0..view.w × 0..view.h)", () => {
        for (const f of fingers) {
            const b = LEFT_GEOMETRY.bases[f] as { x: number; y: number }
            expect(b.x, `${f} base.x in view`).toBeGreaterThanOrEqual(0)
            expect(b.x, `${f} base.x in view`).toBeLessThan(LEFT_GEOMETRY.view.w)
            expect(b.y, `${f} base.y in view`).toBeGreaterThanOrEqual(0)
            expect(b.y, `${f} base.y in view`).toBeLessThan(LEFT_GEOMETRY.view.h)
            // The base must live below its fingertip (toward the palm, +Y axis).
            const tip = LEFT_GEOMETRY.tips[f] as { x: number; y: number }
            expect(b.y, `${f} base below tip`).toBeGreaterThan(tip.y)
        }
    })
})

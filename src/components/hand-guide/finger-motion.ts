import type { FingerId } from '@/types'
import { clamp } from '@/lib/utils'
import {
    LEFT_GEOMETRY,
    RIGHT_GEOMETRY,
    fingerGeometry,
    fingerRest,
    handToKeyboard,
    type FingerGeometry,
    type HandGeometry,
    type HandPlacement,
    type Vec2,
} from './hand-geometry'

const RAD2DEG = 180 / Math.PI
const DEG2RAD = Math.PI / 180

export const APPROACH_PEAK = 0.94

function fmt(value: number): string {
    return value.toFixed(2)
}

export const ZERO_TARGET = Object.freeze({ tx: 0, ty: 0, deg: 0 })

export interface FingerTarget {
    tx: number
    ty: number
    deg: number
}

export interface FingerMotionProfile {
    maxBendDeg: number
    maxForward: number
    maxBackward: number
    neutral: { tx: number; ty: number; deg: number }
    approachMs: number
    pressMs: number
    releaseMs: number
    jitterMs: number
}

const TIMING = { approach: 90, press: 60, release: 210 }
const THUMB_TIMING = { approach: 110, press: 70, release: 240 }

function baseProfile(over: Partial<Omit<FingerMotionProfile, 'neutral'>>): Omit<FingerMotionProfile, 'neutral'> {
    return {
        maxBendDeg: 6,
        maxForward: 10,
        maxBackward: 7,
        approachMs: TIMING.approach,
        pressMs: TIMING.press,
        releaseMs: TIMING.release,
        jitterMs: 0,
        ...over,
    }
}

export const FINGER_PROFILES: Record<FingerId, FingerMotionProfile> = {
    'left-pinky': {
        ...baseProfile({ maxBendDeg: 7, maxForward: 9, maxBackward: 6, jitterMs: 0 }),
        neutral: { tx: 0, ty: 0, deg: 0 },
    },
    'left-ring': {
        ...baseProfile({ maxBendDeg: 6, maxForward: 9, maxBackward: 6, jitterMs: 10 }),
        neutral: { tx: 0, ty: 0, deg: 0 },
    },
    'left-middle': {
        ...baseProfile({ maxBendDeg: 5, maxForward: 10, maxBackward: 7, jitterMs: 14 }),
        neutral: { tx: 0, ty: 0, deg: 0 },
    },
    'left-index': {
        ...baseProfile({ maxBendDeg: 6, maxForward: 10, maxBackward: 7, jitterMs: 5 }),
        neutral: { tx: 0, ty: 0, deg: 0 },
    },
    'left-thumb': {
        ...baseProfile({
            maxBendDeg: 13,
            maxForward: 8,
            maxBackward: 5,
            approachMs: THUMB_TIMING.approach,
            pressMs: THUMB_TIMING.press,
            releaseMs: THUMB_TIMING.release,
            jitterMs: 18,
        }),
        neutral: { tx: -2, ty: 0, deg: -3 },
    },
    'right-thumb': {
        ...baseProfile({
            maxBendDeg: 13,
            maxForward: 8,
            maxBackward: 5,
            approachMs: THUMB_TIMING.approach,
            pressMs: THUMB_TIMING.press,
            releaseMs: THUMB_TIMING.release,
            jitterMs: 18,
        }),
        neutral: { tx: 2, ty: 0, deg: 3 },
    },
    'right-index': {
        ...baseProfile({ maxBendDeg: 6, maxForward: 10, maxBackward: 7, jitterMs: 5 }),
        neutral: { tx: 0, ty: 0, deg: 0 },
    },
    'right-middle': {
        ...baseProfile({ maxBendDeg: 5, maxForward: 10, maxBackward: 7, jitterMs: 14 }),
        neutral: { tx: 0, ty: 0, deg: 0 },
    },
    'right-ring': {
        ...baseProfile({ maxBendDeg: 6, maxForward: 9, maxBackward: 6, jitterMs: 10 }),
        neutral: { tx: 0, ty: 0, deg: 0 },
    },
    'right-pinky': {
        ...baseProfile({ maxBendDeg: 7, maxForward: 9, maxBackward: 6, jitterMs: 0 }),
        neutral: { tx: 0, ty: 0, deg: 0 },
    },
}

function geometryFor(finger: FingerId): HandGeometry {
    return finger.startsWith('left') ? LEFT_GEOMETRY : RIGHT_GEOMETRY
}

export function computeReach(geo: FingerGeometry, prof: FingerMotionProfile, deltaSvg: Vec2): FingerTarget {
    const L = geo.length || 1
    const ux = (geo.tip.x - geo.base.x) / L
    const uy = (geo.tip.y - geo.base.y) / L
    const perpX = -uy
    const perpY = ux

    const axial = clamp(deltaSvg.x * ux + deltaSvg.y * uy, -prof.maxBackward, prof.maxForward)
    const lateral = deltaSvg.x * perpX + deltaSvg.y * perpY
    const deg = clamp((lateral / L) * RAD2DEG, -prof.maxBendDeg, prof.maxBendDeg)

    return {
        tx: axial * ux + prof.neutral.tx,
        ty: axial * uy + prof.neutral.ty,
        deg: deg + prof.neutral.deg,
    }
}

export function targetForKey(
    finger: FingerId,
    place: HandPlacement,
    geom: HandGeometry,
    prof: FingerMotionProfile,
    keyCenter: Vec2,
): FingerTarget | null {
    if (!geom.tips[finger]) return null
    const rest = fingerRest(place, geom, finger)
    const deltaSvg = {
        x: (keyCenter.x - rest.x) / place.scale,
        y: (keyCenter.y - rest.y) / place.scale,
    }
    return computeReach(fingerGeometry(finger.startsWith('left') ? 'left' : 'right', geom, finger), prof, deltaSvg)
}

export type FingerPhase = 'approach' | 'press' | 'release' | 'rest'

export interface FingerAnimState {
    phase: FingerPhase
    target: FingerTarget | null
    phaseStart: number
    entryP: number
}

export function envelopeP(state: FingerAnimState, prof: FingerMotionProfile, now: number, reduced: boolean): number {
    if (!state.target) return 0
    const scale = reduced ? 0 : 1
    switch (state.phase) {
        case 'rest':
            return 0
        case 'approach': {
            const u = Math.min(1, Math.max(0, now - state.phaseStart) / Math.max(1, prof.approachMs * scale))
            return state.entryP + (APPROACH_PEAK - state.entryP) * u * u
        }
        case 'press': {
            const u = Math.min(1, Math.max(0, now - state.phaseStart) / Math.max(1, prof.pressMs * scale))
            return APPROACH_PEAK + (1 - APPROACH_PEAK) * (1 - Math.pow(1 - u, 3))
        }
        case 'release': {
            const u = Math.min(1, Math.max(0, now - state.phaseStart) / Math.max(1, prof.releaseMs * scale))
            return Math.pow(1 - u, 3)
        }
    }
}

function approachDuration(prof: FingerMotionProfile, reduced: boolean): number {
    return reduced ? 0 : prof.approachMs + prof.jitterMs
}

export function advanceState(state: FingerAnimState, prof: FingerMotionProfile, now: number, reduced: boolean): number {
    let p = envelopeP(state, prof, now, reduced)
    if (!state.target) {
        state.phase = 'rest'
        return 0
    }
    if (state.phase === 'approach' && now - state.phaseStart >= approachDuration(prof, reduced)) {
        state.phase = 'press'
        state.phaseStart = now
        state.entryP = APPROACH_PEAK
        p = envelopeP(state, prof, now, reduced)
    }
    if (state.phase === 'press' && now - state.phaseStart >= (reduced ? 0 : prof.pressMs)) {
        p = 1
    }
    if (state.phase === 'release' && now - state.phaseStart >= (reduced ? 0 : prof.releaseMs)) {
        state.phase = 'rest'
        state.target = null
        state.entryP = 0
        p = 0
    }
    return p
}

export function needsFrame(state: FingerAnimState, prof: FingerMotionProfile, now: number, reduced: boolean): boolean {
    if (state.target === null || state.phase === 'rest') return false
    if (state.phase === 'release') return now - state.phaseStart < (reduced ? 0 : prof.releaseMs)
    if (state.phase === 'press') {
        return now - state.phaseStart < (reduced ? 0 : prof.pressMs)
    }
    return now - state.phaseStart < approachDuration(prof, reduced)
}

function interpolate(target: FingerTarget, prof: FingerMotionProfile, p: number): { tx: number; ty: number; deg: number } {
    const n = prof.neutral
    return {
        tx: n.tx + (target.tx - n.tx) * p,
        ty: n.ty + (target.ty - n.ty) * p,
        deg: n.deg + (target.deg - n.deg) * p,
    }
}

export function toTransformAttribute(geo: FingerGeometry, prof: FingerMotionProfile, target: FingerTarget | null, p: number): string {
    const t = interpolate(target ?? ZERO_TARGET, prof, p)
    const bx = geo.base.x + t.tx
    const by = geo.base.y + t.ty
    return `rotate(${fmt(t.deg)} ${fmt(bx)} ${fmt(by)}) translate(${fmt(t.tx)} ${fmt(t.ty)})`
}

export function fingertipPosition(geo: FingerGeometry, prof: FingerMotionProfile, target: FingerTarget | null, p: number): Vec2 {
    const t = interpolate(target ?? ZERO_TARGET, prof, p)
    const relX = geo.tip.x - geo.base.x
    const relY = geo.tip.y - geo.base.y
    const rad = t.deg * DEG2RAD
    const rotX = relX * Math.cos(rad) - relY * Math.sin(rad)
    const rotY = relX * Math.sin(rad) + relY * Math.cos(rad)
    return {
        x: geo.base.x + t.tx + rotX,
        y: geo.base.y + t.ty + rotY,
    }
}

export function fingertipInKeyboard(
    place: HandPlacement,
    geo: FingerGeometry,
    prof: FingerMotionProfile,
    target: FingerTarget | null,
    p: number,
): Vec2 {
    return handToKeyboard(place, fingertipPosition(geo, prof, target, p))
}

export class FingerAnimator {
    private readonly els = new Map<FingerId, SVGGElement>()
    private readonly geos = new Map<FingerId, FingerGeometry>()
    private readonly profiles: Record<FingerId, FingerMotionProfile> = FINGER_PROFILES
    private readonly states: Partial<Record<FingerId, FingerAnimState>> = {}
    private readonly lastAttr: Partial<Record<FingerId, string>> = {}
    private readonly media: MediaQueryList | null = null
    private frame: number | null = null
    private reduced = false
    private readonly onMediaChange: () => void

    onSample: ((now: number) => void) | null = null

    constructor(scope: HTMLElement) {
        scope.querySelectorAll<SVGGElement>('.hand-finger[data-hand][data-finger]').forEach((el) => {
            const id = el.dataset.finger as FingerId | undefined
            if (!id || this.els.has(id)) return
            this.els.set(id, el)
            this.geos.set(id, fingerGeometry(id.startsWith('left') ? 'left' : 'right', geometryFor(id), id))
        })

        if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
            this.media = window.matchMedia('(prefers-reduced-motion: reduce)')
            this.reduced = this.media.matches
            this.onMediaChange = () => {
                this.reduced = this.media?.matches ?? false
            }
            this.media.addEventListener?.('change', this.onMediaChange)
        } else {
            this.onMediaChange = () => {}
        }
    }

    get fingerCount(): number {
        return this.els.size
    }

    get reducedMotion(): boolean {
        return this.reduced
    }

    setTargets(next: ReadonlyMap<FingerId, FingerTarget | null>): void {
        const now = performance.now()
        for (const finger of Object.keys(this.states) as FingerId[]) {
            if (!next.has(finger)) this.release(finger, now)
        }
        for (const [finger, target] of next) {
            this.setTarget(finger, target, now)
        }
    }

    setTarget(finger: FingerId, target: FingerTarget | null, now = performance.now()): void {
        if (target === null) {
            this.release(finger, now)
            return
        }
        if (!this.els.has(finger)) return

        const prev = this.states[finger]
        const prof = this.profiles[finger]
        const entryP = prev?.target !== undefined && prev.target !== null ? envelopeP(prev, prof, now, this.reduced) : 0

        this.states[finger] = {
            phase: 'approach',
            target,
            phaseStart: now + (this.reduced ? 0 : prof.jitterMs),
            entryP,
        }
        this.ensureLoop()
    }

    release(finger: FingerId, now = performance.now()): void {
        const st = this.states[finger]
        const prof = this.profiles[finger]
        if (!st || st.target === null) return
        const entryP = envelopeP(st, prof, now, this.reduced)
        st.entryP = entryP
        st.phase = 'release'
        st.phaseStart = now
        if (this.reduced) {
            const p = advanceState(st, prof, now, true)
            this.write(finger, p)
        }
        this.ensureLoop()
    }

    releaseAll(): void {
        const now = performance.now()
        for (const finger of Object.keys(this.states) as FingerId[]) {
            this.release(finger, now)
        }
    }

    currentTarget(finger: FingerId): FingerTarget | null {
        return this.states[finger]?.target ?? null
    }

    currentP(finger: FingerId): number {
        const st = this.states[finger]
        if (!st) return 0
        return envelopeP(st, this.profiles[finger], performance.now(), this.reduced)
    }

    destroy(): void {
        if (this.frame !== null) {
            cancelAnimationFrame(this.frame)
            this.frame = null
        }
        this.media?.removeEventListener?.('change', this.onMediaChange)
    }

    private ensureLoop(): void {
        if (this.frame !== null) return
        this.frame = requestAnimationFrame(this.tick)
    }

    private readonly tick = (now: number): void => {
        let anyActive = false
        for (const finger of Object.keys(this.states) as FingerId[]) {
            const st = this.states[finger]
            const el = this.els.get(finger)
            if (!st || !el) continue
            const prof = this.profiles[finger]
            const p = advanceState(st, prof, now, this.reduced)
            this.write(finger, p)
            if (p > 0 || needsFrame(st, prof, now, this.reduced)) anyActive = true
        }
        this.onSample?.(now)
        this.frame = anyActive ? requestAnimationFrame(this.tick) : null
    }

    private write(finger: FingerId, p: number): void {
        const el = this.els.get(finger)
        const st = this.states[finger]
        const geo = this.geos.get(finger)
        if (!el || !st || !geo) return
        const attr = toTransformAttribute(geo, this.profiles[finger], st.target, p)
        if (this.lastAttr[finger] !== attr) {
            this.lastAttr[finger] = attr
            el.setAttribute('transform', attr)
        }
    }
}

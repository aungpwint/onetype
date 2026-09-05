import type { FingerId } from '@/types'
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

/*
 * Per-finger reach animation (spec: Finger targets, Thumb motion, Rapid
 * retargeting, Simultaneous chords, Reduced motion).
 *
 * The hands themselves stay static. Each finger's highlight path lives in its
 * own `<g class="hand-finger" data-hand=… data-finger=…>` inside the SVG asset.
 * Pressing a key moves only that finger: a small, clamped BEND around the
 * finger's proximal pivot (base) plus a short axial extension/retraction. All
 * motion is expressed in absolute hand-local SVG user units derived from the
 * keyboard's measured key centre, so there is no accumulated drift and the
 * rest posture always returns bit-for-bit to the aligned home position.
 *
 * Target semantics: `FingerAnimator.setTargets(…)` declares the full desired
 * per-finger targets for a frame; the engine releases fingers that are absent,
 * retargets fingers whose target changed (restarting the approach from the
 * current envelope value — never queued), and settles everything through one
 * deterministic envelope (approach → press → held → release → rest). The Web
 * Animations API / CSS transitions are deliberately not used: a single
 * requestAnimationFrame loop drives every finger so the timing, easing and
 * retarget behaviour stay identical on every browser and are unit-testable as
 * pure functions in this module.
 *
 * Respects `prefers-reduced-motion`: with motion reduced the envelope duration
 * collapses to ~0 (instant state change, no travel). The active highlight
 * colour (App.css) keeps working independently as the always-on fallback cue.
 */

/** Degrees↔radians helpers. */
const RAD2DEG = 180 / Math.PI
const DEG2RAD = Math.PI / 180

/** Envelope value reached at the end of the approach phase (then settled to 1). */
export const APPROACH_PEAK = 0.94

function clamp(value: number, min: number, max: number): number {
    return value < min ? min : value > max ? max : value
}

function fmt(value: number): string {
    return value.toFixed(2)
}

/** A zero reach (used as the rest target so interpolation hits the neutral). */
export const ZERO_TARGET = Object.freeze({ tx: 0, ty: 0, deg: 0 })

/**
 * A resolved reach: how far this finger should move to point at a key.
 * `tx`/`ty` are the axial translate (hand-local SVG units) and `deg` the bend
 * about the base. Both already include the finger's neutral rest posture.
 */
export interface FingerTarget {
    tx: number
    ty: number
    deg: number
}

/** Per-finger reach limits and timing. */
export interface FingerMotionProfile {
    /** Max bend about the base pivot, degrees. */
    maxBendDeg: number
    /** Max tip extension along the finger axis, SVG units (toward the key). */
    maxForward: number
    /** Max tip retraction back toward the palm, SVG units. */
    maxBackward: number
    /** Rest-posture offset applied even when idle (thumbs cant outward). */
    neutral: { tx: number; ty: number; deg: number }
    /** Approach / press-settle / release timings, ms. */
    approachMs: number
    pressMs: number
    releaseMs: number
    /** Deterministic onset jitter, ms — keeps chords from being too perfect. */
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

/**
 * Per-finger motion profiles. Left/right mirrors share the same parameters —
 * the mirrored geometry flips the bend sign automatically (see computeReach).
 * `neutral` keeps the thumbs anatomically apart at rest instead of both
 * crowding the axis; every other finger has a zero neutral.
 */
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

/** The hand geometry for a finger id. */
function geometryFor(finger: FingerId): HandGeometry {
    return finger.startsWith('left') ? LEFT_GEOMETRY : RIGHT_GEOMETRY
}

/**
 * Convert the keyboard-local delta between the resting fingertip and the
 * pressed key centre into a per-finger reach. The delta is decomposed along
 * the finger's own axis and its perpendicular so the reach always reads as a
 * bend around the finger's base — never as a whole-hand slide.
 */
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

/**
 * Resolve the reach for one finger toward a measured key centre
 * (keyboard-local). Returns null only when the finger has no resting anchor in
 * the geometry config (should not happen for mapped fingers).
 */
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

/** Motion envelope phases of one finger. */
export type FingerPhase = 'approach' | 'press' | 'release' | 'rest'

/** Live animation state of one finger (mutable; owned by FingerAnimator). */
export interface FingerAnimState {
    phase: FingerPhase
    /** The reach target being animated (null = returning to neutral rest). */
    target: FingerTarget | null
    /** Performance-clock timestamp when the current phase started. */
    phaseStart: number
    /** Envelope value at phase entry (keeps retargets/releases continuous). */
    entryP: number
}

/** Current per-finger value of the approach→press→release envelope. */
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

/** Approach duration including the deterministic onset jitter. */
function approachDuration(prof: FingerMotionProfile, reduced: boolean): number {
    return reduced ? 0 : prof.approachMs + prof.jitterMs
}

/**
 * Advance a finger's state one frame: returns the envelope value `p` and
 * mutates the phase/phaseStart/entryP at stage boundaries. Pure with respect
 * to the state object, so it is directly unit-testable.
 */
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
        // Settled on the target — the finger holds here until the key releases.
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

/** True when a state still needs animation frames (i.e. it has not settled). */
export function needsFrame(state: FingerAnimState, prof: FingerMotionProfile, now: number, reduced: boolean): boolean {
    if (state.target === null || state.phase === 'rest') return false
    if (state.phase === 'release') return now - state.phaseStart < (reduced ? 0 : prof.releaseMs)
    if (state.phase === 'press') {
        // Held on the target: no motion (the loop restarts on the next change).
        return now - state.phaseStart < (reduced ? 0 : prof.pressMs)
    }
    return now - state.phaseStart < approachDuration(prof, reduced)
}

/** Blend a target toward the neutral rest posture by envelope value `p`. */
function interpolate(target: FingerTarget, prof: FingerMotionProfile, p: number): { tx: number; ty: number; deg: number } {
    const n = prof.neutral
    return {
        tx: n.tx + (target.tx - n.tx) * p,
        ty: n.ty + (target.ty - n.ty) * p,
        deg: n.deg + (target.deg - n.deg) * p,
    }
}

/**
 * The SVG transform attribute for one finger. The rotate centre follows the
 * translate, so the finger bends around its OWN (moved) base — the palm stays
 * planted and the fingertip arcs toward the key.
 */
export function toTransformAttribute(geo: FingerGeometry, prof: FingerMotionProfile, target: FingerTarget | null, p: number): string {
    const t = interpolate(target ?? ZERO_TARGET, prof, p)
    const bx = geo.base.x + t.tx
    const by = geo.base.y + t.ty
    return `rotate(${fmt(t.deg)} ${fmt(bx)} ${fmt(by)}) translate(${fmt(t.tx)} ${fmt(t.ty)})`
}

/**
 * Current fingertip position (hand-local) given a target and envelope value.
 * Used by the dev overlay to draw live REST/TARGET/CURRENT markers.
 */
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

/** Live fingertip in keyboard-local coordinates (for dev diagnostics). */
export function fingertipInKeyboard(
    place: HandPlacement,
    geo: FingerGeometry,
    prof: FingerMotionProfile,
    target: FingerTarget | null,
    p: number,
): Vec2 {
    return handToKeyboard(place, fingertipPosition(geo, prof, target, p))
}

/** Human-readable single-line diagnostics for one finger. */
export function describeState(geo: FingerGeometry, prof: FingerMotionProfile, target: FingerTarget | null, p: number): string {
    const t = interpolate(target ?? ZERO_TARGET, prof, p)
    return `tx ${t.tx.toFixed(2)} ty ${t.ty.toFixed(2)} rot ${t.deg.toFixed(2)}deg p ${p.toFixed(2)} L ${geo.length.toFixed(1)}`
}

/**
 * The imperative finger animator. Owns the finger `<g>` elements (queried as
 * `.hand-finger[data-hand][data-finger]` inside the overlay container), their
 * per-finger targets/state and the rAF loop. No React render per frame — the
 * DOM is touched directly and only when a finger's transform actually changes.
 */
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

    /**
     * Optional dev hook, invoked once per animation frame with the current
     * timestamp. Used by the ?handdebug overlay to draw live CURRENT markers
     * without triggering React re-renders.
     */
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

    /** Number of finger `<g>` elements this animator found in the overlay. */
    get fingerCount(): number {
        return this.els.size
    }

    /** Whether the OS asks for reduced motion (instant snaps, no travel). */
    get reducedMotion(): boolean {
        return this.reduced
    }

    /**
     * Declare the full desired target set. Fingers absent from the map are
     * released to neutral; present fingers are reached/retargeted. This is what
     * HandOverlay calls on every key change — the engine never accumulates.
     */
    setTargets(next: ReadonlyMap<FingerId, FingerTarget | null>): void {
        const now = performance.now()
        for (const finger of Object.keys(this.states) as FingerId[]) {
            if (!next.has(finger)) this.release(finger, now)
        }
        for (const [finger, target] of next) {
            this.setTarget(finger, target, now)
        }
    }

    /** Reach one finger toward a target (or back to neutral when null). */
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

    /** Release a finger back to its neutral rest posture. */
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

    /** Release every finger (idle / overlay hidden). */
    releaseAll(): void {
        const now = performance.now()
        for (const finger of Object.keys(this.states) as FingerId[]) {
            this.release(finger, now)
        }
    }

    /** Live reach target for a finger (null while resting); dev diagnostics. */
    currentTarget(finger: FingerId): FingerTarget | null {
        return this.states[finger]?.target ?? null
    }

    /** Current envelope value for a finger; dev diagnostics. */
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

export interface Pace {
    onPace: boolean
    byWpm: number
    byAccuracy: number
}

/** Whether the live speed/accuracy already meet the paper's pass targets. */
export function paceState(liveWpm: number, liveAccuracy: number, minWpm: number | null, minAccuracy: number): Pace {
    const byWpm = minWpm === null ? 0 : Math.max(0, minWpm - liveWpm)
    const byAccuracy = Math.max(0, minAccuracy - liveAccuracy)
    return { onPace: byWpm === 0 && byAccuracy === 0, byWpm, byAccuracy }
}
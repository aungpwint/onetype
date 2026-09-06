interface Pace {
    onPace: boolean
    byWpm: number
    byAccuracy: number
}

export function paceState(liveWpm: number, liveAccuracy: number, minWpm: number | null, minAccuracy: number): Pace {
    const byWpm = minWpm === null ? 0 : Math.max(0, minWpm - liveWpm)
    const byAccuracy = Math.max(0, minAccuracy - liveAccuracy)
    return { onPace: byWpm === 0 && byAccuracy === 0, byWpm, byAccuracy }
}

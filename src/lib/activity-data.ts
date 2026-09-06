export interface ActivityDay {
    /** UTC midnight epoch ms for the day. */
    date: number
    /** Number of typing minutes recorded that day (0 if inactive). */
    minutes: number
    /** Sessions recorded that day. */
    sessions: number
}

const DAY_MS = 24 * 60 * 60 * 1000
export const ACTIVITY_CELLS = 26 * 7

export function toUtcMidnight(ts: number): number {
    const d = new Date(ts)
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

export function cellLevel(minutes: number, max: number): 0 | 1 | 2 | 3 | 4 {
    if (minutes <= 0) return 0
    if (max <= 0) return 1
    const ratio = minutes / max
    if (ratio > 0.75) return 4
    if (ratio > 0.5) return 3
    if (ratio > 0.25) return 2
    return 1
}

/**
 * Build a day-indexed activity map keyed by UTC-midnight epoch ms so the map
 * is locale independent, merging multiple sessions that share a day.
 */
export function aggregateActivity(days: ActivityDay[]): Map<number, ActivityDay> {
    const map = new Map<number, ActivityDay>()
    for (const day of days) {
        const key = toUtcMidnight(day.date)
        const existing = map.get(key)
        map.set(key, existing ? { ...existing, minutes: existing.minutes + day.minutes, sessions: existing.sessions + day.sessions } : { ...day, date: key })
    }
    return map
}

/** Day cells for the trailing window, oldest first, already bucketed per level. */
export interface HeatmapLayout {
    cells: ActivityDay[]
    max: number
}

export function layoutActivity(days: ActivityDay[], now: number): HeatmapLayout {
    const map = aggregateActivity(days)
    const start = toUtcMidnight(now) - (ACTIVITY_CELLS - 1) * DAY_MS
    const cells: ActivityDay[] = []
    let max = 0
    for (let i = 0; i < ACTIVITY_CELLS; i += 1) {
        const day = map.get(start + i * DAY_MS)
        const minutes = day?.minutes ?? 0
        if (minutes > max) max = minutes
        cells.push(day ?? { date: start + i * DAY_MS, minutes: 0, sessions: 0 })
    }
    return { cells, max }
}
const DAY_MS = 86_400_000

interface WeekBar {
    offset: number
    minutes: number
    isToday: boolean
    label: string
    fraction: number
}

const DEFAULT_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function buildWeekBars(
    dayMinutes: readonly number[],
    todayStartMs: number,
    weekdayNames: readonly string[] = DEFAULT_WEEKDAYS,
): WeekBar[] {
    const bars: WeekBar[] = []
    for (let i = 0; i < 7; i += 1) {
        const offset = i - 6
        const dayStart = todayStartMs + offset * DAY_MS
        const weekday = new Date(dayStart).getDay()
        bars.push({
            offset,
            minutes: Math.max(0, dayMinutes[i] ?? 0),
            isToday: offset === 0,
            label: weekdayNames[weekday % weekdayNames.length] ?? '·',
            fraction: 0,
        })
    }
    const peak = Math.max(1, ...bars.map((b) => b.minutes))
    for (const bar of bars) {
        bar.fraction = bar.minutes / peak
    }
    return bars
}

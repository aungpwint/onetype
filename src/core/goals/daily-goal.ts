interface DailyGoalInfo {
    fraction: number
    percent: number
    completed: boolean
    remainingMinutes: number
}

export function dailyGoalState(minutes: number, goalMinutes: number): DailyGoalInfo {
    const goal = Math.max(0, Math.floor(goalMinutes || 0))
    const done = Math.max(0, minutes)
    if (goal <= 0) return { fraction: 0, percent: 0, completed: false, remainingMinutes: 0 }
    const fraction = Math.min(1, done / goal)
    return {
        fraction,
        percent: Math.round(fraction * 100),
        completed: done >= goal,
        remainingMinutes: Math.max(0, goal - done),
    }
}

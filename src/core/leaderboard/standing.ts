export interface Standing {
    rank: number
    total: number
    hasStanding: boolean
}

/** Where a learner sits on a paper's leaderboard. `entry` is their board row, `total` the board size. */
export function classStanding(entry: { rank: number } | null | undefined, total: number): Standing {
    if (total <= 0 || !entry) {
        return { rank: 0, total, hasStanding: false }
    }
    const rank = Math.min(Math.max(1, Math.round(entry.rank)), total)
    return { rank, total, hasStanding: true }
}
export interface BestRun {
    testId: string
    wpm: number
    accuracy: number
    passed: boolean
    scoredOn: number
}

export interface LeaderboardCandidate {
    studentId: string
    name: string
    runs: BestRun[]
}

export interface LeaderboardEntry {
    rank: number
    studentId: string
    name: string
    bestWpm: number
    bestAccuracy: number
    passed: boolean
    scoredOn: number
    attempts: number
    passedAttempts: number
}

function betterRun(a: BestRun, b: BestRun): BestRun {
    if (a.wpm !== b.wpm) return a.wpm > b.wpm ? a : b
    if (a.accuracy !== b.accuracy) return a.accuracy > b.accuracy ? a : b
    return a.scoredOn <= b.scoredOn ? a : b
}

export function rankClassOnTest(candidates: LeaderboardCandidate[], testId: string): LeaderboardEntry[] {
    const rows: Array<Omit<LeaderboardEntry, 'rank'>> = []

    for (const candidate of candidates) {
        const runs = candidate.runs.filter((run) => run.testId === testId)
        if (runs.length === 0) continue
        const best = runs.reduce(betterRun)
        rows.push({
            studentId: candidate.studentId,
            name: candidate.name,
            bestWpm: best.wpm,
            bestAccuracy: best.accuracy,
            passed: best.passed,
            scoredOn: best.scoredOn,
            attempts: runs.length,
            passedAttempts: runs.filter((run) => run.passed).length,
        })
    }

    rows.sort((a, b) => {
        if (a.bestWpm !== b.bestWpm) return b.bestWpm - a.bestWpm
        if (a.bestAccuracy !== b.bestAccuracy) return b.bestAccuracy - a.bestAccuracy
        if (a.scoredOn !== b.scoredOn) return a.scoredOn - b.scoredOn
        return a.name < b.name ? -1 : a.name > b.name ? 1 : 0
    })

    return rows.map((row, index) => ({ ...row, rank: index + 1 }))
}

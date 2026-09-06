interface MiskeyPair {
    expectedId: string
    pressedId: string
    count: number
}

interface MiskeySummary {
    miskeyCount: number
    pairs: MiskeyPair[]
}

export function summarizeMiskeys(wrongPresses: ReadonlyMap<string, ReadonlyMap<string, number>>): MiskeySummary {
    const pairs: MiskeyPair[] = []
    let miskeyCount = 0
    for (const [expectedId, perPressed] of wrongPresses) {
        for (const [pressedId, count] of perPressed) {
            pairs.push({ expectedId, pressedId, count })
            miskeyCount += count
        }
    }
    pairs.sort((a, b) => b.count - a.count || a.pressedId.localeCompare(b.pressedId))
    return { miskeyCount, pairs }
}

export function topMiskeys(summary: MiskeySummary, limit = 5): MiskeyPair[] {
    return summary.pairs.slice(0, limit)
}

export function isShiftSlip(pair: MiskeyPair): boolean {
    const sep = pair.expectedId.lastIndexOf(':')
    const expectedCode = sep >= 0 ? pair.expectedId.slice(0, sep) : pair.expectedId
    const pressedSep = pair.pressedId.lastIndexOf(':')
    const pressedCode = pressedSep >= 0 ? pair.pressedId.slice(0, pressedSep) : pair.pressedId
    return expectedCode === pressedCode
}

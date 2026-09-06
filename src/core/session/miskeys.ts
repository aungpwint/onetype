export interface MiskeyPair {
    expectedId: string
    pressedId: string
    count: number
}

export interface MiskeySummary {
    miskeyCount: number
    pairs: MiskeyPair[]
}

/**
 * Reduce the engine's expected→pressed tracking into ranked mix-up pairs.
 * Pairs are ordered most-frequent-first; ties break on the pressed key id for
 * deterministic output.
 */
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

/** The right physical key was pressed, but with the wrong Shift state. */
export function isShiftSlip(pair: MiskeyPair): boolean {
    const sep = pair.expectedId.lastIndexOf(':')
    const expectedCode = sep >= 0 ? pair.expectedId.slice(0, sep) : pair.expectedId
    const pressedSep = pair.pressedId.lastIndexOf(':')
    const pressedCode = pressedSep >= 0 ? pair.pressedId.slice(0, pressedSep) : pair.pressedId
    return expectedCode === pressedCode
}
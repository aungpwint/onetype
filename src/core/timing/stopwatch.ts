export class Stopwatch {
    private startedAt: number | null = null
    private pausedAccumMs = 0
    private pausedAt: number | null = null
    private finishedAt: number | null = null

    private lastRawMs = 0
    private discardedMs = 0
    private correctedJumps = 0

    private readonly now: () => number
    private readonly maxBurstMs: number

    constructor(now: () => number = () => performance.now(), maxBurstMs = 1000) {
        this.now = now
        this.maxBurstMs = maxBurstMs
    }

    start() {
        if (this.startedAt === null) {
            this.startedAt = this.now()
            this.lastRawMs = 0
            this.discardedMs = 0
        } else if (this.pausedAt !== null) {
            this.pausedAccumMs += this.now() - this.pausedAt
            this.pausedAt = null
            this.lastRawMs = this.rawElapsedMs()
        }
    }

    pause() {
        if (this.startedAt !== null && this.pausedAt === null && this.finishedAt === null) {
            this.pausedAt = this.now()
        }
    }

    finish() {
        if (this.finishedAt === null) {
            this.finishedAt = this.now()
        }
    }

    isRunning(): boolean {
        return this.startedAt !== null && this.pausedAt === null && this.finishedAt === null
    }

    hasStarted(): boolean {
        return this.startedAt !== null
    }

    correctedJumpsCount(): number {
        return this.correctedJumps
    }

    elapsedMs(): number {
        if (this.startedAt === null) return 0
        const raw = this.rawElapsedMs()
        if (this.isRunning()) {
            const delta = raw - this.lastRawMs
            if (delta > this.maxBurstMs) {
                this.correctedJumps += 1
                this.discardedMs += delta - this.maxBurstMs
            }
            this.lastRawMs = raw
        }
        return Math.max(0, raw - this.discardedMs)
    }

    elapsedSeconds(): number {
        return this.elapsedMs() / 1000
    }

    reset() {
        this.startedAt = null
        this.pausedAccumMs = 0
        this.pausedAt = null
        this.finishedAt = null
        this.lastRawMs = 0
        this.discardedMs = 0
        this.correctedJumps = 0
    }

    private rawElapsedMs(): number {
        if (this.startedAt === null) return 0
        const end = this.finishedAt ?? (this.pausedAt !== null ? this.pausedAt : this.now())
        return Math.max(0, end - this.startedAt - this.pausedAccumMs)
    }
}

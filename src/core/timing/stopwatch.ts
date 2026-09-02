export class Stopwatch {
  private startedAt: number | null = null;
  private pausedAccumMs = 0;
  private pausedAt: number | null = null;
  private finishedAt: number | null = null;

  private readonly now: () => number;

  constructor(now: () => number = () => performance.now()) {
    this.now = now;
  }

  start() {
    if (this.startedAt === null) {
      this.startedAt = this.now();
    } else if (this.pausedAt !== null) {
      this.pausedAccumMs += this.now() - this.pausedAt;
      this.pausedAt = null;
    }
  }

  pause() {
    if (this.startedAt !== null && this.pausedAt === null && this.finishedAt === null) {
      this.pausedAt = this.now();
    }
  }

  finish() {
    if (this.finishedAt === null) {
      this.finishedAt = this.now();
    }
  }

  isRunning(): boolean {
    return this.startedAt !== null && this.pausedAt === null && this.finishedAt === null;
  }

  hasStarted(): boolean {
    return this.startedAt !== null;
  }

  elapsedMs(): number {
    if (this.startedAt === null) return 0;
    const end = this.finishedAt ?? (this.pausedAt !== null ? this.pausedAt : this.now());
    return Math.max(0, end - this.startedAt - this.pausedAccumMs);
  }

  elapsedSeconds(): number {
    return this.elapsedMs() / 1000;
  }

  reset() {
    this.startedAt = null;
    this.pausedAccumMs = 0;
    this.pausedAt = null;
    this.finishedAt = null;
  }
}
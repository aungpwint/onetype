import type { Modifier, TypingMode } from "../../types";
import { KeyboardLayout } from "../keyboard-layout/layout";
import { BuiltSequence, TypingUnit, clusterStartForUnit } from "./sequence";
import { computeScore, ScoreMetrics } from "../scoring/score";
import { Stopwatch } from "../timing/stopwatch";

export type EngineStatus = "ready" | "running" | "paused" | "finished";
export type FinishReason = "completed" | "time-up" | "stopped" | "failed";

export interface KeyOutcome {
  correct: number;
  incorrect: number;
}

export interface TypingEngineEvent {
  type: "start" | "pause" | "resume" | "correct" | "incorrect" | "backspace" | "finish" | "time-up";
  unitIndex: number;
  keyCode?: string;
  modifier?: Modifier;
  expected?: TypingUnit;
  metrics?: ScoreMetrics;
  reason?: FinishReason;
  errorKind?: "key" | "modifier";
}

export type EngineListener = (event: TypingEngineEvent) => void;

export interface TypingEngineOptions {
  sequence: BuiltSequence;
  layout: KeyboardLayout;
  mode?: TypingMode;
  durationSeconds?: number;
  now?: () => number;
  onEvent?: EngineListener;
}

export class TypingEngine {
  readonly sequence: BuiltSequence;
  readonly layout: KeyboardLayout;
  readonly mode: TypingMode;
  readonly durationSeconds: number | null;

  status: EngineStatus = "ready";
  unitIndex = 0;
  correctCount = 0;
  incorrectCount = 0;
  backspaceCount = 0;
  shiftErrorCount = 0;
  totalKeys = 0;
  lastEvent: TypingEngineEvent | null = null;
  finishReason: FinishReason | null = null;
  readonly keyOutcomes = new Map<string, KeyOutcome>();
  private readonly unitOutcomes = new Map<number, boolean>();
  private readonly stopwatch: Stopwatch;
  private readonly listeners: EngineListener[] = [];

  constructor(options: TypingEngineOptions) {
    this.sequence = options.sequence;
    this.layout = options.layout;
    this.mode = options.mode ?? "guided";
    this.durationSeconds = options.durationSeconds ?? null;
    this.stopwatch = new Stopwatch(options.now);
    if (options.onEvent) this.listeners.push(options.onEvent);
  }

  on(listener: EngineListener): () => void {
    this.listeners.push(listener);
    return () => {
      const i = this.listeners.indexOf(listener);
      if (i >= 0) this.listeners.splice(i, 1);
    };
  }

  private emit(event: TypingEngineEvent) {
    this.lastEvent = event;
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  get expectedUnit(): TypingUnit | null {
    return this.sequence.units[this.unitIndex] ?? null;
  }

  get isComplete(): boolean {
    return this.unitIndex >= this.sequence.units.length;
  }

  get attempts(): number {
    return this.correctCount + this.incorrectCount;
  }

  unitOutcomeAt(index: number): "correct" | "incorrect" | null {
    const result = this.unitOutcomes.get(index);
    return result === undefined ? null : result ? "correct" : "incorrect";
  }

  start() {
    if (this.status === "running" || this.status === "finished") return;
    if (this.status === "paused") {
      this.resume();
      return;
    }
    this.status = "running";
    this.stopwatch.start();
    this.emit({ type: "start", unitIndex: this.unitIndex });
  }

  pause() {
    if (this.status !== "running") return;
    this.status = "paused";
    this.stopwatch.pause();
    this.emit({ type: "pause", unitIndex: this.unitIndex });
  }

  resume() {
    if (this.status !== "paused") return;
    this.status = "running";
    this.stopwatch.start();
    this.emit({ type: "resume", unitIndex: this.unitIndex });
  }

  elapsedMs(): number {
    return this.stopwatch.elapsedMs();
  }

  elapsedSeconds(): number {
    return this.stopwatch.elapsedSeconds();
  }

  currentMetrics(): ScoreMetrics {
    return computeScore({
      correctAttempts: this.correctCount,
      incorrectAttempts: this.incorrectCount,
      backspaceCount: this.backspaceCount,
      elapsedSeconds: this.elapsedSeconds(),
    });
  }

  processKey(code: string, modifier: Modifier): TypingEngineEvent | null {
    if (this.status === "ready") {
      this.start();
    }
    if (this.status !== "running") return null;
    if (this.durationSeconds !== null && this.elapsedSeconds() >= this.durationSeconds) {
      this.finish("time-up");
      return this.lastEvent;
    }

    const expected = this.expectedUnit;
    if (!expected) {
      this.finish("completed");
      return this.lastEvent;
    }

    if (code === "Backspace") {
      this.backspaceCount += 1;
      // Backspace is cluster-aware: it steps back to the start of the previous
      // grapheme/syllable cluster (not a single combining mark). For English
      // this is one unit; for Myanmar it removes a whole syllable cluster,
      // which is how the learner perceives the character.
      if (this.unitIndex > 0) {
        const newIndex = clusterStartForUnit(this.sequence, this.unitIndex);
        for (let i = newIndex; i < this.unitIndex; i++) {
          this.unitOutcomes.delete(i);
        }
        this.unitIndex = newIndex;
        // If we just uncovered an error, a stray backspace should not be
        // recorded as a new error — it is a correction gesture.
      }
      this.emit({ type: "backspace", unitIndex: this.unitIndex, expected });
      return this.lastEvent;
    }

    const keyKey = `${code}:${modifier}`;
    const outcome = this.keyOutcomes.get(keyKey) ?? { correct: 0, incorrect: 0 };
    this.totalKeys += 1;

    const keyMatches = code === expected.keyCode;
    const isCorrect = keyMatches && modifier === expected.modifier;

    if (isCorrect) {
      outcome.correct += 1;
      this.keyOutcomes.set(keyKey, outcome);
      this.correctCount += 1;
      this.unitOutcomes.set(expected.index, true);
      this.unitIndex += 1;
      this.emit({ type: "correct", unitIndex: expected.index, keyCode: code, modifier, expected });
      if (this.isComplete) {
        this.finish("completed");
      }
    } else {
      outcome.incorrect += 1;
      this.keyOutcomes.set(keyKey, outcome);
      this.incorrectCount += 1;
      if (!this.unitOutcomes.has(expected.index)) {
        this.unitOutcomes.set(expected.index, false);
      }
      // Classify the error. A modifier/shift error happens when the learner
      // pressed the correct physical key but with the wrong Shift state
      // (e.g. lowercase when uppercase was expected). This is a distinct,
      // trackable weakness.
      const errorKind: "key" | "modifier" = keyMatches && modifier !== expected.modifier ? "modifier" : "key";
      if (errorKind === "modifier") {
        this.shiftErrorCount += 1;
      }
      this.emit({ type: "incorrect", unitIndex: expected.index, keyCode: code, modifier, expected, errorKind });
    }
    return this.lastEvent;
  }

  finish(reason: FinishReason) {
    if (this.status === "finished") return;
    this.status = "finished";
    this.finishReason = reason;
    this.stopwatch.finish();
    const metrics = this.currentMetrics();
    this.emit({ type: reason === "time-up" ? "time-up" : "finish", unitIndex: this.unitIndex, metrics, reason });
  }

  keyOutcomeFor(code: string, modifier: Modifier): KeyOutcome {
    return this.keyOutcomes.get(`${code}:${modifier}`) ?? { correct: 0, incorrect: 0 };
  }

  resetMetrics() {
    this.unitIndex = 0;
    this.correctCount = 0;
    this.incorrectCount = 0;
    this.backspaceCount = 0;
    this.shiftErrorCount = 0;
    this.totalKeys = 0;
    this.unitOutcomes.clear();
    this.keyOutcomes.clear();
    this.stopwatch.reset();
    this.status = "ready";
    this.finishReason = null;
    this.lastEvent = null;
  }
}
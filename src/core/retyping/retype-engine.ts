import type { Modifier } from "../../types";
import { KeyboardLayout } from "../keyboard-layout/layout";
import { buildSequence, graphemeUnitRuns } from "../typing-engine/sequence";
import { TypingEngine, type EngineStatus, type FinishReason } from "../typing-engine/engine";
import { computeScore, type ScoreMetrics } from "../scoring/score";
import type { NormalizedExercise } from "../../types/exercise";

export interface RetypeOptions {
  /** Backspace may be used to correct mistakes. Defaults to true. */
  allowBackspace?: boolean;
  /** Imperfect keystrokes do not fail the exercise. Defaults to true. */
  allowMistakes?: boolean;
  /** Whether the target text is shown while typing. Defaults to true. */
  showTarget?: boolean;
}

export type RetypeComparisonPolicy = "unicode-safe" | "code-point";

export interface RetypeEngineOptions extends RetypeOptions {
  comparison?: RetypeComparisonPolicy;
  now?: () => number;
}

/**
 * Pure Unicode-safe comparison of a typed character against a target grapheme
 * cluster.
 *
 * Both sides are NFC-normalized before comparing code points. NFC maps
 * canonically-decomposed sequences (base + combining marks) onto their
 * precomposed equivalents, so a learner typing "é" as a decomposed sequence
 * matches a precomposed target and vice versa. When `policy` is
 * "code-point", the comparison is performed without the normalization step.
 */
export function retypeMatch(target: string, typed: string, policy: RetypeComparisonPolicy = "unicode-safe"): boolean {
  if (policy === "code-point") return typed === target;
  return typed.normalize("NFC") === target.normalize("NFC");
}

export type GraphemeState = "unreached" | "correct" | "incorrect" | "corrected";

export interface RetypeGraphemeResult {
  index: number;
  text: string;
  state: GraphemeState;
  startUnit: number;
  endUnit: number;
}

export interface RetypeProgress {
  totalGraphemes: number;
  completedGraphemes: number;
  correctGraphemes: number;
  incorrectGraphemes: number;
  percentComplete: number;
}

/**
 * Text-retyping exercise engine.
 *
 * Wraps the sequence-aware `TypingEngine` with exercise-level retype semantics:
 * the learner retypes `targetText` exactly as displayed, and correctness is
 * reported per *grapheme cluster* rather than per physical keystroke. For
 * Myanmar text this means a whole syllable cluster (e.g. က, မွ, ကက္က) is a
 * single unit of comparison — Unicode-safe and layout-aware, not a raw code
 * point scan.
 *
 * Whitespace is significant: it must be reproduced exactly where it appears in
 * `targetText` (the engine's underlying sequence already models spaces as
 * units). A retype is complete only when every grapheme cluster has been
 * reproduced exactly.
 */
export class RetypeEngine {
  readonly targetText: string;
  readonly layout: KeyboardLayout;
  readonly comparison: RetypeComparisonPolicy;
  readonly options: Required<RetypeOptions>;
  private readonly engine: TypingEngine;

  constructor(exercise: Pick<NormalizedExercise, "text" | "options"> | string, layout: KeyboardLayout, options?: RetypeEngineOptions) {
    const text = typeof exercise === "string" ? exercise : exercise.text;
    const exerciseOptions = typeof exercise === "string" ? {} : (exercise.options ?? {});
    this.targetText = text;
    this.layout = layout;
    this.comparison = options?.comparison ?? "unicode-safe";
    this.options = {
      allowBackspace: options?.allowBackspace ?? exerciseOptions.allowBackspace ?? true,
      allowMistakes: options?.allowMistakes ?? exerciseOptions.allowMistakes ?? true,
      showTarget: options?.showTarget ?? exerciseOptions.showTarget ?? true,
    };

    const sequence = buildSequence(text, layout);
    this.engine = new TypingEngine({ sequence, layout, mode: "practice", now: options?.now });
  }

  get sequence() {
    return this.engine.sequence;
  }

  get status(): EngineStatus {
    return this.engine.status;
  }

  get finishReason(): FinishReason | null {
    return this.engine.finishReason;
  }

  get unitIndex(): number {
    return this.engine.unitIndex;
  }

  get isComplete(): boolean {
    return this.engine.isComplete;
  }

  get correctCount(): number {
    return this.engine.correctCount;
  }

  get incorrectCount(): number {
    return this.engine.incorrectCount;
  }

  get backspaceCount(): number {
    return this.engine.backspaceCount;
  }

  start() {
    this.engine.start();
  }

  pause() {
    this.engine.pause();
  }

  resume() {
    this.engine.resume();
  }

  reset() {
    this.engine.resetMetrics();
  }

  finish(reason: FinishReason) {
    this.engine.finish(reason);
  }

  elapsedMs(): number {
    return this.engine.elapsedMs();
  }

  elapsedSeconds(): number {
    return this.engine.elapsedSeconds();
  }

  /**
   * The grapheme cluster the learner is currently expected to reproduce, or
   * null when the exercise is finished. Unicode-safe: for Myanmar this is one
   * syllable cluster, for English one extended grapheme cluster.
   */
  currentGrapheme(): string | null {
    const expected = this.engine.expectedUnit;
    if (expected === null) return null;
    return this.sequence.graphemes[expected.graphemeIndex] ?? null;
  }

  /**
   * Unicode-safe comparison of a typed character against the current target
   * grapheme. Both sides are NFC-canonicalized so combining-order differences
   * cannot cause a false mismatch.
   */
  compare(typed: string): boolean {
    const expected = this.engine.expectedUnit;
    if (expected === null) return false;
    const target = this.sequence.graphemes[expected.graphemeIndex];
    if (target === undefined) return false;
    return retypeMatch(target, typed, this.comparison);
  }

  /** Feed a physical keystroke (e.g. from a keyboard event). */
  processKey(code: string, modifier: Modifier): boolean {
    if (code === "Backspace" && !this.options.allowBackspace) {
      return false;
    }
    const event = this.engine.processKey(code, modifier);
    return event !== null && (event.type === "correct" || event.type === "incorrect" || event.type === "backspace");
  }

  /**
   * Feed a single typed character (already resolved from the physical key).
   * Returns whether the character matched the expected grapheme cluster.
   *
   * With the default `unicode-safe` comparison, a multi-code-point cluster
   * (e.g. a Myanmar medial/tone syllable such as မွ) must match the whole
   * cluster to count as correct. Physical-key fidelity is provided by
   * `processKey`, which is what the presentation layer uses for real keyboards.
   */
  typeChar(char: string): boolean {
    this.engine.start();
    const expected = this.engine.expectedUnit;
    if (!expected) {
      this.engine.finish("completed");
      return false;
    }

    const currentGraphemeIndex = expected.graphemeIndex;
    const targetCluster = this.sequence.graphemes[currentGraphemeIndex] ?? "";

    const matches = retypeMatch(targetCluster, char, this.comparison);
    if (matches) {
      this.advanceCluster(currentGraphemeIndex);
      return true;
    }
    this.recordClusterMistake(currentGraphemeIndex);
    return false;
  }

  /** Mark every unit of the given grapheme cluster as correctly typed. */
  private advanceCluster(graphemeIndex: number): void {
    const [start, end] = this.sequence.graphemeUnitRanges[graphemeIndex];
    for (let i = start; i < end; i++) {
      if (this.engine.isComplete) return;
      const unit = this.sequence.units[i];
      this.engine.processKey(unit.keyCode, unit.modifier);
    }
  }

  /** Record a single mistake against the current cluster without advancing. */
  private recordClusterMistake(graphemeIndex: number): void {
    const [start, end] = this.sequence.graphemeUnitRanges[graphemeIndex];
    const first = this.sequence.units[start];
    if (first === undefined) return;
    void end;
    // Force an incorrect classification against the current expected unit
    // without inventing a real key: use the unit's own key with the wrong
    // shift state when possible; otherwise a distinct non-matching key code.
    const code = first.keyCode;
    const wrongModifier = first.modifier === "none" ? "shift" : "none";
    this.engine.processKey(code, wrongModifier);
  }

  /** Per-grapheme correctness snapshot used for highlighted retype display. */
  graphemeResults(): RetypeGraphemeResult[] {
    const results: RetypeGraphemeResult[] = [];
    for (const run of graphemeUnitRuns(this.sequence)) {
      const outcome = this.graphemeQualitativeState(run.index);
      results.push({
        index: run.index,
        text: run.text,
        state: outcome,
        startUnit: run.startUnit,
        endUnit: run.endUnit,
      });
    }
    return results;
  }

  private graphemeQualitativeState(gi: number): GraphemeState {
    const run = graphemeUnitRuns(this.sequence)[gi];
    if (!run) return "unreached";
    if (run.startUnit >= this.engine.unitIndex) return "unreached";
    let correct = true;
    for (let u = run.startUnit; u < run.endUnit; u++) {
      const outcome = this.engine.unitOutcomeAt(u);
      if (outcome === "incorrect") correct = false;
      if (outcome === null) return "unreached";
    }
    return correct ? "correct" : "incorrect";
  }

  progress(): RetypeProgress {
    const total = this.sequence.graphemes.length;
    let completed = 0;
    let correct = 0;
    let incorrect = 0;
    for (const result of this.graphemeResults()) {
      if (result.state === "correct") {
        completed += 1;
        correct += 1;
      } else if (result.state === "incorrect") {
        completed += 1;
        incorrect += 1;
      }
    }
    return {
      totalGraphemes: total,
      completedGraphemes: completed,
      correctGraphemes: correct,
      incorrectGraphemes: incorrect,
      percentComplete: total === 0 ? 0 : Math.round((completed / total) * 1000) / 10,
    };
  }

  metrics(): ScoreMetrics {
    return computeScore({
      correctAttempts: this.engine.correctCount,
      incorrectAttempts: this.engine.incorrectCount,
      backspaceCount: this.engine.backspaceCount,
      elapsedSeconds: this.engine.elapsedSeconds(),
    });
  }
}
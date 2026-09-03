import { describe, expect, it } from "vitest";
import { computeScore } from "../scoring/score";
import type { ScoreMetrics } from "../scoring/score";
import { buildSequence, graphemeUnitRuns } from "../typing-engine/sequence";
import { TypingEngine } from "../typing-engine/engine";
import { englishQwerty } from "../keyboard-layout/english-qwerty";
import { myanmar3 } from "../keyboard-layout/myanmar3";
import { resolveLessonById } from "../../data/curriculum";

describe("scoring", () => {
  it("computes accuracy and WPM", () => {
    const metrics = computeScore({
      correctAttempts: 50,
      incorrectAttempts: 5,
      backspaceCount: 0,
      elapsedSeconds: 60,
    });
    expect(metrics.accuracy).toBeCloseTo(50 / 55 * 100, 5);
    expect(metrics.grossWpm).toBeCloseTo(50 / 5, 5);
    expect(metrics.cpm).toBeCloseTo(50, 5);
  });

  it("marks passing/failing against rules", () => {
    const ok = computeScore({ correctAttempts: 150, incorrectAttempts: 2, backspaceCount: 0, elapsedSeconds: 60 });
    expect(ok.accuracy).toBeGreaterThanOrEqual(90);
    expect(ok.grossWpm).toBeGreaterThan(20);
    expect(ok.grossWpm).toBeCloseTo(30, 5);
  });
});

describe("sequence building", () => {
  it("builds units for English text", () => {
    const seq = buildSequence("cat", englishQwerty);
    expect(seq.units.map((u) => u.keyCode)).toEqual(["KeyC", "KeyA", "KeyT"]);
    expect(seq.charCount).toBe(3);
  });

  it("builds units for a Myanmar word", () => {
    const word = "\u1031\u1000\u103B\u102C\u1004\u103A\u1038";
    const seq = buildSequence(word, myanmar3);
    expect(seq.units.map((u) => u.keyCode)).toEqual(["KeyA", "KeyU", "KeyS", "KeyM", "KeyI", "KeyF", "Semicolon"]);
    expect(seq.units.map((u) => u.text).join("")).toBe(word);
  });
});

describe("grapheme unit runs", () => {
  it("covers every unit of a resolved multi-phase lesson without going out of bounds", () => {
    for (const id of ["lesson-my-beginner-1", "lesson-my-beginner-5", "lesson-en-beginner-18"]) {
      const resolved = resolveLessonById(id);
      const runs = graphemeUnitRuns(resolved.sequence);
      expect(runs.length).toBe(resolved.sequence.graphemes.length);
      expect(runs[0].startUnit).toBe(0);
      expect(runs[runs.length - 1].endUnit).toBe(resolved.sequence.units.length);
      for (const run of runs) {
        expect(run.startUnit).toBeGreaterThanOrEqual(0);
        expect(run.endUnit).toBeGreaterThanOrEqual(run.startUnit);
      }
    }
  });

  it("groups Myanmar composite graphemes so each unit maps to exactly one run", () => {
    const word = "\u1031\u1000\u103B\u102C\u1004\u103A\u1038";
    const seq = buildSequence(word, myanmar3);
    const runs = graphemeUnitRuns(seq);
    expect(runs.length).toBe(seq.graphemes.length);
    expect(runs[0].startUnit).toBe(0);
    expect(runs[runs.length - 1].endUnit).toBe(seq.units.length);
    for (let i = 0; i < runs.length; i++) {
      if (i > 0) expect(runs[i].startUnit).toBe(runs[i - 1].endUnit);
      expect(runs[i].text).toBe(seq.graphemes[runs[i].index]);
    }
    expect(runs.map((r) => r.text).join("")).toBe(word);
    expect(runs.reduce((acc, r) => acc + (r.endUnit - r.startUnit), 0)).toBe(seq.units.length);
  });
});

describe("typing engine", () => {
  it("advances on correct keys and ignores wrong keys", () => {
    const seq = buildSequence("cat", englishQwerty);
    const engine = new TypingEngine({ sequence: seq, layout: englishQwerty });
    engine.processKey("KeyX", "none");
    expect(engine.unitIndex).toBe(0);
    expect(engine.incorrectCount).toBe(1);
    engine.processKey("KeyC", "none");
    engine.processKey("KeyA", "none");
    engine.processKey("KeyT", "none");
    expect(engine.unitIndex).toBe(3);
    expect(engine.status).toBe("finished");
    expect(engine.finishReason).toBe("completed");
  });

  it("requires shift for uppercase letters", () => {
    const seq = buildSequence("Cat", englishQwerty);
    const engine = new TypingEngine({ sequence: seq, layout: englishQwerty });
    engine.processKey("KeyC", "shift");
    engine.processKey("KeyA", "none");
    engine.processKey("KeyT", "none");
    expect(engine.status).toBe("finished");
    expect(engine.correctCount).toBe(3);
  });

  it("counts backspaces and steps back one unit for correction", () => {
    const seq = buildSequence("cat", englishQwerty);
    const engine = new TypingEngine({ sequence: seq, layout: englishQwerty });
    engine.processKey("KeyC", "none");
    expect(engine.unitIndex).toBe(1);
    engine.processKey("Backspace", "none");
    expect(engine.backspaceCount).toBe(1);
    expect(engine.unitIndex).toBe(0);
    // Re-typing after stepping back works
    engine.processKey("KeyC", "none");
    engine.processKey("KeyA", "none");
    engine.processKey("KeyT", "none");
    expect(engine.unitIndex).toBe(3);
    expect(engine.status).toBe("finished");
    expect(engine.finishReason).toBe("completed");
  });

  it("backspace at the start is a no-op and does not crash", () => {
    const seq = buildSequence("cat", englishQwerty);
    const engine = new TypingEngine({ sequence: seq, layout: englishQwerty });
    engine.processKey("Backspace", "none");
    expect(engine.backspaceCount).toBe(1);
    expect(engine.unitIndex).toBe(0);
    expect(engine.status).toBe("running");
  });

  it("backspace clears the errored state so a correction is not recounted as an error", () => {
    const seq = buildSequence("cat", englishQwerty);
    const engine = new TypingEngine({ sequence: seq, layout: englishQwerty });
    engine.processKey("KeyX", "none"); // wrong, unitIndex stays 0, marked incorrect
    expect(engine.incorrectCount).toBe(1);
    expect(engine.unitOutcomeAt(0)).toBe("incorrect");
    engine.processKey("Backspace", "none"); // correction gesture
    engine.processKey("KeyC", "none"); // now correct
    expect(engine.incorrectCount).toBe(1); // the original error is retained
    expect(engine.correctCount).toBe(1);
    expect(engine.unitOutcomeAt(0)).toBe("correct"); // re-typed => correct outcome
    expect(engine.unitIndex).toBe(1);
  });

  it("backspace is cluster-aware for Myanmar: deletes a whole syllable cluster", () => {
    // "ကိျာ" is one syllable cluster (base + medial + vowels) -> 4 units.
    const word = "\u1000\u102D\u103B\u102C";
    const seq = buildSequence(word, myanmar3);
    expect(seq.units.length).toBe(4);
    expect(seq.graphemes).toHaveLength(1); // one cluster
    const engine = new TypingEngine({ sequence: seq, layout: myanmar3 });
    engine.processKey("KeyU", "none");
    engine.processKey("KeyD", "none");
    engine.processKey("KeyS", "none");
    expect(engine.unitIndex).toBe(3);
    // A single Backspace removes the entire cluster, not one mark.
    engine.processKey("Backspace", "none");
    expect(engine.unitIndex).toBe(0);
    // Rebuild fully to completion (remaining keys are KeyU, KeyD, KeyS, KeyM)
    engine.processKey("KeyU", "none");
    engine.processKey("KeyD", "none");
    engine.processKey("KeyS", "none");
    engine.processKey("KeyM", "none");
    expect(engine.unitIndex).toBe(4);
    expect(engine.correctCount).toBe(7);
    expect(engine.status).toBe("finished");
  });

  it("backspace steps back to the previous cluster boundary for multi-cluster Myanmar", () => {
    // "ကာ သုံ" -> three clusters: [ကာ][space][သုံ]
    const two = buildSequence("\u1000\u102C \u101E\u102F\u1036", myanmar3);
    expect(two.graphemes).toHaveLength(3); // "ကာ", " ", "သုံ"
    const engine = new TypingEngine({ sequence: two, layout: myanmar3 });
    // Type the first cluster: ကာ (KeyU, KeyM)
    engine.processKey("KeyU", "none");
    engine.processKey("KeyM", "none");
    // Space unit
    engine.processKey("Space", "none");
    // Partial start of second cluster: သု (KeyO, KeyK)
    engine.processKey("KeyO", "none");
    engine.processKey("KeyK", "none");
    expect(engine.unitIndex).toBe(5);
    // Backspace removes the partial/whole second cluster back to the space.
    engine.processKey("Backspace", "none");
    expect(engine.unitIndex).toBe(3);
  });

  it("supports timed tests that finish when the timer expires", () => {
    let now = 0;
    const clock = () => {
      now += 25;
      return now;
    };
    const seq = buildSequence("cat", englishQwerty);
    const engine = new TypingEngine({ sequence: seq, layout: englishQwerty, durationSeconds: 10, now: clock });
    engine.processKey("KeyC", "none");
    now = 60_000;
    engine.processKey("KeyA", "none");
    expect(engine.status).toBe("finished");
    expect(engine.finishReason).toBe("time-up");
    expect(engine.unitIndex).toBe(1);
  });

  it("classifies a modifier error when pressing the right key with the wrong Shift state", () => {
    const seq = buildSequence("A", englishQwerty);
    const engine = new TypingEngine({ sequence: seq, layout: englishQwerty });
    // lowercase when uppercase expected -> modifier (shift) error
    engine.processKey("KeyA", "none");
    expect(engine.incorrectCount).toBe(1);
    expect(engine.shiftErrorCount).toBe(1);
    expect(engine.lastEvent?.errorKind).toBe("modifier");
    expect(engine.unitIndex).toBe(0);
    // Now correct press
    engine.processKey("KeyA", "shift");
    expect(engine.correctCount).toBe(1);
    expect(engine.unitIndex).toBe(1);
    expect(engine.status).toBe("finished");
  });

  it("does not count a wrong key as a shift error", () => {
    const seq = buildSequence("A", englishQwerty);
    const engine = new TypingEngine({ sequence: seq, layout: englishQwerty });
    engine.processKey("KeyB", "none");
    expect(engine.shiftErrorCount).toBe(0);
    expect(engine.lastEvent?.errorKind).toBe("key");
  });

  it("requires shift for a symbol produced by a shift modifier", () => {
    const seq = buildSequence("@", englishQwerty);
    const engine = new TypingEngine({ sequence: seq, layout: englishQwerty });
    // Shift+Digit2 produces @
    engine.processKey("Digit2", "shift");
    expect(engine.correctCount).toBe(1);
    expect(engine.unitIndex).toBe(1);
    expect(engine.status).toBe("finished");
  });

  it("rejects plain keypress when a shifted symbol is expected", () => {
    const seq = buildSequence("@", englishQwerty);
    const engine = new TypingEngine({ sequence: seq, layout: englishQwerty });
    engine.processKey("Digit2", "none");
    expect(engine.shiftErrorCount).toBe(1);
    expect(engine.unitIndex).toBe(0);
  });

  it("handles mixed-case words requiring separate shift presses", () => {
    const seq = buildSequence("Aa", englishQwerty);
    const engine = new TypingEngine({ sequence: seq, layout: englishQwerty });
    engine.processKey("KeyA", "shift");
    engine.processKey("KeyA", "none");
    expect(engine.correctCount).toBe(2);
    expect(engine.unitIndex).toBe(2);
    expect(engine.status).toBe("finished");
  });

  it("ignores keys when paused and resumes cleanly", () => {
    const seq = buildSequence("cat", englishQwerty);
    const engine = new TypingEngine({ sequence: seq, layout: englishQwerty });
    engine.processKey("KeyC", "none"); // auto-starts
    expect(engine.status).toBe("running");
    engine.pause();
    expect(engine.status).toBe("paused");
    engine.processKey("KeyA", "none"); // should be ignored while paused
    expect(engine.unitIndex).toBe(1);
    expect(engine.correctCount).toBe(1);
    engine.resume();
    engine.processKey("KeyA", "none");
    engine.processKey("KeyT", "none");
    expect(engine.status).toBe("finished");
    expect(engine.unitIndex).toBe(3);
  });

  it("excludes paused time from elapsed seconds", () => {
    let now = 1000;
    const clock = () => now;
    const seq = buildSequence("cat", englishQwerty);
    const engine = new TypingEngine({ sequence: seq, layout: englishQwerty, now: clock });
    engine.start();
    now = 3000;
    engine.pause();
    now = 13_000; // 10s of paused time
    engine.resume();
    expect(engine.elapsedSeconds()).toBe(2);
  });

  it("records per-key outcomes with the correct modifier", () => {
    const seq = buildSequence("Cat", englishQwerty);
    const engine = new TypingEngine({ sequence: seq, layout: englishQwerty });
    engine.processKey("KeyC", "shift"); // correct
    engine.processKey("KeyA", "none"); // correct
    engine.processKey("KeyT", "none"); // correct
    expect(engine.keyOutcomes.get("KeyC:shift")).toEqual({ correct: 1, incorrect: 0 });
    expect(engine.keyOutcomes.get("KeyA:none")).toEqual({ correct: 1, incorrect: 0 });
    expect(engine.totalKeys).toBe(3);
  });

  it("tracks wrong-key outcomes under their own key/modifier", () => {
    const seq = buildSequence("cat", englishQwerty);
    const engine = new TypingEngine({ sequence: seq, layout: englishQwerty });
    engine.processKey("KeyX", "none"); // wrong
    engine.processKey("KeyC", "none"); // correct
    expect(engine.keyOutcomes.get("KeyX:none")).toEqual({ correct: 0, incorrect: 1 });
    expect(engine.keyOutcomes.get("KeyC:none")).toEqual({ correct: 1, incorrect: 0 });
    expect(engine.totalKeys).toBe(2);
  });

  it("exposes attempts as the sum of correct and incorrect", () => {
    const seq = buildSequence("cat", englishQwerty);
    const engine = new TypingEngine({ sequence: seq, layout: englishQwerty });
    engine.processKey("KeyX", "none");
    engine.processKey("KeyC", "none");
    expect(engine.attempts).toBe(2);
  });

  it("emits a finish event carrying final metrics", () => {
    const seq = buildSequence("cat", englishQwerty);
    let finishMetrics: ScoreMetrics | undefined;
    const events: string[] = [];
    const engine = new TypingEngine({
      sequence: seq,
      layout: englishQwerty,
      onEvent: (ev) => {
        events.push(ev.type);
        if (ev.type === "finish") finishMetrics = ev.metrics;
      },
    });
    engine.processKey("KeyC", "none");
    engine.processKey("KeyA", "none");
    engine.processKey("KeyT", "none");
    expect(events).toContain("correct");
    expect(events).toContain("finish");
    expect(finishMetrics).toBeDefined();
    expect(finishMetrics!.correctAttempts).toBe(3);
    expect(finishMetrics!.incorrectAttempts).toBe(0);
  });

  it("does not double-fire events after completion", () => {
    const seq = buildSequence("a", englishQwerty);
    let finishCount = 0;
    const engine = new TypingEngine({
      sequence: seq,
      layout: englishQwerty,
      onEvent: (ev) => {
        if (ev.type === "finish") finishCount += 1;
      },
    });
    engine.processKey("KeyA", "none");
    engine.processKey("KeyA", "none");
    engine.processKey("KeyA", "none");
    expect(finishCount).toBe(1);
    expect(engine.status).toBe("finished");
  });

  it("resetMetrics restores a fresh engine ready for a new run", () => {
    const seq = buildSequence("cat", englishQwerty);
    const engine = new TypingEngine({ sequence: seq, layout: englishQwerty });
    engine.processKey("KeyC", "none");
    engine.processKey("KeyA", "none");
    engine.processKey("KeyT", "none");
    expect(engine.status).toBe("finished");
    engine.resetMetrics();
    expect(engine.status).toBe("ready");
    expect(engine.unitIndex).toBe(0);
    expect(engine.correctCount).toBe(0);
    expect(engine.shiftErrorCount).toBe(0);
    expect(engine.totalKeys).toBe(0);
    expect(engine.keyOutcomes.size).toBe(0);
  });

  it("handles an empty sequence gracefully", () => {
    const seq = buildSequence("", englishQwerty);
    const engine = new TypingEngine({ sequence: seq, layout: englishQwerty });
    engine.processKey("KeyA", "none");
    expect(engine.status).toBe("finished");
    expect(engine.finishReason).toBe("completed");
    expect(engine.unitIndex).toBe(0);
  });
});
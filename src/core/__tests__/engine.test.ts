import { describe, expect, it } from "vitest";
import { computeScore } from "../scoring/score";
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

  it("counts backspaces but does not advance", () => {
    const seq = buildSequence("cat", englishQwerty);
    const engine = new TypingEngine({ sequence: seq, layout: englishQwerty });
    engine.processKey("KeyC", "none");
    engine.processKey("Backspace", "none");
    expect(engine.backspaceCount).toBe(1);
    expect(engine.unitIndex).toBe(1);
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
});
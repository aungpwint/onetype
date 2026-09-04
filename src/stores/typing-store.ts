import { create } from "zustand";
import { TypingEngine } from "../core/typing-engine/engine";
import { getLayoutOrThrow } from "../core/keyboard-layout/registry";
import { englishQwerty } from "../core/keyboard-layout/english-qwerty";
import { resolveLessonById } from "../data/curriculum";
import type { ResolvedLesson } from "../data/curriculum/generator";
import { buildTestMaterial } from "../core/materials/test-material";
import type { KeyboardLayout } from "../core/keyboard-layout/layout";
import type { Modifier, TypingMode } from "../types";
import type { ScoreMetrics } from "../core/scoring/score";
import type { AchievementRecord, TypingStatRecord, TypingTest } from "../services/types";
import { reinforcementFromWeakKeys } from "../core/reinforcement";
import type { ReinforcedDrill, MuscleMemoryGoal } from "../core/reinforcement";
import { projectMasteryDelta } from "../core/mastery";
import type { MasteryDelta } from "../core/mastery";
import * as backend from "../services/backend";
import { useStudentStore } from "./student-store";
import { useLessonStore } from "./lesson-store";
import { useUiStore } from "./ui-store";
import { useProgressionStore } from "./progression-store";
import { CONTENT_VERSION } from "../services/local";
import { playAchievementSound, playCompletionSound, playErrorSound, playKeySound } from "../lib/sound";

export interface LiveStats {
  unitIndex: number;
  totalUnits: number;
  correctCount: number;
  incorrectCount: number;
  backspaceCount: number;
  accuracy: number;
  wpm: number;
  cpm: number;
  elapsedMs: number;
}

export interface FinishedResult {
  lessonId?: string;
  testId?: string;
  mode: TypingMode;
  metrics: ScoreMetrics;
  passed: boolean;
  finishReason: "completed" | "time-up";
  attempt: number;
  newlyUnlocked: string[];
  masteryDelta?: MasteryDelta;
  saveError?: string;
}

interface TypingSessionState {
  kind: "lesson" | "test" | "drill";
  lessonId?: string;
  test?: TypingTest;
  drill?: ReinforcedDrill;
  resolved: ResolvedLesson;
  layout: KeyboardLayout;
  mode: TypingMode;
  durationSeconds: number | null;
  attempt: number;
  startedAt: number;
}

interface TypingState {
  session: TypingSessionState | null;
  engine: TypingEngine | null;
  status: "idle" | "ready" | "running" | "paused" | "finished";
  error: string | null;
  wrongFlash: { unitIndex: number; at: number } | null;
  tick: number;
  result: FinishedResult | null;
  beginLesson: (lessonId: string, mode?: TypingMode) => Promise<void>;
  beginTest: (test: TypingTest) => Promise<void>;
  beginDrill: (drill: ReinforcedDrill) => Promise<void>;
  start: () => void;
  togglePause: () => void;
  abandon: () => void;
  persistAndFinish: () => Promise<void>;
  clear: () => void;
  clearError: () => void;
  getLiveStats: () => LiveStats;
  expectedKey: () => { code: string; modifier: Modifier } | null;
}

function liveStats(engine: TypingEngine | null, totalUnits: number): LiveStats {
  if (!engine) {
    return { unitIndex: 0, totalUnits, correctCount: 0, incorrectCount: 0, backspaceCount: 0, accuracy: 0, wpm: 0, cpm: 0, elapsedMs: 0 };
  }
  const metrics = engine.currentMetrics();
  return {
    unitIndex: engine.unitIndex,
    totalUnits,
    correctCount: engine.correctCount,
    incorrectCount: engine.incorrectCount,
    backspaceCount: engine.backspaceCount,
    accuracy: metrics.accuracy,
    wpm: metrics.grossWpm,
    cpm: metrics.cpm,
    elapsedMs: engine.elapsedMs(),
  };
}

function modifierFromEvent(event: KeyboardEvent): Modifier {
  return event.shiftKey ? "shift" : "none";
}

const IGNORED_CODES = new Set([
  "ShiftLeft", "ShiftRight", "AltLeft", "AltRight",
  "ControlLeft", "ControlRight", "MetaLeft", "MetaRight",
  "CapsLock", "Tab", "Enter", "Escape", "F1", "F2", "F3", "F4",
  "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",
  "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
]);

const ENGLISH_LAYOUT_ID = "english-qwerty";

function drillResolvedLesson(drill: ReinforcedDrill): ResolvedLesson {
  const plan = drill.plan;
  const seq = plan.sequence;
  return {
    id: "drill:weakness",
    level: "beginner",
    number: 0,
    sequence: seq,
    layoutId: ENGLISH_LAYOUT_ID,
    totalUnits: seq.units.length,
    totalCharacters: seq.charCount,
    phases: [],
    difficulty: "adaptive",
    estimatedMinutes: 0,
    completion: { minAccuracy: 0, minWpm: null },
    title: `Weakness drill · ${plan.goal}`,
    titleMy: "",
    description: "Adaptive drill targeting detected weak keys.",
    language: "english",
    focusKeys: plan.keys,
  };
}

/**
 * Build an adaptive reinforcement drill from the active student's detected
 * English-layout weaknesses. Returns null when there is no active student or
 * not enough evidence yet. Drills are English-layout only (Phase 15).
 */
export async function buildAdaptiveDrill(
  opts: { goal?: MuscleMemoryGoal } = {},
): Promise<ReinforcedDrill | null> {
  const active = useStudentStore.getState().active;
  if (!active) return null;
  // weakKeys is already Wilson-ranked weakest-first, so a lower position index
  // means weaker. Encode that as a descending lower bound so the reinforcement
  // layer's ascend-and-cap keeps the weakest keys first.
  const keys = await backend.weakKeys(active.id, ENGLISH_LAYOUT_ID, 8);
  if (keys.length === 0) return null;
  const weakIds = keys.map((k, i) => ({ key: k.key, lowerBound: i }));
  return reinforcementFromWeakKeys(weakIds, opts);
}

export const useTypingStore = create<TypingState>((set, get) => ({
  session: null,
  engine: null,
  status: "idle",
  error: null,
  wrongFlash: null,
  tick: 0,
  result: null,

  beginLesson: async (lessonId, mode = "guided") => {
    const active = await useStudentStore.getState().ensureActive();
    if (!active) {
      set({ error: "Please add a student profile first." });
      return;
    }
    const resolved = resolveLessonById(lessonId);
    const layout = getLayoutOrThrow(resolved.layoutId);
    const attempt = await backend.nextExerciseAttempt(active.id, lessonId);
    const session: TypingSessionState = {
      kind: "lesson",
      lessonId,
      resolved,
      layout,
      mode,
      durationSeconds: null,
      attempt,
      startedAt: Date.now(),
    };
    const engine = createEngine(session);
    set({ session, engine, status: "ready", result: null, error: null, wrongFlash: null, tick: 0 });
    bindKeys();
  },

  beginTest: async (test) => {
    const active = await useStudentStore.getState().ensureActive();
    if (!active) {
      set({ error: "Please add a student profile first." });
      return;
    }
    const resolved = buildTestMaterial(test);
    const layout = getLayoutOrThrow(test.layoutId);
    const attempt = await backend.nextTestAttempt(active.id, test.id);
    const session: TypingSessionState = {
      kind: "test",
      test,
      resolved,
      layout,
      mode: "test",
      durationSeconds: test.durationSeconds,
      attempt,
      startedAt: Date.now(),
    };
    const engine = createEngine(session);
    set({ session, engine, status: "ready", result: null, error: null, wrongFlash: null, tick: 0 });
    bindKeys();
  },

  beginDrill: async (drill) => {
    const active = await useStudentStore.getState().ensureActive();
    if (!active) {
      set({ error: "Please add a student profile first." });
      return;
    }
    const session: TypingSessionState = {
      kind: "drill",
      drill,
      resolved: drillResolvedLesson(drill),
      layout: englishQwerty,
      mode: "guided",
      durationSeconds: null,
      attempt: 1,
      startedAt: Date.now(),
    };
    const engine = createEngine(session);
    set({ session, engine, status: "ready", result: null, error: null, wrongFlash: null, tick: 0 });
    bindKeys();
  },

  start: () => {
    const { engine } = get();
    if (!engine) return;
    engine.start();
    set({ status: engine.status });
  },

  togglePause: () => {
    const { engine } = get();
    if (!engine) return;
    if (engine.status === "running") engine.pause();
    else if (engine.status === "paused") engine.resume();
    set({ status: engine.status });
  },

  abandon: () => {
    const { engine } = get();
    if (engine) engine.finish("stopped");
    unbindKeys();
    set({ session: null, engine: null, status: "idle", result: null, error: null, wrongFlash: null, tick: 0 });
  },

  persistAndFinish: async () => {
    const { engine, session } = get();
    if (!engine || !session) return;
    const active = useStudentStore.getState().active;
    if (!active) return;
    unbindKeys();

    const metrics = engine.currentMetrics();
    const reason: "completed" | "time-up" = engine.finishReason === "time-up" ? "time-up" : "completed";
    const now = Date.now();
    const layoutVersion = session.layout.version;
    const contentVersion = CONTENT_VERSION;
    const lesson = session.resolved;

    // Persistence is best-effort: the result dialog must always appear even if a
    // write fails, so the learner never loses their score without feedback.
    let saveError: string | undefined;
    try {
      await backend.saveTypingSession({
        studentId: active.id,
        lessonId: session.lessonId ?? null,
        exerciseId: session.kind === "lesson" ? (session.lessonId ?? null) : null,
        level: session.kind === "lesson" ? lesson.level : null,
        lessonNumber: session.kind === "lesson" ? lesson.number : null,
        startedAt: session.startedAt,
        endedAt: now,
        durationMs: Math.round(engine.elapsedMs()),
        targetLength: engine.sequence.charCount,
        completedCount: engine.unitIndex,
        correctCount: engine.correctCount,
        errorCount: engine.incorrectCount,
        backspaceCount: engine.backspaceCount,
        wpm: metrics.grossWpm,
        cpm: metrics.cpm,
        accuracy: metrics.accuracy,
        layoutId: session.layout.id,
        layoutVersion,
        contentVersion,
        status: reason,
      });

      if (session.kind === "lesson") {
        const passed = reason === "completed" && passes(metrics, lesson.completion.minAccuracy, lesson.completion.minWpm);
        await backend.saveExerciseResult({
          studentId: active.id,
          lessonId: session.lessonId ?? "",
          exerciseId: session.lessonId ?? "",
          level: lesson.level,
          lessonNumber: lesson.number,
          attempt: session.attempt,
          startedAt: session.startedAt,
          endedAt: now,
          durationMs: Math.round(engine.elapsedMs()),
          wpm: metrics.grossWpm,
          cpm: metrics.cpm,
          accuracy: metrics.accuracy,
          correctCount: engine.correctCount,
          errorCount: engine.incorrectCount,
          totalCount: engine.sequence.units.length,
          backspaceCount: engine.backspaceCount,
          passed,
          layoutId: session.layout.id,
          layoutVersion,
          contentVersion,
        });
        await useLessonStore.getState().saveProgress({
          studentId: active.id,
          lessonId: session.lessonId ?? "",
          level: lesson.level,
          lessonNumber: lesson.number,
          wpm: metrics.grossWpm,
          accuracy: metrics.accuracy,
          completed: passed,
          contentVersion,
        });
        await saveStatistics(active.id, session.layout.id);
        // Compute how this attempt moved the lesson toward mastery (Phase 12).
        // The current attempt has already been persisted by saveExerciseResult
        // above, so the fetched history includes it.
        let masteryDelta: MasteryDelta | undefined;
        try {
          const history = await backend.listExerciseResults(active.id);
          const attemptsForLesson = history
            .filter((r) => r.lessonId === session.lessonId)
            .sort((a, b) => a.attempt - b.attempt)
            .map((r) => ({ passed: r.passed, accuracy: r.accuracy }));
          masteryDelta = projectMasteryDelta(attemptsForLesson, lesson.completion.minAccuracy);
        } catch {
          masteryDelta = undefined;
        }
        return recordProgression(metrics, passed, reason).then((newlyUnlocked) =>
          set({
            result: {
              lessonId: session.lessonId,
              mode: session.mode,
              metrics,
              passed,
              finishReason: reason,
              attempt: session.attempt,
              newlyUnlocked,
              masteryDelta,
            },
            status: "finished",
          }),
        );
      }

      if (session.kind === "drill") {
        // Drills are practice: they count toward practice/achievement stats and
        // key/finger weakness tracking, but are never a lesson or a test result.
        await saveStatistics(active.id, session.layout.id);
        return recordProgression(metrics, true, reason).then((newlyUnlocked) =>
          set({
            result: {
              mode: session.mode,
              metrics,
              passed: true,
              finishReason: reason,
              attempt: session.attempt,
              newlyUnlocked,
            },
            status: "finished",
          }),
        );
      }

      const test = session.test!;
      const passedAccuracy = metrics.accuracy >= test.minAccuracy;
      const passedWpm = test.minWpm === null ? null : metrics.grossWpm >= test.minWpm;
      const passed = reason === "completed" && passedAccuracy && (passedWpm === null || passedWpm);
      await backend.saveTestResult({
        studentId: active.id,
        testId: test.id,
        attempt: session.attempt,
        wpm: metrics.grossWpm,
        cpm: metrics.cpm,
        accuracy: metrics.accuracy,
        errors: engine.incorrectCount,
        correctCount: engine.correctCount,
        durationSeconds: Math.round(engine.elapsedSeconds()),
        passed,
        passedAccuracy,
        passedWpm,
        layoutId: session.layout.id,
        contentVersion,
      });
      await saveStatistics(active.id, session.layout.id);
      return recordProgression(metrics, passed, reason).then((newlyUnlocked) =>
        set({
          result: {
            testId: test.id,
            mode: session.mode,
            metrics,
            passed,
            finishReason: reason,
            attempt: session.attempt,
            newlyUnlocked,
          },
          status: "finished",
        }),
      );
    } catch (error) {
      // Show the result anyway, flagging that it could not be saved.
      saveError = error instanceof Error ? error.message : String(error);
      if (session.kind === "lesson") {
        const passed = reason === "completed" && passes(metrics, lesson.completion.minAccuracy, lesson.completion.minWpm);
        set({
          result: {
            lessonId: session.lessonId,
            mode: session.mode,
            metrics,
            passed,
            finishReason: reason,
            attempt: session.attempt,
            newlyUnlocked: [],
            saveError,
          },
          status: "finished",
        });
      } else if (session.kind === "drill") {
        set({
          result: {
            mode: session.mode,
            metrics,
            passed: true,
            finishReason: reason,
            attempt: session.attempt,
            newlyUnlocked: [],
            saveError,
          },
          status: "finished",
        });
      } else {
        const test = session.test!;
        const passedAccuracy = metrics.accuracy >= test.minAccuracy;
        const passedWpm = test.minWpm === null ? null : metrics.grossWpm >= test.minWpm;
        const passed = reason === "completed" && passedAccuracy && (passedWpm === null || passedWpm);
        set({
          result: {
            testId: test.id,
            mode: session.mode,
            metrics,
            passed,
            finishReason: reason,
            attempt: session.attempt,
            newlyUnlocked: [],
            saveError,
          },
          status: "finished",
        });
      }
    }
  },

  clear: () => {
    unbindKeys();
    set({ session: null, engine: null, status: "idle", result: null, error: null, wrongFlash: null, tick: 0 });
  },

  clearError: () => set({ error: null }),

  getLiveStats: () => {
    const { engine, session } = get();
    return liveStats(engine, session?.resolved.totalUnits ?? 0);
  },

  expectedKey: () => {
    const { engine } = get();
    const unit = engine?.expectedUnit ?? null;
    if (!unit) return null;
    return { code: unit.keyCode, modifier: unit.modifier };
  },
}));

function passes(metrics: ScoreMetrics, minAccuracy: number, minWpm: number | null): boolean {
  if (metrics.accuracy < minAccuracy) return false;
  if (minWpm !== null && metrics.grossWpm < minWpm) return false;
  return true;
}

function createEngine(session: TypingSessionState): TypingEngine {
  const engine = new TypingEngine({
    sequence: session.resolved.sequence,
    layout: session.layout,
    mode: session.mode,
    durationSeconds: session.kind === "test" ? session.test!.durationSeconds : undefined,
    onEvent: (event) => {
        useTypingStore.setState((state) => ({ tick: state.tick + 1 }));
        if (event.type === "incorrect" || event.type === "backspace") {
        useTypingStore.setState({ wrongFlash: { unitIndex: event.expected?.index ?? 0, at: Date.now() } });
      } else if (event.type === "correct") {
        useTypingStore.setState({ wrongFlash: null });
      }
      if (event.type === "finish" || event.type === "time-up") {
        bindKeys();
        window.setTimeout(() => {
          void useTypingStore.getState().persistAndFinish();
        }, 60);
      }
      const current = useTypingStore.getState().status;
      const next = engine.status;
      if (current !== next) {
        useTypingStore.setState({ status: next });
      }
    },
  });
  return engine;
}

function bindKeys() {
  unbindKeys();
  const onKey = (event: KeyboardEvent) => {
    const { engine, status } = useTypingStore.getState();
    if (!engine) return;
    if (status !== "running" && status !== "ready") return;
    if (status === "ready") {
      useTypingStore.getState().start();
    }
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.repeat) return;
    if (IGNORED_CODES.has(event.code)) return;
    if (event.code === "Backspace") {
      engine.processKey("Backspace", "none");
      return;
    }
    event.preventDefault();
    const modifier = modifierFromEvent(event);
    const expected = engine.expectedUnit;
    const correct = expected ? expected.keyCode === event.code && expected.modifier === modifier : event.code === "Space";
    engine.processKey(event.code, modifier);
    if (useUiStore.getState().soundEnabled) {
      if (correct) playKeySound(true);
      else playErrorSound();
    }
    const { engine: after } = useTypingStore.getState();
    if (after && (after.status === "finished" || after.finishReason !== null)) {
      useTypingStore.setState({ status: after.status });
    }
  };
  window.addEventListener("keydown", onKey as EventListener);
  (window as unknown as { __otKeyHandler?: EventListener }).__otKeyHandler = onKey as EventListener;
}

function unbindKeys() {
  const handler = (window as unknown as { __otKeyHandler?: EventListener }).__otKeyHandler;
  if (handler) {
    window.removeEventListener("keydown", handler);
    delete (window as unknown as { __otKeyHandler?: EventListener }).__otKeyHandler;
  }
}

async function saveStatistics(studentId: string, layoutId: string) {
  const { engine } = useTypingStore.getState();
  if (!engine) return;
  const layout = engine.layout;
  const keyStats: TypingStatRecord[] = [];
  const fingerAgg = new Map<string, { correct: number; incorrect: number }>();
  for (const [keyId, outcome] of engine.keyOutcomes) {
    if (outcome.correct > 0 || outcome.incorrect > 0) {
      keyStats.push({ key: keyId, layoutId, correct: outcome.correct, incorrect: outcome.incorrect });
      const idx = keyId.indexOf(":");
      const code = idx === -1 ? keyId : keyId.slice(0, idx);
      const finger = layout.getKey(code)?.finger;
      if (finger) {
        const agg = fingerAgg.get(finger) ?? { correct: 0, incorrect: 0 };
        agg.correct += outcome.correct;
        agg.incorrect += outcome.incorrect;
        fingerAgg.set(finger, agg);
      }
    }
  }
  const fingerStats: TypingStatRecord[] = [...fingerAgg.entries()].map(([finger, o]) => ({
    key: finger,
    layoutId,
    correct: o.correct,
    incorrect: o.incorrect,
  }));
  try {
    await backend.saveStatistics({ studentId, keyStats, fingerStats, characterStats: [] });
  } catch {
    // statistics are best-effort
  }
}

async function recordProgression(
  metrics: ScoreMetrics,
  passed: boolean,
  reason: "completed" | "time-up",
): Promise<string[]> {
  const { engine, session } = useTypingStore.getState();
  const active = useStudentStore.getState().active;
  let records: AchievementRecord[] = [];
  if (engine && session && active && reason === "completed") {
    records = await useProgressionStore
      .getState()
      .onSessionFinished({
        studentId: active.id,
        durationMs: Math.round(engine.elapsedMs()),
        wpm: metrics.grossWpm,
        accuracy: metrics.accuracy,
        completed: true,
      })
      .catch(() => []);
  }
  const sound = useUiStore.getState().soundEnabled;
  if (sound) {
    if (records.length > 0) playAchievementSound();
    else if (passed) playCompletionSound();
  }
  return records.map((a) => a.achievementId);
}
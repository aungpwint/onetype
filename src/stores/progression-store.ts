import { create } from "zustand";
import * as backend from "../services/backend";
import type {
  AchievementRecord,
  StreakInfo,
  TrainingSummary,
} from "../services/types";

interface ProgressionState {
  streak: StreakInfo | null;
  unlocked: AchievementRecord[];
  summary: TrainingSummary | null;
  loaded: boolean;
  loading: boolean;
  load: (studentId: string) => Promise<void>;
  onSessionFinished: (session: {
    studentId: string;
    durationMs: number;
    wpm: number;
    accuracy: number;
    completed: boolean;
  }) => Promise<AchievementRecord[]>;
}

export const useProgressionStore = create<ProgressionState>((set) => ({
  streak: null,
  unlocked: [],
  summary: null,
  loaded: false,
  loading: false,

  load: async (studentId) => {
    if (!studentId) return;
    set({ loading: true });
    try {
      const today = backend.localDateString();
      const [streak, unlocked, summary] = await Promise.all([
        backend.getStreak(studentId, today),
        backend.getAchievements(studentId),
        backend.statsSummary(studentId),
      ]);
      set({ streak, unlocked, summary, loaded: true });
    } finally {
      set({ loading: false });
    }
  },

  onSessionFinished: async (session) => {
    if (!session.completed) return [];
    const today = backend.localDateString();
    let newly: AchievementRecord[] = [];
    try {
      const result = await backend.recordActivity(
        {
          studentId: session.studentId,
          activityDate: today,
          durationMs: session.durationMs,
          wpm: session.wpm,
          accuracy: session.accuracy,
        },
        today,
      );
      newly = result.newlyUnlocked;
    } catch {
      // streak/achievement recording is best-effort and must not break a finished session
    }
    // Refresh state
    void useProgressionStore
      .getState()
      .load(session.studentId)
      .catch(() => undefined);
    return newly;
  },
}));

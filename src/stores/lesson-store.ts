import { create } from "zustand";
import * as backend from "../services/backend";
import type { LessonProgress } from "../services/types";
import { listLessonsByLevel } from "../data/curriculum";
import type { LessonData } from "../data/curriculum/types";

interface LessonState {
  lessonsByLevel: Record<"beginner" | "intermediate" | "advanced", LessonData[]>;
  progress: Record<string, LessonProgress> | null;
  progressStudentId: string | null;
  loading: boolean;
  error: string | null;
  loadProgress: (studentId: string) => Promise<void>;
  clearProgress: () => void;
  saveProgress: (req: Parameters<typeof backend.saveLessonProgress>[0]) => Promise<LessonProgress>;
  uncompletedLessonsForLevel: (level: "beginner" | "intermediate" | "advanced") => LessonData[];
}

export const useLessonStore = create<LessonState>((set, get) => ({
  lessonsByLevel: listLessonsByLevel(),
  progress: null,
  progressStudentId: null,
  loading: false,
  error: null,
  loadProgress: async (studentId) => {
    set({ loading: true, error: null });
    try {
      const rows = await backend.listLessonProgress(studentId);
      const map: Record<string, LessonProgress> = {};
      for (const row of rows) map[row.lessonId] = row;
      set({ progress: map, progressStudentId: studentId, loading: false });
    } catch (error) {
      set({ loading: false, error: error instanceof Error ? error.message : String(error) });
    }
  },
  clearProgress: () => set({ progress: null, progressStudentId: null }),
  saveProgress: async (req) => {
    const saved = await backend.saveLessonProgress(req);
    set((state) => {
      if (state.progressStudentId !== req.studentId) return { progress: state.progress };
      const map = { ...(state.progress ?? {}) };
      map[req.lessonId] = saved;
      return { progress: map };
    });
    return saved;
  },
  uncompletedLessonsForLevel: (level) => {
    const progress = get().progress ?? {};
    return get()
      .lessonsByLevel[level].slice()
      .sort((a, b) => a.number - b.number)
      .filter((lesson) => !progress[lesson.id]?.completed);
  },
}));
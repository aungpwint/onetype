import { create } from "zustand";
import * as backend from "../services/backend";
import type { CreateStudentRequest, Student, UpdateStudentRequest } from "../services/types";

interface StudentState {
  students: Student[];
  active: Student | null;
  loading: boolean;
  error: string | null;
  loaded: boolean;
  load: () => Promise<void>;
  create: (req: CreateStudentRequest) => Promise<Student>;
  update: (req: UpdateStudentRequest) => Promise<Student>;
  remove: (id: string) => Promise<void>;
  select: (id: string) => Promise<Student>;
  ensureActive: () => Promise<Student | null>;
  clearError: () => void;
}

export const useStudentStore = create<StudentState>((set, get) => ({
  students: [],
  active: null,
  loading: false,
  error: null,
  loaded: false,
  load: async () => {
    set({ loading: true, error: null });
    try {
      const [students, active] = await Promise.all([backend.listStudents(), backend.getActiveStudent()]);
      set({ students, active, loading: false, loaded: true });
    } catch (error) {
      set({ loading: false, error: error instanceof Error ? error.message : String(error) });
    }
  },
  create: async (req) => {
    try {
      const created = await backend.createStudent(req);
      set((state) => ({ students: [...state.students, created], error: null }));
      return created;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  },
  update: async (req) => {
    const updated = await backend.updateStudent(req);
    set((state) => ({
      students: state.students.map((s) => (s.id === updated.id ? updated : s)),
      active: state.active?.id === updated.id ? updated : state.active,
    }));
    return updated;
  },
  remove: async (id) => {
    await backend.deleteStudent(id);
    const removedActive = get().active?.id === id;
    set((state) => ({
      students: state.students.filter((s) => s.id !== id),
      active: removedActive ? null : state.active,
    }));
  },
  select: async (id) => {
    const active = await backend.setActiveStudent(id);
    set((state) => ({
      students: state.students.map((s) => (s.id === active.id ? { ...s, active: true } : { ...s, active: false })),
      active,
    }));
    return active;
  },
  ensureActive: async () => {
    if (get().active) return get().active;
    if (!get().loaded) await get().load();
    const students = get().students;
    if (students.length === 0) return null;
    return get().select(students[0].id);
  },
  clearError: () => set({ error: null }),
}));
import type {
  CreateStudentRequest,
  ExerciseResult,
  ExportFile,
  ImportReport,
  KeyStatistic,
  LessonProgress,
  SaveExerciseResultRequest,
  SaveKeyStatsRequest,
  SaveLessonProgressRequest,
  SaveTestResultRequest,
  SaveTypingSessionRequest,
  Student,
  StudentDetail,
  TeacherOverview,
  TestResult,
  TypingSession,
  TypingStatRecord,
  TypingTest,
  UpdateStudentRequest,
  WeakFinger,
  WeakKey,
} from "./types";

const PREFIX = "onetype:local:";

const KEYS = {
  students: `${PREFIX}students`,
  lessonProgress: `${PREFIX}lessonProgress`,
  exerciseResults: `${PREFIX}exerciseResults`,
  typingSessions: `${PREFIX}typingSessions`,
  typingTests: `${PREFIX}typingTests`,
  testResults: `${PREFIX}testResults`,
  keyStats: `${PREFIX}keyStats`,
  fingerStats: `${PREFIX}fingerStats`,
  characterStats: `${PREFIX}characterStats`,
  settings: `${PREFIX}settings`,
  activeStudentId: `${PREFIX}activeStudentId`,
};

export const CONTENT_VERSION = 1;
export const LAYOUT_VERSION = 1;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

function newId(prefix: string): string {
  const hex = Array.from({ length: 8 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, "0")).join("");
  return `${prefix}_${hex}`;
}

function now(): number {
  return Date.now();
}

function nextStudentCode(): string {
  const students = read<Student[]>(KEYS.students, []);
  let max = 0;
  for (const student of students) {
    const match = /^STU(\d+)$/.exec(student.studentCode);
    if (match) max = Math.max(max, Number.parseInt(match[1], 10));
  }
  return `STU${String(max + 1).padStart(3, "0")}`;
}

function clampAccuracy(student: Student): Student {
  return student;
}

function seedTestsIfMissing() {
  if (read<TypingTest[]>(KEYS.typingTests, []).length > 0) return;
  write(KEYS.typingTests, [
    heroTest("t1min", "test-1min", "1-Minute Test", 60, "myanmar", 85, 20),
    heroTest("t3min", "test-3min", "3-Minute Test", 180, "myanmar", 85, 25),
    heroTest("t5min", "test-5min", "5-Minute Test", 300, "mixed", 90, 30),
    heroTest("t10min", "test-10min", "10-Minute Exam", 600, "mixed", 90, 35),
  ]);
}

function heroTest(id: string, code: string, name: string, durationSeconds: number, language: string, minAccuracy: number, minWpm: number | null): TypingTest {
  return { id, code, name, durationSeconds, language, layoutId: "myanmar3", minAccuracy, minWpm, contentVersion: CONTENT_VERSION };
}

function ensureSeeded() {
  seedTestsIfMissing();
}

export const localBackend = {
  listStudents: async (): Promise<Student[]> => {
    ensureSeeded();
    return read<Student[]>(KEYS.students, []);
  },

  createStudent: async (req: CreateStudentRequest): Promise<Student> => {
    ensureSeeded();
    const students = read<Student[]>(KEYS.students, []);
    const studentCode = req.studentCode ?? nextStudentCode();
    const name = req.name.trim();
    if (!name) throw new Error("Student name is required.");
    const student: Student = {
      id: newId("stu"),
      studentCode,
      name,
      displayName: req.displayName ?? name,
      avatar: null,
      active: false,
      createdAt: now(),
      updatedAt: now(),
    };
    students.push(student);
    write(KEYS.students, students);
    return student;
  },

  updateStudent: async (req: UpdateStudentRequest): Promise<Student> => {
    const students = read<Student[]>(KEYS.students, []);
    const index = students.findIndex((s) => s.id === req.id);
    if (index < 0) throw new Error(`Student not found: ${req.id}`);
    const student = students[index];
    students[index] = clampAccuracy({
      ...student,
      name: req.name ?? student.name,
      displayName: req.displayName ?? student.displayName ?? req.name ?? student.name,
      avatar: req.avatar ?? student.avatar,
      updatedAt: now(),
    });
    write(KEYS.students, students);
    return students[index];
  },

  deleteStudent: async (id: string): Promise<void> => {
    const students = read<Student[]>(KEYS.students, []).filter((s) => s.id !== id);
    write(KEYS.students, students);
    const active = localStorage.getItem(KEYS.activeStudentId);
    if (active === id) localStorage.removeItem(KEYS.activeStudentId);
    for (const key of [KEYS.lessonProgress, KEYS.exerciseResults, KEYS.typingSessions, KEYS.testResults]) {
      write(
        key,
        read<{ studentId: string }[]>(key, []).filter((row) => row.studentId !== id),
      );
    }
  },

  setActiveStudent: async (id: string): Promise<Student> => {
    const students = read<Student[]>(KEYS.students, []);
    const target = students.find((s) => s.id === id);
    if (!target) throw new Error(`Student not found: ${id}`);
    const updated = students.map((s) => ({ ...s, active: s.id === id, updatedAt: now() }));
    write(KEYS.students, updated);
    write(KEYS.activeStudentId, id);
    return updated.find((s) => s.id === id) as Student;
  },

  getActiveStudent: async (): Promise<Student | null> => {
    ensureSeeded();
    const id = localStorage.getItem(KEYS.activeStudentId);
    if (!id) return null;
    const active = read<Student[]>(KEYS.students, []).find((s) => s.id === id);
    if (active?.active) return active;
    return active ?? null;
  },

  listLessonProgress: async (studentId: string): Promise<LessonProgress[]> => {
    return read<LessonProgress[]>(KEYS.lessonProgress, []).filter((p) => p.studentId === studentId);
  },

  getLessonProgress: async (studentId: string, lessonId: string): Promise<LessonProgress | null> => {
    return read<LessonProgress[]>(KEYS.lessonProgress, []).find((p) => p.studentId === studentId && p.lessonId === lessonId) ?? null;
  },

  saveLessonProgress: async (req: SaveLessonProgressRequest): Promise<LessonProgress> => {
    const all = read<LessonProgress[]>(KEYS.lessonProgress, []);
    const index = all.findIndex((p) => p.studentId === req.studentId && p.lessonId === req.lessonId);
    const completed = req.completed;
    const next: LessonProgress = {
      studentId: req.studentId,
      lessonId: req.lessonId,
      level: req.level,
      lessonNumber: req.lessonNumber,
      bestWpm: Math.max(all[index]?.bestWpm ?? 0, req.wpm),
      bestAccuracy: Math.max(all[index]?.bestAccuracy ?? 0, req.accuracy),
      attempts: (all[index]?.attempts ?? 0) + 1,
      completions: (all[index]?.completions ?? 0) + (completed ? 1 : 0),
      completed: (all[index]?.completed ?? false) || completed,
      lastPracticedAt: now(),
      contentVersion: req.contentVersion,
    };
    if (index >= 0) all[index] = next;
    else all.push(next);
    write(KEYS.lessonProgress, all);
    return next;
  },

  listTypingSessions: async (studentId: string, limit: number): Promise<TypingSession[]> => {
    return read<TypingSession[]>(KEYS.typingSessions, [])
      .filter((s) => s.studentId === studentId)
      .sort((a, b) => b.startedAt - a.startedAt)
      .slice(0, limit);
  },

  saveTypingSession: async (req: SaveTypingSessionRequest): Promise<TypingSession> => {
    const session: TypingSession = { ...req, id: newId("ts") };
    const all = read<TypingSession[]>(KEYS.typingSessions, []);
    all.push(session);
    write(KEYS.typingSessions, all);
    return session;
  },

  listExerciseResults: async (studentId: string): Promise<ExerciseResult[]> => {
    return read<ExerciseResult[]>(KEYS.exerciseResults, [])
      .filter((r) => r.studentId === studentId)
      .sort((a, b) => b.endedAt - a.endedAt);
  },

  saveExerciseResult: async (req: SaveExerciseResultRequest): Promise<void> => {
    const all = read<ExerciseResult[]>(KEYS.exerciseResults, []).filter(
      (r) => !(r.studentId === req.studentId && r.exerciseId === req.exerciseId && r.attempt === req.attempt),
    );
    all.push({ ...req, id: newId("ex") });
    write(KEYS.exerciseResults, all);
  },

  nextExerciseAttempt: async (_studentId: string, exerciseId: string): Promise<number> => {
    const results = read<ExerciseResult[]>(KEYS.exerciseResults, []).filter((r) => r.exerciseId === exerciseId);
    return results.reduce((max, r) => Math.max(max, r.attempt), 0) + 1;
  },

  saveStatistics: async (req: SaveKeyStatsRequest): Promise<void> => {
    mergeStats(KEYS.keyStats, req.studentId, req.keyStats);
    mergeStats(KEYS.fingerStats, req.studentId, req.fingerStats);
    mergeStats(KEYS.characterStats, req.studentId, req.characterStats);
  },

  weakKeys: async (studentId: string, _layoutId: string, limit: number): Promise<WeakKey[]> => {
    return weakFrom(KEYS.keyStats, studentId).slice(0, limit);
  },

  weakFingers: async (studentId: string, _layoutId: string, limit: number): Promise<WeakFinger[]> => {
    return weakFrom(KEYS.fingerStats, studentId)
      .map((k) => ({ finger: k.key, accuracy: k.accuracy, attempts: k.attempts }))
      .slice(0, limit);
  },

  listTypingTests: async (): Promise<TypingTest[]> => {
    ensureSeeded();
    return read<TypingTest[]>(KEYS.typingTests, []);
  },

  listTestResults: async (studentId: string): Promise<TestResult[]> => {
    return read<TestResult[]>(KEYS.testResults, [])
      .filter((r) => r.studentId === studentId)
      .sort((a, b) => b.scoredOn - a.scoredOn);
  },

  saveTestResult: async (req: SaveTestResultRequest): Promise<TestResult> => {
    const result: TestResult = { ...req, id: newId("tr"), scoredOn: req.scoredOn ?? now() };
    const all = read<TestResult[]>(KEYS.testResults, []);
    all.push(result);
    write(KEYS.testResults, all);
    return result;
  },

  nextTestAttempt: async (_studentId: string, testId: string): Promise<number> => {
    const results = read<TestResult[]>(KEYS.testResults, []).filter((r) => r.testId === testId);
    return results.reduce((max, r) => Math.max(max, r.attempt), 0) + 1;
  },

  teacherOverview: async (): Promise<TeacherOverview> => {
    const students = read<Student[]>(KEYS.students, []);
    const summaries = await Promise.all(students.map((student) => summaryFor(student)));
    let totalMinutes = 0;
    let accSum = 0;
    let accCount = 0;
    for (const student of students) {
      const detail = await detailFor(student);
      totalMinutes += detail.totalMinutes;
      if (detail.totalSessions > 0) {
        accSum += detail.overallAccuracy;
        accCount += 1;
      }
    }
    return {
      studentCount: students.length,
      totalMinutes,
      avgAccuracy: accCount > 0 ? accSum / accCount : 0,
      avgWpm: 0,
      students: summaries,
    };
  },

  studentDetail: async (studentId: string): Promise<StudentDetail> => {
    const students = read<Student[]>(KEYS.students, []);
    const student = students.find((s) => s.id === studentId);
    if (!student) throw new Error(`Student not found: ${studentId}`);
    return detailFor(student);
  },

  getSettings: async (keys: string[]): Promise<Record<string, string>> => {
    const all = read<Record<string, string>>(KEYS.settings, {});
    const out: Record<string, string> = {};
    for (const key of keys) if (key in all) out[key] = all[key];
    return out;
  },

  allSettings: async (): Promise<Record<string, string>> => {
    return read<Record<string, string>>(KEYS.settings, {});
  },

  setSetting: async (key: string, value: string): Promise<void> => {
    const all = read<Record<string, string>>(KEYS.settings, {});
    all[key] = value;
    write(KEYS.settings, all);
  },

  exportAll: async (path: string, studentId?: string | null): Promise<ExportFile> => {
    const students = read<Student[]>(KEYS.students, []).filter((s) => !studentId || s.id === studentId);
    const studentData = await Promise.all(
      students.map(async (student) => {
        const detail = await detailFor(student);
        return {
          ...student,
          lessonProgress: detail.student ? await listFor(student.id) : [],
          exerciseResults: (await localBackend.listExerciseResults(student.id)) as ExerciseResult[],
          typingSessions: detail.recentSessions,
          testResults: detail.testResults,
          keyStats: read<KeyStatistic[]>(KEYS.keyStats, []).filter((k) => k.studentId === student.id),
          fingerStats: read<KeyStatistic[]>(KEYS.fingerStats, []).filter((k) => k.studentId === student.id),
          characterStats: read<KeyStatistic[]>(KEYS.characterStats, []).filter((k) => k.studentId === student.id),
        };
      }),
    );
    const exportFile: ExportFile = {
      format: "onetype-backup",
      version: 1,
      exportedAt: now(),
      schemaVersion: 3,
      students: studentData,
      lessonProgress: [],
      exerciseResults: [],
      typingSessions: [],
      testResults: [],
      settings: read<Record<string, string>>(KEYS.settings, {}),
    };
    if (path) localStorage.setItem(`${PREFIX}lastExport`, JSON.stringify(exportFile));
    return exportFile;
  },

  importFile: async (path: string): Promise<ImportReport> => {
    const raw = localStorage.getItem(`${PREFIX}import:${path}`);
    if (!raw) throw new Error("Import source not found for browser dev mode.");
    const file = JSON.parse(raw) as ExportFile;
    if (file.format !== "onetype-backup") throw new Error(`Unsupported format: ${file.format}`);
    if (file.version !== 1) throw new Error(`Unsupported version: ${file.version}`);
    const existing = read<Student[]>(KEYS.students, []);
    const existingCodes = new Set(existing.map((s) => s.studentCode));
    const skipped: string[] = [];
    const imported: Student[] = [...existing];
    for (const entry of file.students) {
      if (existingCodes.has(entry.studentCode)) {
        skipped.push(`${entry.studentCode} (duplicate)`);
        continue;
      }
      const student: Student = {
        id: newId("stu"),
        studentCode: entry.studentCode,
        name: entry.name,
        displayName: entry.displayName ?? entry.name,
        avatar: entry.avatar ?? null,
        active: false,
        createdAt: now(),
        updatedAt: now(),
      };
      imported.push(student);
      for (const p of entry.lessonProgress) {
        writeCumulative(KEYS.lessonProgress, { ...p, studentId: student.id, lessonId: p.lessonId });
      }
      for (const r of entry.exerciseResults) {
        write(KEYS.exerciseResults, [...read(KEYS.exerciseResults, []), { ...r, id: newId("ex"), studentId: student.id }]);
      }
      for (const s of entry.typingSessions) {
        write(KEYS.typingSessions, [...read(KEYS.typingSessions, []), { ...s, id: newId("ts"), studentId: student.id }]);
      }
      for (const t of entry.testResults) {
        write(KEYS.testResults, [...read(KEYS.testResults, []), { ...t, id: newId("tr"), studentId: student.id }]);
      }
      existingCodes.add(student.studentCode);
    }
    write(KEYS.students, imported);
    return { importedStudents: file.students.length - skipped.length, skippedStudents: skipped, errors: [] };
  },
};

function listFor(studentId: string): Promise<LessonProgress[]> {
  return localBackend.listLessonProgress(studentId);
}

function mergeStats(storeKey: string, studentId: string, records: TypingStatRecord[]) {
  const all = read<KeyStatistic[]>(storeKey, []);
  const map = new Map<string, KeyStatistic>();
  for (const stat of all) if (stat.studentId === studentId) map.set(stat.keyId, stat);
  for (const record of records) {
    const existing = map.get(record.key);
    const correct = (existing?.correct ?? 0) + record.correct;
    const incorrect = (existing?.incorrect ?? 0) + record.incorrect;
    map.set(record.key, {
      id: existing?.id ?? newId("st"),
      studentId,
      keyId: record.key,
      layoutId: record.layoutId,
      correct,
      incorrect,
      accuracy: correct + incorrect > 0 ? (correct / (correct + incorrect)) * 100 : 0,
    });
  }
  write(storeKey, Array.from(map.values()));
}

function weakFrom(storeKey: string, studentId: string): WeakKey[] {
  return read<KeyStatistic[]>(storeKey, [])
    .filter((k) => k.studentId === studentId && k.correct + k.incorrect > 0)
    .map((k) => ({ key: k.keyId, accuracy: k.accuracy, attempts: k.correct + k.incorrect }))
    .sort((a, b) => a.accuracy - b.accuracy);
}

function writeCumulative(storeKey: string, progress: LessonProgress): void {
  const all = read<LessonProgress[]>(storeKey, []);
  const index = all.findIndex((p) => p.studentId === progress.studentId && p.lessonId === progress.lessonId);
  if (index >= 0) {
    const existing = all[index];
    all[index] = {
      ...existing,
      bestWpm: Math.max(existing.bestWpm, progress.bestWpm),
      bestAccuracy: Math.max(existing.bestAccuracy, progress.bestAccuracy),
      attempts: Math.max(existing.attempts, progress.attempts),
      completions: Math.max(existing.completions, progress.completions),
      completed: existing.completed || progress.completed,
      lastPracticedAt: Math.max(existing.lastPracticedAt, progress.lastPracticedAt),
    };
  } else {
    all.push(progress);
  }
  write(storeKey, all);
}

async function detailFor(student: Student): Promise<StudentDetail> {
  const sessions = await localBackend.listTypingSessions(student.id, 50);
  const lessonProgress = await localBackend.listLessonProgress(student.id);
  const testResults = await localBackend.listTestResults(student.id);
  const completedByLevel: Record<string, number> = {};
  for (const p of lessonProgress) {
    if (p.completed) completedByLevel[p.level] = (completedByLevel[p.level] ?? 0) + 1;
  }
  const lessonCounts = Object.entries(completedByLevel).map(([level, completed]) => ({
    level,
    completed,
    total: level === "beginner" ? 40 : level === "intermediate" ? 30 : 36,
  }));
  const totalSessions = sessions.length;
  const completed = sessions.filter((s) => s.correctCount > 0);
  let totalMinutes = 0;
  let accSum = 0;
  let wpmSum = 0;
  for (const s of completed) {
    totalMinutes += s.durationMs / 60000;
    accSum += s.accuracy;
    wpmSum += s.wpm;
  }
  const overallAccuracy = completed.length > 0 ? accSum / completed.length : 0;
  const overallWpm = completed.length > 0 ? wpmSum / completed.length : 0;
  return {
    student,
    overallAccuracy,
    overallWpm,
    totalMinutes,
    totalSessions,
    lessonCounts,
    weakKeys: await localBackend.weakKeys(student.id, "myanmar3", 5),
    weakFingers: await localBackend.weakFingers(student.id, "myanmar3", 5),
    recentSessions: sessions,
    testResults,
  };
}

async function summaryFor(student: Student): Promise<TeacherOverview["students"][number]> {
  const detail = await detailFor(student);
  let progress = 0;
  let level: string | null = null;
  let lessonNumber: number | null = null;
  for (const lc of detail.lessonCounts) {
    if (lc.total > 0) {
      if (lc.completed > 0) {
        level = lc.level;
        lessonNumber = Math.min(lc.completed + 1, lc.total);
      }
      progress = Math.max(progress, lc.total > 0 ? lc.completed / lc.total : 0);
    }
  }
  return {
    student,
    level,
    lessonNumber,
    progress,
    accuracy: detail.overallAccuracy,
    wpm: detail.overallWpm,
    totalMinutes: detail.totalMinutes,
    lastPracticedAt: detail.recentSessions[0]?.startedAt ?? null,
    attempts: detail.totalSessions,
  };
}
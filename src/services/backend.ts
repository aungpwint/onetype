import { invokeCommand, isTauriRuntime, pickOpenFile, pickSavePath } from "./ipc";
import { localBackend } from "./local";
import type {
  AchievementRecord,
  CreateStudentRequest,
  ExportFile,
  ImportReport,
  LessonProgress,
  RecordActivityRequest,
  RecordActivityResult,
  SaveExerciseResultRequest,
  SaveKeyStatsRequest,
  SaveLessonProgressRequest,
  SaveTestResultRequest,
  SaveTypingSessionRequest,
  StreakInfo,
  Student,
  StudentDetail,
  TeacherOverview,
  TestResult,
  TrainingSummary,
  TypingSession,
  TypingTest,
  UpdateStudentRequest,
  WeakFinger,
  WeakKey,
} from "./types";

export async function listStudents(): Promise<Student[]> {
  if (!isTauriRuntime()) return localBackend.listStudents();
  return invokeCommand("list_students");
}

export async function createStudent(req: CreateStudentRequest): Promise<Student> {
  if (!isTauriRuntime()) return localBackend.createStudent(req);
  return invokeCommand("create_student", { req });
}

export async function updateStudent(req: UpdateStudentRequest): Promise<Student> {
  if (!isTauriRuntime()) return localBackend.updateStudent(req);
  return invokeCommand("update_student", { req });
}

export async function deleteStudent(id: string): Promise<void> {
  if (!isTauriRuntime()) return localBackend.deleteStudent(id);
  return invokeCommand("delete_student", { id });
}

export async function setActiveStudent(id: string): Promise<Student> {
  if (!isTauriRuntime()) return localBackend.setActiveStudent(id);
  return invokeCommand("set_active_student", { id });
}

export async function getActiveStudent(): Promise<Student | null> {
  if (!isTauriRuntime()) return localBackend.getActiveStudent();
  return invokeCommand<Student | null>("get_active_student");
}

export async function saveLessonProgress(req: SaveLessonProgressRequest): Promise<LessonProgress> {
  if (!isTauriRuntime()) return localBackend.saveLessonProgress(req);
  return invokeCommand("save_lesson_progress", { req });
}

export async function getLessonProgress(studentId: string, lessonId: string): Promise<LessonProgress | null> {
  if (!isTauriRuntime()) return localBackend.getLessonProgress(studentId, lessonId);
  return invokeCommand("get_lesson_progress", { studentId, lessonId });
}

export async function listLessonProgress(studentId: string): Promise<LessonProgress[]> {
  if (!isTauriRuntime()) return localBackend.listLessonProgress(studentId);
  return invokeCommand("list_lesson_progress", { studentId });
}

export async function saveTypingSession(req: SaveTypingSessionRequest): Promise<TypingSession> {
  if (!isTauriRuntime()) return localBackend.saveTypingSession(req);
  return invokeCommand("save_typing_session", { req });
}

export async function listTypingSessions(studentId: string, limit = 30): Promise<TypingSession[]> {
  if (!isTauriRuntime()) return localBackend.listTypingSessions(studentId, limit);
  return invokeCommand("list_typing_sessions", { studentId, limit });
}

export async function saveExerciseResult(req: SaveExerciseResultRequest): Promise<void> {
  if (!isTauriRuntime()) return localBackend.saveExerciseResult(req);
  return invokeCommand("save_exercise_result", { req });
}

export async function listExerciseResults(studentId: string): Promise<ReturnType<typeof localBackend.listExerciseResults> extends Promise<infer T> ? T : never> {
  if (!isTauriRuntime()) return localBackend.listExerciseResults(studentId);
  return invokeCommand("list_exercise_results", { studentId });
}

export async function nextExerciseAttempt(studentId: string, exerciseId: string): Promise<number> {
  if (!isTauriRuntime()) return localBackend.nextExerciseAttempt(studentId, exerciseId);
  return invokeCommand("next_exercise_attempt", { studentId, exerciseId });
}

export async function saveStatistics(req: SaveKeyStatsRequest): Promise<void> {
  if (!isTauriRuntime()) return localBackend.saveStatistics(req);
  return invokeCommand("save_statistics", { req });
}

export async function weakKeys(studentId: string, layoutId: string, limit = 10): Promise<WeakKey[]> {
  if (!isTauriRuntime()) return localBackend.weakKeys(studentId, layoutId, limit);
  return invokeCommand("weak_keys", { studentId, layoutId, limit });
}

export async function weakFingers(studentId: string, layoutId: string, limit = 10): Promise<WeakFinger[]> {
  if (!isTauriRuntime()) return localBackend.weakFingers(studentId, layoutId, limit);
  return invokeCommand("weak_fingers", { studentId, layoutId, limit });
}

export async function listTypingTests(): Promise<TypingTest[]> {
  if (!isTauriRuntime()) return localBackend.listTypingTests();
  return invokeCommand("list_typing_tests");
}

export async function saveTestResult(req: SaveTestResultRequest): Promise<TestResult> {
  if (!isTauriRuntime()) return localBackend.saveTestResult(req);
  return invokeCommand("save_test_result", { req });
}

export async function listTestResults(studentId: string): Promise<TestResult[]> {
  if (!isTauriRuntime()) return localBackend.listTestResults(studentId);
  return invokeCommand("list_test_results", { studentId });
}

export async function nextTestAttempt(studentId: string, testId: string): Promise<number> {
  if (!isTauriRuntime()) return localBackend.nextTestAttempt(studentId, testId);
  return invokeCommand("next_test_attempt", { studentId, testId });
}

export async function teacherOverview(): Promise<TeacherOverview> {
  if (!isTauriRuntime()) return localBackend.teacherOverview();
  return invokeCommand("teacher_overview");
}

export async function studentDetail(studentId: string): Promise<StudentDetail> {
  if (!isTauriRuntime()) return localBackend.studentDetail(studentId);
  return invokeCommand("student_detail", { studentId });
}

export async function getSettings(keys: string[]): Promise<Record<string, string>> {
  if (!isTauriRuntime()) return localBackend.getSettings(keys);
  return invokeCommand("get_settings", { keys });
}

export async function allSettings(): Promise<Record<string, string>> {
  if (!isTauriRuntime()) return localBackend.allSettings();
  return invokeCommand("all_settings");
}

export async function setSetting(key: string, value: string): Promise<void> {
  if (!isTauriRuntime()) return localBackend.setSetting(key, value);
  return invokeCommand("set_setting", { req: { key, value } });
}

export async function exportAllTauri(path: string, studentId?: string | null): Promise<ExportFile> {
  return invokeCommand("export_all", { path, studentId: studentId ?? null });
}

export async function importFileTauri(path: string): Promise<ImportReport> {
  return invokeCommand("import_file", { path });
}

export async function exportBackup(studentId?: string | null): Promise<{ path: string; report: ExportFile } | null> {
  if (isTauriRuntime()) {
    const path = await pickSavePath();
    if (!path) return null;
    const report = await exportAllTauri(path, studentId ?? null);
    return { path, report };
  }
  const report = await localBackend.exportAll("", studentId ?? null);
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `onetype-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
  return { path: link.download, report };
}

export async function importBackup(): Promise<ImportReport | null> {
  if (isTauriRuntime()) {
    const path = await pickOpenFile();
    if (!path) return null;
    return importFileTauri(path);
  }
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  const picked = await new Promise<File | null>((resolve) => {
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });
  if (!picked) return null;
  const text = await picked.text();
  localStorage.setItem("onetype:local:import:demo", text);
  return localBackend.importFile("demo");
}

export async function recordActivity(req: RecordActivityRequest, today: string): Promise<RecordActivityResult> {
  if (!isTauriRuntime()) return localBackend.recordActivity(req, today);
  return invokeCommand("record_activity", { req, today });
}

export async function getStreak(studentId: string, today: string): Promise<StreakInfo> {
  if (!isTauriRuntime()) return localBackend.getStreak(studentId, today);
  return invokeCommand("get_streak", { studentId, today });
}

export async function getAchievements(studentId: string): Promise<AchievementRecord[]> {
  if (!isTauriRuntime()) return localBackend.getAchievements(studentId);
  return invokeCommand("get_achievements", { studentId });
}

export async function statsSummary(studentId: string): Promise<TrainingSummary> {
  if (!isTauriRuntime()) return localBackend.statsSummary(studentId);
  return invokeCommand("stats_summary", { studentId });
}

export async function checkDatabaseIntegrity(): Promise<string> {
  if (!isTauriRuntime()) return "Database integrity check is only available in the desktop app.";
  return invokeCommand("check_database_integrity");
}

export function localDateString(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export { isTauriRuntime };
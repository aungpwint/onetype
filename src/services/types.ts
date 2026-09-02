export interface Student {
  id: string;
  studentCode: string;
  name: string;
  displayName: string;
  avatar: string | null;
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface CreateStudentRequest {
  name: string;
  studentCode?: string | null;
  displayName?: string | null;
}

export interface UpdateStudentRequest {
  id: string;
  name?: string | null;
  displayName?: string | null;
  avatar?: string | null;
}

export interface LessonProgress {
  studentId: string;
  lessonId: string;
  level: string;
  lessonNumber: number;
  bestWpm: number;
  bestAccuracy: number;
  attempts: number;
  completions: number;
  completed: boolean;
  lastPracticedAt: number;
  contentVersion: number;
}

export interface SaveLessonProgressRequest {
  studentId: string;
  lessonId: string;
  level: string;
  lessonNumber: number;
  wpm: number;
  accuracy: number;
  completed: boolean;
  contentVersion: number;
}

export interface TypingSession {
  id: string;
  studentId: string;
  lessonId: string | null;
  exerciseId: string | null;
  level: string | null;
  lessonNumber: number | null;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  targetLength: number;
  completedCount: number;
  correctCount: number;
  errorCount: number;
  backspaceCount: number;
  wpm: number;
  cpm: number;
  accuracy: number;
  layoutId: string;
  layoutVersion: number;
  contentVersion: number;
  status: string;
}

export type SaveTypingSessionRequest = Omit<TypingSession, "id">;

export interface ExerciseResult {
  id: string;
  studentId: string;
  lessonId: string;
  exerciseId: string;
  level: string;
  lessonNumber: number;
  attempt: number;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  wpm: number;
  cpm: number;
  accuracy: number;
  correctCount: number;
  errorCount: number;
  totalCount: number;
  backspaceCount: number;
  passed: boolean;
  layoutId: string;
  layoutVersion: number;
  contentVersion: number;
}

export type SaveExerciseResultRequest = Omit<ExerciseResult, "id">;

export interface TypingTest {
  id: string;
  code: string;
  name: string;
  durationSeconds: number;
  language: string;
  layoutId: string;
  minAccuracy: number;
  minWpm: number | null;
  contentVersion: number;
}

export interface TestResult {
  id: string;
  studentId: string;
  testId: string;
  attempt: number;
  wpm: number;
  cpm: number;
  accuracy: number;
  errors: number;
  correctCount: number;
  durationSeconds: number;
  passed: boolean;
  passedAccuracy: boolean;
  passedWpm: boolean | null;
  scoredOn: number;
  layoutId: string;
  contentVersion: number;
}

export type SaveTestResultRequest = Omit<TestResult, "id" | "scoredOn"> & { scoredOn?: number };

export interface TypingStatRecord {
  key: string;
  layoutId: string;
  correct: number;
  incorrect: number;
}

export interface SaveKeyStatsRequest {
  studentId: string;
  keyStats: TypingStatRecord[];
  fingerStats: TypingStatRecord[];
  characterStats: TypingStatRecord[];
}

export interface WeakKey {
  key: string;
  accuracy: number;
  attempts: number;
}

export interface WeakFinger {
  finger: string;
  accuracy: number;
  attempts: number;
}

export interface LessonCount {
  level: string;
  completed: number;
  total: number;
}

export interface StudentDetail {
  student: Student;
  overallAccuracy: number;
  overallWpm: number;
  totalMinutes: number;
  totalSessions: number;
  lessonCounts: LessonCount[];
  weakKeys: WeakKey[];
  weakFingers: WeakFinger[];
  recentSessions: TypingSession[];
  testResults: TestResult[];
}

export interface StudentSummary {
  student: Student;
  level: string | null;
  lessonNumber: number | null;
  progress: number;
  accuracy: number;
  wpm: number;
  totalMinutes: number;
  lastPracticedAt: number | null;
  attempts: number;
}

export interface TeacherOverview {
  studentCount: number;
  totalMinutes: number;
  avgAccuracy: number;
  avgWpm: number;
  students: StudentSummary[];
}

export interface ImportReport {
  importedStudents: number;
  skippedStudents: string[];
  errors: string[];
}

export interface ExportStudentData extends Student {
  lessonProgress: LessonProgress[];
  exerciseResults: ExerciseResult[];
  typingSessions: TypingSession[];
  testResults: TestResult[];
  keyStats: KeyStatistic[];
  fingerStats: KeyStatistic[];
  characterStats: KeyStatistic[];
}

export interface KeyStatistic {
  id: string;
  studentId: string;
  keyId: string;
  layoutId: string;
  correct: number;
  incorrect: number;
  accuracy: number;
}

export interface ExportFile {
  format: string;
  version: number;
  exportedAt: number;
  schemaVersion: number;
  students: ExportStudentData[];
  lessonProgress: LessonProgress[];
  exerciseResults: ExerciseResult[];
  typingSessions: TypingSession[];
  testResults: TestResult[];
  settings: Record<string, string>;
}

export interface RecordActivityRequest {
  studentId: string;
  activityDate: string;
  durationMs: number;
  wpm: number;
  accuracy: number;
}

export interface AchievementRecord {
  achievementId: string;
  unlockedAt: number;
}

export interface RecordActivityResult {
  newlyUnlocked: AchievementRecord[];
}

export interface StreakInfo {
  current: number;
  longest: number;
}

export interface TrainingSummary {
  sessions: number;
  totalMinutes: number;
  avgAccuracy: number;
  avgWpm: number;
  bestWpm: number;
}

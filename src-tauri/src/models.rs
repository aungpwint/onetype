use serde::{Deserialize, Serialize};

pub fn now_millis() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

pub fn new_id(prefix: &str) -> String {
    let mut buf = [0u8; 8];
    for slot in buf.iter_mut() {
        *slot = rand_byte();
    }
    let hex: String = buf.iter().map(|b| format!("{b:02x}")).collect();
    format!("{prefix}_{hex}")
}

fn rand_byte() -> u8 {
    use std::time::{SystemTime, UNIX_EPOCH};
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    let seed = (nanos & 0xffff).to_le_bytes();
    let mut acc = 0u8;
    for b in seed {
        acc = acc.wrapping_mul(31).wrapping_add(b ^ (nanos & 0xff) as u8);
    }
    acc | 1
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Student {
    pub id: String,
    pub student_code: String,
    pub name: String,
    pub display_name: String,
    pub avatar: Option<String>,
    pub active: bool,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateStudentRequest {
    pub name: String,
    pub student_code: Option<String>,
    pub display_name: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateStudentRequest {
    pub id: String,
    pub name: Option<String>,
    pub display_name: Option<String>,
    pub avatar: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StudentSummary {
    pub student: Student,
    pub level: Option<String>,
    pub lesson_number: Option<i64>,
    pub progress: f64,
    pub accuracy: f64,
    pub wpm: f64,
    pub total_minutes: f64,
    pub last_practiced_at: Option<i64>,
    pub attempts: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LessonProgress {
    pub student_id: String,
    pub lesson_id: String,
    pub level: String,
    pub lesson_number: i64,
    pub best_wpm: f64,
    pub best_accuracy: f64,
    pub attempts: i64,
    pub completions: i64,
    pub completed: bool,
    pub last_practiced_at: i64,
    pub content_version: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveLessonProgressRequest {
    pub student_id: String,
    pub lesson_id: String,
    pub level: String,
    pub lesson_number: i64,
    pub wpm: f64,
    pub accuracy: f64,
    pub completed: bool,
    pub content_version: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TypingSession {
    pub id: String,
    pub student_id: String,
    pub lesson_id: Option<String>,
    pub exercise_id: Option<String>,
    pub level: Option<String>,
    pub lesson_number: Option<i64>,
    pub started_at: i64,
    pub ended_at: i64,
    pub duration_ms: i64,
    pub target_length: i64,
    pub completed_count: i64,
    pub correct_count: i64,
    pub error_count: i64,
    pub backspace_count: i64,
    pub wpm: f64,
    pub cpm: f64,
    pub accuracy: f64,
    pub layout_id: String,
    pub layout_version: i64,
    pub content_version: i64,
    pub status: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveTypingSessionRequest {
    pub student_id: String,
    pub lesson_id: Option<String>,
    pub exercise_id: Option<String>,
    pub level: Option<String>,
    pub lesson_number: Option<i64>,
    pub started_at: i64,
    pub ended_at: i64,
    pub duration_ms: i64,
    pub target_length: i64,
    pub completed_count: i64,
    pub correct_count: i64,
    pub error_count: i64,
    pub backspace_count: i64,
    pub wpm: f64,
    pub cpm: f64,
    pub accuracy: f64,
    pub layout_id: String,
    pub layout_version: i64,
    pub content_version: i64,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExerciseResult {
    pub id: String,
    pub student_id: String,
    pub lesson_id: String,
    pub exercise_id: String,
    pub level: String,
    pub lesson_number: i64,
    pub attempt: i64,
    pub started_at: i64,
    pub ended_at: i64,
    pub duration_ms: i64,
    pub wpm: f64,
    pub cpm: f64,
    pub accuracy: f64,
    pub correct_count: i64,
    pub error_count: i64,
    pub total_count: i64,
    pub backspace_count: i64,
    pub passed: bool,
    pub layout_id: String,
    pub layout_version: i64,
    pub content_version: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveExerciseResultRequest {
    pub student_id: String,
    pub lesson_id: String,
    pub exercise_id: String,
    pub level: String,
    pub lesson_number: i64,
    pub attempt: i64,
    pub started_at: i64,
    pub ended_at: i64,
    pub duration_ms: i64,
    pub wpm: f64,
    pub cpm: f64,
    pub accuracy: f64,
    pub correct_count: i64,
    pub error_count: i64,
    pub total_count: i64,
    pub backspace_count: i64,
    pub passed: bool,
    pub layout_id: String,
    pub layout_version: i64,
    pub content_version: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TypingTest {
    pub id: String,
    pub code: String,
    pub name: String,
    pub duration_seconds: i64,
    pub language: String,
    pub layout_id: String,
    pub min_accuracy: f64,
    pub min_wpm: Option<f64>,
    pub content_version: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TestResult {
    pub id: String,
    pub student_id: String,
    pub test_id: String,
    pub attempt: i64,
    pub wpm: f64,
    pub cpm: f64,
    pub accuracy: f64,
    pub errors: i64,
    pub correct_count: i64,
    pub duration_seconds: i64,
    pub passed: bool,
    pub passed_accuracy: bool,
    pub passed_wpm: Option<bool>,
    pub scored_on: i64,
    pub layout_id: String,
    pub content_version: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveTestResultRequest {
    pub student_id: String,
    pub test_id: String,
    pub attempt: i64,
    pub wpm: f64,
    pub cpm: f64,
    pub accuracy: f64,
    pub errors: i64,
    pub correct_count: i64,
    pub duration_seconds: i64,
    pub passed: bool,
    pub passed_accuracy: bool,
    pub passed_wpm: Option<bool>,
    pub layout_id: String,
    pub content_version: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KeyStatistic {
    pub id: String,
    pub student_id: String,
    pub key_id: String,
    pub layout_id: String,
    pub correct: i64,
    pub incorrect: i64,
    pub accuracy: f64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TypingStatRecord {
    pub key: String,
    pub layout_id: String,
    pub correct: i64,
    pub incorrect: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveKeyStatsRequest {
    pub student_id: String,
    pub key_stats: Vec<TypingStatRecord>,
    pub finger_stats: Vec<TypingStatRecord>,
    pub character_stats: Vec<TypingStatRecord>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WeakKey {
    pub key: String,
    pub accuracy: f64,
    pub attempts: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WeakFinger {
    pub finger: String,
    pub accuracy: f64,
    pub attempts: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StudentDetail {
    pub student: Student,
    pub overall_accuracy: f64,
    pub overall_wpm: f64,
    pub total_minutes: f64,
    pub total_sessions: i64,
    pub lesson_counts: Vec<LessonCount>,
    pub weak_keys: Vec<WeakKey>,
    pub weak_fingers: Vec<WeakFinger>,
    pub recent_sessions: Vec<TypingSession>,
    pub test_results: Vec<TestResult>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LessonCount {
    pub level: String,
    pub completed: i64,
    pub total: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TeacherOverview {
    pub student_count: i64,
    pub total_minutes: f64,
    pub avg_accuracy: f64,
    pub avg_wpm: f64,
    pub students: Vec<StudentSummary>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportReport {
    pub imported_students: usize,
    pub skipped_students: Vec<String>,
    pub errors: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportFile {
    pub format: String,
    pub version: i64,
    pub exported_at: i64,
    pub schema_version: i64,
    pub students: Vec<ExportStudent>,
    pub lesson_progress: Vec<LessonProgress>,
    pub exercise_results: Vec<ExerciseResult>,
    pub typing_sessions: Vec<TypingSession>,
    pub test_results: Vec<TestResult>,
    pub settings: std::collections::BTreeMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportStudent {
    #[serde(flatten)]
    pub student: Student,
    pub lesson_progress: Vec<LessonProgress>,
    pub exercise_results: Vec<ExerciseResult>,
    pub typing_sessions: Vec<TypingSession>,
    pub test_results: Vec<TestResult>,
    pub key_stats: Vec<KeyStatistic>,
    pub finger_stats: Vec<KeyStatistic>,
    pub character_stats: Vec<KeyStatistic>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetSettingRequest {
    pub key: String,
    pub value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DailyActivityAggregate {
    pub sessions: i64,
    pub total_minutes: f64,
    pub avg_accuracy: f64,
    pub avg_wpm: f64,
    pub best_wpm: f64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordActivityRequest {
    pub student_id: String,
    pub activity_date: String,
    pub duration_ms: i64,
    pub wpm: f64,
    pub accuracy: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AchievementRecord {
    pub achievement_id: String,
    pub unlocked_at: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StreakInfo {
    pub current: i64,
    pub longest: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordActivityResult {
    pub newly_unlocked: Vec<AchievementRecord>,
}

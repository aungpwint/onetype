use std::sync::Mutex;
use tauri::State;

use crate::error::Result;
use crate::models::*;
use crate::repositories as repo;
use crate::database::Database;

fn lock<'a>(state: &'a State<'_, Mutex<Database>>) -> Result<std::sync::MutexGuard<'a, Database>> {
    state
        .lock()
        .map_err(|_| crate::error::AppError::validation("Database is busy, please retry."))
}

#[tauri::command]
pub async fn list_students(state: State<'_, Mutex<Database>>) -> Result<Vec<Student>> {
    let db = lock(&state)?;
    repo::list_students(db.conn())
}

#[tauri::command]
pub async fn create_student(state: State<'_, Mutex<Database>>, req: CreateStudentRequest) -> Result<Student> {
    let db = lock(&state)?;
    repo::create_student(db.conn(), &req)
}

#[tauri::command]
pub async fn update_student(state: State<'_, Mutex<Database>>, req: UpdateStudentRequest) -> Result<Student> {
    let db = lock(&state)?;
    repo::update_student(db.conn(), &req)
}

#[tauri::command]
pub async fn delete_student(state: State<'_, Mutex<Database>>, id: String) -> Result<()> {
    let mut db = lock(&state)?;
    repo::delete_student(db.conn_mut(), &id)
}

#[tauri::command]
pub async fn set_active_student(state: State<'_, Mutex<Database>>, id: String) -> Result<Student> {
    let db = lock(&state)?;
    repo::set_active_student(db.conn(), &id)
}

#[tauri::command]
pub async fn get_active_student(state: State<'_, Mutex<Database>>) -> Result<Option<Student>> {
    let db = lock(&state)?;
    repo::get_active_student(db.conn())
}

#[tauri::command]
pub async fn save_lesson_progress(
    state: State<'_, Mutex<Database>>,
    req: SaveLessonProgressRequest,
) -> Result<LessonProgress> {
    let db = lock(&state)?;
    repo::save_lesson_progress(db.conn(), &req)
}

#[tauri::command]
pub async fn get_lesson_progress(
    state: State<'_, Mutex<Database>>,
    student_id: String,
    lesson_id: String,
) -> Result<Option<LessonProgress>> {
    let db = lock(&state)?;
    repo::get_lesson_progress(db.conn(), &student_id, &lesson_id)
}

#[tauri::command]
pub async fn list_lesson_progress(state: State<'_, Mutex<Database>>, student_id: String) -> Result<Vec<LessonProgress>> {
    let db = lock(&state)?;
    repo::list_lesson_progress(db.conn(), &student_id)
}

#[tauri::command]
pub async fn save_typing_session(
    state: State<'_, Mutex<Database>>,
    req: SaveTypingSessionRequest,
) -> Result<TypingSession> {
    let db = lock(&state)?;
    repo::save_typing_session(db.conn(), &req)
}

#[tauri::command]
pub async fn list_typing_sessions(
    state: State<'_, Mutex<Database>>,
    student_id: String,
    limit: i64,
) -> Result<Vec<TypingSession>> {
    let db = lock(&state)?;
    repo::list_typing_sessions(db.conn(), &student_id, limit)
}

#[tauri::command]
pub async fn save_exercise_result(
    state: State<'_, Mutex<Database>>,
    req: SaveExerciseResultRequest,
) -> Result<()> {
    let db = lock(&state)?;
    repo::save_exercise_result(db.conn(), &req)
}

#[tauri::command]
pub async fn list_exercise_results(
    state: State<'_, Mutex<Database>>,
    student_id: String,
) -> Result<Vec<ExerciseResult>> {
    let db = lock(&state)?;
    repo::list_exercise_results(db.conn(), &student_id)
}

#[tauri::command]
pub async fn next_exercise_attempt(
    state: State<'_, Mutex<Database>>,
    student_id: String,
    exercise_id: String,
) -> Result<i64> {
    let db = lock(&state)?;
    repo::next_exercise_attempt(db.conn(), &student_id, &exercise_id)
}

#[tauri::command]
pub async fn save_statistics(state: State<'_, Mutex<Database>>, req: SaveKeyStatsRequest) -> Result<()> {
    let db = lock(&state)?;
    repo::save_statistics(db.conn(), &req)
}

#[tauri::command]
pub async fn weak_keys(
    state: State<'_, Mutex<Database>>,
    student_id: String,
    layout_id: String,
    limit: i64,
) -> Result<Vec<WeakKey>> {
    let db = lock(&state)?;
    repo::weak_keys(db.conn(), &student_id, &layout_id, limit)
}

#[tauri::command]
pub async fn weak_fingers(
    state: State<'_, Mutex<Database>>,
    student_id: String,
    layout_id: String,
    limit: i64,
) -> Result<Vec<WeakFinger>> {
    let db = lock(&state)?;
    repo::weak_fingers(db.conn(), &student_id, &layout_id, limit)
}

#[tauri::command]
pub async fn list_typing_tests(state: State<'_, Mutex<Database>>) -> Result<Vec<TypingTest>> {
    let db = lock(&state)?;
    repo::list_typing_tests(db.conn())
}

#[tauri::command]
pub async fn save_test_result(state: State<'_, Mutex<Database>>, req: SaveTestResultRequest) -> Result<TestResult> {
    let db = lock(&state)?;
    repo::save_test_result(db.conn(), &req)
}

#[tauri::command]
pub async fn list_test_results(state: State<'_, Mutex<Database>>, student_id: String) -> Result<Vec<TestResult>> {
    let db = lock(&state)?;
    repo::list_test_results(db.conn(), &student_id)
}

#[tauri::command]
pub async fn next_test_attempt(
    state: State<'_, Mutex<Database>>,
    student_id: String,
    test_id: String,
) -> Result<i64> {
    let db = lock(&state)?;
    repo::next_test_attempt(db.conn(), &student_id, &test_id)
}

#[tauri::command]
pub async fn teacher_overview(state: State<'_, Mutex<Database>>) -> Result<TeacherOverview> {
    let db = lock(&state)?;
    repo::teacher_overview(db.conn())
}

#[tauri::command]
pub async fn student_detail(state: State<'_, Mutex<Database>>, student_id: String) -> Result<StudentDetail> {
    let db = lock(&state)?;
    repo::student_detail(db.conn(), &student_id)
}

#[tauri::command]
pub async fn get_settings(
    state: State<'_, Mutex<Database>>,
    keys: Vec<String>,
) -> Result<std::collections::BTreeMap<String, String>> {
    let db = lock(&state)?;
    repo::get_settings(db.conn(), &keys)
}

#[tauri::command]
pub async fn all_settings(state: State<'_, Mutex<Database>>) -> Result<std::collections::BTreeMap<String, String>> {
    let db = lock(&state)?;
    repo::all_settings(db.conn())
}

#[tauri::command]
pub async fn set_setting(state: State<'_, Mutex<Database>>, req: SetSettingRequest) -> Result<()> {
    let db = lock(&state)?;
    repo::set_setting(db.conn(), &req.key, &req.value)
}

#[tauri::command]
pub async fn export_all(
    state: State<'_, Mutex<Database>>,
    path: String,
    student_id: Option<String>,
) -> Result<ExportFile> {
    let mut db = lock(&state)?;
    crate::services::export_all(&mut db, path, student_id)
}

#[tauri::command]
pub async fn import_file(state: State<'_, Mutex<Database>>, path: String) -> Result<ImportReport> {
    let mut db = lock(&state)?;
    crate::services::import_file(&mut db, path)
}
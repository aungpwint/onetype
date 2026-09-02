use crate::error::{AppError, Result};
use crate::models::*;
use rusqlite::{params, Connection, OptionalExtension, Transaction};

fn require_student(conn: &Connection, student_id: &str) -> Result<()> {
    if get_student(conn, student_id)?.is_none() {
        return Err(AppError::not_found("Student not found."));
    }
    Ok(())
}

fn check_non_negative(value: f64, field: &str) -> Result<()> {
    if !value.is_finite() || value < 0.0 {
        return Err(AppError::validation(format!(
            "{field} must be a non-negative number."
        )));
    }
    Ok(())
}

fn check_accuracy(value: f64, field: &str) -> Result<()> {
    if !value.is_finite() || !(0.0..=100.0).contains(&value) {
        return Err(AppError::validation(format!(
            "{field} must be between 0 and 100."
        )));
    }
    Ok(())
}

fn check_positive(value: i64, field: &str) -> Result<()> {
    if value < 1 {
        return Err(AppError::validation(format!(
            "{field} must be a positive integer."
        )));
    }
    Ok(())
}

fn check_not_negative_i64(value: i64, field: &str) -> Result<()> {
    if value < 0 {
        return Err(AppError::validation(format!(
            "{field} must be non-negative."
        )));
    }
    Ok(())
}

fn row_to_student(row: &rusqlite::Row<'_>) -> rusqlite::Result<Student> {
    Ok(Student {
        id: row.get("id")?,
        student_code: row.get("student_code")?,
        name: row.get("name")?,
        display_name: row.get("display_name")?,
        avatar: row.get("avatar")?,
        active: row.get::<_, i64>("active")? != 0,
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
    })
}

fn next_student_code(conn: &Connection) -> Result<String> {
    let max: Option<String> = conn
        .query_row(
            "SELECT COALESCE(MAX(student_code), '') FROM students WHERE student_code LIKE 'STU%'",
            [],
            |r| r.get(0),
        )
        .optional()?;
    let next_number = max
        .and_then(|code| code.strip_prefix("STU").and_then(|n| n.parse::<i64>().ok()))
        .unwrap_or(0)
        + 1;
    Ok(format!("STU{}", next_number))
}

pub fn create_student(conn: &Connection, req: &CreateStudentRequest) -> Result<Student> {
    let name = req.name.trim();
    if name.is_empty() {
        return Err(AppError::validation("Student name is required."));
    }
    let code = match &req.student_code {
        Some(c) if !c.trim().is_empty() => c.trim().to_string(),
        _ => next_student_code(conn)?,
    };
    let id = new_id("stu");
    let display = req
        .display_name
        .as_deref()
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .unwrap_or(name)
        .to_string();
    let now = now_millis();
    conn.execute(
        "INSERT INTO students (id, student_code, name, display_name, avatar, active, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6, ?6)",
        params![id, code, name, display, Option::<String>::None, now],
    )?;
    // first student becomes active
    let count: i64 = conn.query_row("SELECT COUNT(*) FROM students", [], |r| r.get(0))?;
    if count == 1 {
        conn.execute("UPDATE students SET active = 1 WHERE id = ?1", params![id])?;
    }
    Ok(get_student(conn, &id)?.expect("just inserted"))
}

pub fn get_student(conn: &Connection, id: &str) -> Result<Option<Student>> {
    conn.query_row(
        "SELECT id, student_code, name, display_name, avatar, active, created_at, updated_at
         FROM students WHERE id = ?1",
        params![id],
        row_to_student,
    )
    .optional()
    .map_err(Into::into)
}

pub fn list_students(conn: &Connection) -> Result<Vec<Student>> {
    let mut stmt = conn.prepare(
        "SELECT id, student_code, name, display_name, avatar, active, created_at, updated_at
         FROM students ORDER BY created_at ASC",
    )?;
    let rows = stmt.query_map([], row_to_student)?;
    let mut out = Vec::new();
    for row in rows {
        out.push(row?);
    }
    Ok(out)
}

pub fn update_student(conn: &Connection, req: &UpdateStudentRequest) -> Result<Student> {
    let existing =
        get_student(conn, &req.id)?.ok_or_else(|| AppError::not_found("Student not found."))?;
    let name = req
        .name
        .as_deref()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .unwrap_or(existing.name.clone());
    let display_name = req
        .display_name
        .as_deref()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| name.clone());
    let avatar = if req.avatar.is_some() {
        req.avatar.clone()
    } else {
        existing.avatar
    };
    conn.execute(
        "UPDATE students SET name = ?1, display_name = ?2, avatar = ?3, updated_at = ?4 WHERE id = ?5",
        params![name, display_name, avatar, now_millis(), req.id],
    )?;
    Ok(get_student(conn, &req.id)?.expect("updated"))
}

pub fn delete_student(conn: &Connection, id: &str) -> Result<()> {
    let tx = conn.unchecked_transaction()?;
    for table in [
        "exercise_results",
        "lesson_progress",
        "typing_sessions",
        "test_results",
        "key_statistics",
        "finger_statistics",
        "character_statistics",
    ] {
        tx.execute(
            &format!("DELETE FROM {table} WHERE student_id = ?1"),
            params![id],
        )?;
    }
    let was_active: bool = {
        tx.query_row(
            "SELECT active FROM students WHERE id = ?1",
            params![id],
            |r| r.get::<_, i64>(0).map(|v| v != 0),
        )
        .optional()?
        .unwrap_or(false)
    };
    tx.execute("DELETE FROM students WHERE id = ?1", params![id])?;
    if was_active {
        if let Some(first) = tx
            .query_row(
                "SELECT id FROM students ORDER BY created_at ASC LIMIT 1",
                [],
                |r| r.get::<_, String>(0),
            )
            .optional()?
        {
            tx.execute(
                "UPDATE students SET active = 1 WHERE id = ?1",
                params![first],
            )?;
        }
    }
    tx.commit()?;
    Ok(())
}

pub fn set_active_student(conn: &Connection, id: &str) -> Result<Student> {
    if get_student(conn, id)?.is_none() {
        return Err(AppError::not_found("Student not found."));
    }
    let tx = conn.unchecked_transaction()?;
    tx.execute("UPDATE students SET active = 0", [])?;
    tx.execute(
        "UPDATE students SET active = 1, updated_at = ?1 WHERE id = ?2",
        params![now_millis(), id],
    )?;
    tx.commit()?;
    get_student(conn, id)?.ok_or_else(|| AppError::not_found("Student not found."))
}

pub fn get_active_student(conn: &Connection) -> Result<Option<Student>> {
    conn.query_row(
        "SELECT id, student_code, name, display_name, avatar, active, created_at, updated_at
         FROM students WHERE active = 1 LIMIT 1",
        [],
        row_to_student,
    )
    .optional()
    .map_err(Into::into)
}

// ---------- lesson progress ----------

const LESSON_PROGRESS_COLS: &str = "student_id, lesson_id, level, lesson_number, best_wpm, best_accuracy, attempts, completions, completed, last_practiced_at, content_version";

fn row_to_lesson_progress(row: &rusqlite::Row<'_>) -> rusqlite::Result<LessonProgress> {
    Ok(LessonProgress {
        student_id: row.get("student_id")?,
        lesson_id: row.get("lesson_id")?,
        level: row.get("level")?,
        lesson_number: row.get("lesson_number")?,
        best_wpm: row.get("best_wpm")?,
        best_accuracy: row.get("best_accuracy")?,
        attempts: row.get("attempts")?,
        completions: row.get("completions")?,
        completed: row.get::<_, i64>("completed")? != 0,
        last_practiced_at: row.get("last_practiced_at")?,
        content_version: row.get("content_version")?,
    })
}

pub fn save_lesson_progress(
    conn: &Connection,
    req: &SaveLessonProgressRequest,
) -> Result<LessonProgress> {
    require_student(conn, &req.student_id)?;
    check_not_negative_i64(req.lesson_number, "lessonNumber")?;
    check_non_negative(req.wpm, "wpm")?;
    check_accuracy(req.accuracy, "accuracy")?;
    conn.execute(
        "INSERT INTO lesson_progress (id, student_id, lesson_id, level, lesson_number, best_wpm, best_accuracy, attempts, completions, completed, last_practiced_at, content_version)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 1, ?8, ?9, ?10, ?11)
         ON CONFLICT(student_id, lesson_id) DO UPDATE SET
            best_wpm = MAX(best_wpm, excluded.best_wpm),
            best_accuracy = MAX(best_accuracy, excluded.best_accuracy),
            attempts = attempts + 1,
            completions = completions + excluded.completions,
            completed = MAX(completed, excluded.completed),
            last_practiced_at = excluded.last_practiced_at,
            content_version = MAX(content_version, excluded.content_version)",
        params![
            new_id("lp"),
            req.student_id,
            req.lesson_id,
            req.level,
            req.lesson_number,
            req.wpm,
            req.accuracy,
            if req.completed { 1 } else { 0 },
            if req.completed { 1 } else { 0 },
            now_millis(),
            req.content_version,
        ],
    )?;
    get_lesson_progress(conn, &req.student_id, &req.lesson_id)?
        .ok_or_else(|| AppError::not_found("Lesson progress not found."))
}

pub fn get_lesson_progress(
    conn: &Connection,
    student_id: &str,
    lesson_id: &str,
) -> Result<Option<LessonProgress>> {
    conn.query_row(
        &format!(
            "SELECT {LESSON_PROGRESS_COLS} FROM lesson_progress WHERE student_id = ?1 AND lesson_id = ?2"
        ),
        params![student_id, lesson_id],
        row_to_lesson_progress,
    )
    .optional()
    .map_err(Into::into)
}

pub fn list_lesson_progress(conn: &Connection, student_id: &str) -> Result<Vec<LessonProgress>> {
    let mut stmt = conn.prepare(&format!(
        "SELECT {LESSON_PROGRESS_COLS} FROM lesson_progress WHERE student_id = ?1 ORDER BY last_practiced_at DESC"
    ))?;
    let rows = stmt.query_map(params![student_id], row_to_lesson_progress)?;
    let mut out = Vec::new();
    for row in rows {
        out.push(row?);
    }
    Ok(out)
}

// ---------- typing sessions ----------

const TYPING_SESSION_COLS: &str = "id, student_id, lesson_id, exercise_id, level, lesson_number, started_at, ended_at, duration_ms, target_length, completed_count, correct_count, error_count, backspace_count, wpm, cpm, accuracy, layout_id, layout_version, content_version, status";

fn row_to_typing_session(row: &rusqlite::Row<'_>) -> rusqlite::Result<TypingSession> {
    Ok(TypingSession {
        id: row.get("id")?,
        student_id: row.get("student_id")?,
        lesson_id: row.get("lesson_id")?,
        exercise_id: row.get("exercise_id")?,
        level: row.get("level")?,
        lesson_number: row.get("lesson_number")?,
        started_at: row.get("started_at")?,
        ended_at: row.get("ended_at")?,
        duration_ms: row.get("duration_ms")?,
        target_length: row.get("target_length")?,
        completed_count: row.get("completed_count")?,
        correct_count: row.get("correct_count")?,
        error_count: row.get("error_count")?,
        backspace_count: row.get("backspace_count")?,
        wpm: row.get("wpm")?,
        cpm: row.get("cpm")?,
        accuracy: row.get("accuracy")?,
        layout_id: row.get("layout_id")?,
        layout_version: row.get("layout_version")?,
        content_version: row.get("content_version")?,
        status: row.get("status")?,
    })
}

pub fn save_typing_session(
    conn: &Connection,
    req: &SaveTypingSessionRequest,
) -> Result<TypingSession> {
    require_student(conn, &req.student_id)?;
    check_not_negative_i64(req.duration_ms, "durationMs")?;
    check_not_negative_i64(req.target_length, "targetLength")?;
    check_not_negative_i64(req.completed_count, "completedCount")?;
    check_not_negative_i64(req.correct_count, "correctCount")?;
    check_not_negative_i64(req.error_count, "errorCount")?;
    check_not_negative_i64(req.backspace_count, "backspaceCount")?;
    check_non_negative(req.wpm, "wpm")?;
    check_accuracy(req.accuracy, "accuracy")?;
    let id = new_id("ses");
    conn.execute(
        "INSERT INTO typing_sessions (id, student_id, lesson_id, exercise_id, level, lesson_number, started_at, ended_at, duration_ms, target_length, completed_count, correct_count, error_count, backspace_count, wpm, cpm, accuracy, layout_id, layout_version, content_version, status)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21)",
        params![
            id, req.student_id, req.lesson_id, req.exercise_id, req.level, req.lesson_number,
            req.started_at, req.ended_at, req.duration_ms, req.target_length,
            req.completed_count, req.correct_count, req.error_count, req.backspace_count,
            req.wpm, req.cpm, req.accuracy, req.layout_id, req.layout_version, req.content_version,
            req.status
        ],
    )?;
    Ok(conn.query_row(
        &format!("SELECT {TYPING_SESSION_COLS} FROM typing_sessions WHERE id = ?1"),
        params![id],
        row_to_typing_session,
    )?)
}

pub fn list_typing_sessions(
    conn: &Connection,
    student_id: &str,
    limit: i64,
) -> Result<Vec<TypingSession>> {
    let mut stmt = conn.prepare(&format!(
        "SELECT {TYPING_SESSION_COLS} FROM typing_sessions WHERE student_id = ?1 ORDER BY started_at DESC LIMIT ?2"
    ))?;
    let rows = stmt.query_map(params![student_id, limit], row_to_typing_session)?;
    let mut out = Vec::new();
    for row in rows {
        out.push(row?);
    }
    Ok(out)
}

// ---------- exercise results ----------

const EXERCISE_RESULT_COLS: &str = "id, student_id, lesson_id, exercise_id, level, lesson_number, attempt, started_at, ended_at, duration_ms, wpm, cpm, accuracy, correct_count, error_count, total_count, backspace_count, passed, layout_id, layout_version, content_version";

fn row_to_exercise_result(row: &rusqlite::Row<'_>) -> rusqlite::Result<ExerciseResult> {
    Ok(ExerciseResult {
        id: row.get("id")?,
        student_id: row.get("student_id")?,
        lesson_id: row.get("lesson_id")?,
        exercise_id: row.get("exercise_id")?,
        level: row.get("level")?,
        lesson_number: row.get("lesson_number")?,
        attempt: row.get("attempt")?,
        started_at: row.get("started_at")?,
        ended_at: row.get("ended_at")?,
        duration_ms: row.get("duration_ms")?,
        wpm: row.get("wpm")?,
        cpm: row.get("cpm")?,
        accuracy: row.get("accuracy")?,
        correct_count: row.get("correct_count")?,
        error_count: row.get("error_count")?,
        total_count: row.get("total_count")?,
        backspace_count: row.get("backspace_count")?,
        passed: row.get::<_, i64>("passed")? != 0,
        layout_id: row.get("layout_id")?,
        layout_version: row.get("layout_version")?,
        content_version: row.get("content_version")?,
    })
}

pub fn save_exercise_result(conn: &Connection, req: &SaveExerciseResultRequest) -> Result<()> {
    require_student(conn, &req.student_id)?;
    check_positive(req.attempt, "attempt")?;
    check_not_negative_i64(req.duration_ms, "durationMs")?;
    check_not_negative_i64(req.correct_count, "correctCount")?;
    check_not_negative_i64(req.error_count, "errorCount")?;
    check_not_negative_i64(req.total_count, "totalCount")?;
    check_not_negative_i64(req.backspace_count, "backspaceCount")?;
    check_non_negative(req.wpm, "wpm")?;
    check_accuracy(req.accuracy, "accuracy")?;
    conn.execute(
        "INSERT INTO exercise_results (id, student_id, lesson_id, exercise_id, level, lesson_number, attempt, started_at, ended_at, duration_ms, wpm, cpm, accuracy, correct_count, error_count, total_count, backspace_count, passed, layout_id, layout_version, content_version)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21)
         ON CONFLICT(student_id, exercise_id, attempt) DO UPDATE SET
            ended_at = excluded.ended_at,
            duration_ms = excluded.duration_ms,
            wpm = excluded.wpm,
            cpm = excluded.cpm,
            accuracy = excluded.accuracy,
            correct_count = excluded.correct_count,
            error_count = excluded.error_count,
            total_count = excluded.total_count,
            backspace_count = excluded.backspace_count,
            passed = MAX(passed, excluded.passed)",
        params![
            new_id("er"),
            req.student_id, req.lesson_id, req.exercise_id, req.level, req.lesson_number,
            req.attempt, req.started_at, req.ended_at, req.duration_ms,
            req.wpm, req.cpm, req.accuracy, req.correct_count, req.error_count,
            req.total_count, req.backspace_count, if req.passed { 1 } else { 0 },
            req.layout_id, req.layout_version, req.content_version
        ],
    )?;
    Ok(())
}

pub fn next_exercise_attempt(
    conn: &Connection,
    student_id: &str,
    exercise_id: &str,
) -> Result<i64> {
    let max: Option<i64> = conn
        .query_row(
            "SELECT MAX(attempt) FROM exercise_results WHERE student_id = ?1 AND exercise_id = ?2",
            params![student_id, exercise_id],
            |r| r.get::<_, Option<i64>>(0),
        )
        .optional()?
        .flatten();
    Ok(max.unwrap_or(0) + 1)
}

pub fn list_exercise_results(conn: &Connection, student_id: &str) -> Result<Vec<ExerciseResult>> {
    let mut stmt = conn.prepare(&format!(
        "SELECT {EXERCISE_RESULT_COLS} FROM exercise_results WHERE student_id = ?1 ORDER BY started_at DESC"
    ))?;
    let rows = stmt.query_map(params![student_id], row_to_exercise_result)?;
    let mut out = Vec::new();
    for row in rows {
        out.push(row?);
    }
    Ok(out)
}

// ---------- statistics ----------

pub fn save_statistics(conn: &Connection, req: &SaveKeyStatsRequest) -> Result<()> {
    if get_student(conn, &req.student_id)?.is_none() {
        return Err(AppError::not_found("Student not found."));
    }
    let tx = conn.unchecked_transaction()?;
    for record in &req.key_stats {
        upsert_stat(
            &tx,
            "key_statistics",
            "key_id",
            &req.student_id,
            &record.key,
            &record.layout_id,
            record.correct,
            record.incorrect,
        )?;
    }
    for record in &req.finger_stats {
        upsert_stat(
            &tx,
            "finger_statistics",
            "finger",
            &req.student_id,
            &record.key,
            &record.layout_id,
            record.correct,
            record.incorrect,
        )?;
    }
    for record in &req.character_stats {
        upsert_stat(
            &tx,
            "character_statistics",
            "character",
            &req.student_id,
            &record.key,
            &record.layout_id,
            record.correct,
            record.incorrect,
        )?;
    }
    tx.commit()?;
    Ok(())
}

#[allow(clippy::too_many_arguments)]
fn upsert_stat(
    tx: &Transaction<'_>,
    table: &str,
    target_col: &str,
    student_id: &str,
    key: &str,
    layout_id: &str,
    correct: i64,
    incorrect: i64,
) -> Result<()> {
    let total = correct + incorrect;
    let accuracy = if total == 0 {
        0.0
    } else {
        correct as f64 / total as f64 * 100.0
    };
    let sql = format!(
        "INSERT INTO {table} (id, student_id, {target_col}, layout_id, correct, incorrect, accuracy)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
         ON CONFLICT(student_id, layout_id, {target_col}) DO UPDATE SET
            correct = correct + excluded.correct,
            incorrect = incorrect + excluded.incorrect,
            accuracy = ((correct + excluded.correct) * 100.0) / (correct + incorrect + excluded.correct + excluded.incorrect)"
    );
    tx.execute(
        &sql,
        params![
            new_id("st"),
            student_id,
            key,
            layout_id,
            correct,
            incorrect,
            accuracy
        ],
    )?;
    Ok(())
}

pub fn weak_keys(
    conn: &Connection,
    student_id: &str,
    layout_id: &str,
    limit: i64,
) -> Result<Vec<WeakKey>> {
    let mut stmt = conn.prepare(
        "SELECT key_id, accuracy, (correct + incorrect) AS attempts FROM key_statistics
         WHERE student_id = ?1 AND (?2 = '%' OR layout_id = ?2) AND (correct + incorrect) > 0
         ORDER BY accuracy ASC LIMIT ?3",
    )?;
    let rows = stmt.query_map(params![student_id, layout_id, limit], |r| {
        Ok(WeakKey {
            key: r.get(0)?,
            accuracy: r.get(1)?,
            attempts: r.get(2)?,
        })
    })?;
    let mut out = Vec::new();
    for row in rows {
        out.push(row?);
    }
    Ok(out)
}

pub fn weak_fingers(
    conn: &Connection,
    student_id: &str,
    layout_id: &str,
    limit: i64,
) -> Result<Vec<WeakFinger>> {
    let mut stmt = conn.prepare(
        "SELECT finger, accuracy, (correct + incorrect) AS attempts FROM finger_statistics
         WHERE student_id = ?1 AND (?2 = '%' OR layout_id = ?2) AND (correct + incorrect) > 0
         ORDER BY accuracy ASC LIMIT ?3",
    )?;
    let rows = stmt.query_map(params![student_id, layout_id, limit], |r| {
        Ok(WeakFinger {
            finger: r.get(0)?,
            accuracy: r.get(1)?,
            attempts: r.get(2)?,
        })
    })?;
    let mut out = Vec::new();
    for row in rows {
        out.push(row?);
    }
    Ok(out)
}

// ---------- typing tests ----------

pub fn seed_typing_tests(conn: &Connection, tests: &[TypingTest]) -> Result<()> {
    let count: i64 = conn.query_row("SELECT COUNT(*) FROM typing_tests", [], |r| r.get(0))?;
    if count > 0 {
        return Ok(());
    }
    for t in tests {
        conn.execute(
            "INSERT INTO typing_tests (id, code, name, duration_seconds, language, layout_id, min_accuracy, min_wpm, content_version)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![t.id, t.code, t.name, t.duration_seconds, t.language, t.layout_id, t.min_accuracy, t.min_wpm, t.content_version],
        )?;
    }
    Ok(())
}

pub fn list_typing_tests(conn: &Connection) -> Result<Vec<TypingTest>> {
    let mut stmt = conn.prepare(
        "SELECT id, code, name, duration_seconds, language, layout_id, min_accuracy, min_wpm, content_version
         FROM typing_tests ORDER BY duration_seconds ASC",
    )?;
    let rows = stmt.query_map([], |r| {
        Ok(TypingTest {
            id: r.get(0)?,
            code: r.get(1)?,
            name: r.get(2)?,
            duration_seconds: r.get(3)?,
            language: r.get(4)?,
            layout_id: r.get(5)?,
            min_accuracy: r.get(6)?,
            min_wpm: r.get(7)?,
            content_version: r.get(8)?,
        })
    })?;
    let mut out = Vec::new();
    for row in rows {
        out.push(row?);
    }
    Ok(out)
}

const TEST_RESULT_COLS: &str = "id, student_id, test_id, attempt, wpm, cpm, accuracy, errors, correct_count, duration_seconds, passed, passed_accuracy, passed_wpm, scored_on, layout_id, content_version";

fn row_to_test_result(row: &rusqlite::Row<'_>) -> rusqlite::Result<TestResult> {
    Ok(TestResult {
        id: row.get("id")?,
        student_id: row.get("student_id")?,
        test_id: row.get("test_id")?,
        attempt: row.get("attempt")?,
        wpm: row.get("wpm")?,
        cpm: row.get("cpm")?,
        accuracy: row.get("accuracy")?,
        errors: row.get("errors")?,
        correct_count: row.get("correct_count")?,
        duration_seconds: row.get("duration_seconds")?,
        passed: row.get::<_, i64>("passed")? != 0,
        passed_accuracy: row.get::<_, i64>("passed_accuracy")? != 0,
        passed_wpm: row.get("passed_wpm")?,
        scored_on: row.get("scored_on")?,
        layout_id: row.get("layout_id")?,
        content_version: row.get("content_version")?,
    })
}

pub fn save_test_result(conn: &Connection, req: &SaveTestResultRequest) -> Result<TestResult> {
    require_student(conn, &req.student_id)?;
    check_positive(req.attempt, "attempt")?;
    check_not_negative_i64(req.errors, "errors")?;
    check_not_negative_i64(req.correct_count, "correctCount")?;
    check_not_negative_i64(req.duration_seconds, "durationSeconds")?;
    check_non_negative(req.wpm, "wpm")?;
    check_accuracy(req.accuracy, "accuracy")?;
    let id = new_id("tt");
    conn.execute(
        "INSERT INTO test_results (id, student_id, test_id, attempt, wpm, cpm, accuracy, errors, correct_count, duration_seconds, passed, passed_accuracy, passed_wpm, scored_on, layout_id, content_version)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)
         ON CONFLICT(student_id, test_id, attempt) DO UPDATE SET
            wpm = excluded.wpm, cpm = excluded.cpm, accuracy = excluded.accuracy,
            errors = excluded.errors, correct_count = excluded.correct_count,
            duration_seconds = excluded.duration_seconds,
            passed = MAX(passed, excluded.passed),
            passed_accuracy = MAX(passed_accuracy, excluded.passed_accuracy),
            passed_wpm = COALESCE(MAX(passed_wpm, excluded.passed_wpm), excluded.passed_wpm)",
        params![
            id, req.student_id, req.test_id, req.attempt, req.wpm, req.cpm, req.accuracy,
            req.errors, req.correct_count, req.duration_seconds,
            if req.passed { 1 } else { 0 },
            if req.passed_accuracy { 1 } else { 0 },
            req.passed_wpm.map(i64::from),
            now_millis(), req.layout_id, req.content_version
        ],
    )?;
    Ok(conn.query_row(
        &format!("SELECT {TEST_RESULT_COLS} FROM test_results WHERE id = ?1"),
        params![id],
        row_to_test_result,
    )?)
}

pub fn next_test_attempt(conn: &Connection, student_id: &str, test_id: &str) -> Result<i64> {
    let max: Option<i64> = conn
        .query_row(
            "SELECT MAX(attempt) FROM test_results WHERE student_id = ?1 AND test_id = ?2",
            params![student_id, test_id],
            |r| r.get::<_, Option<i64>>(0),
        )
        .optional()?
        .flatten();
    Ok(max.unwrap_or(0) + 1)
}

pub fn list_test_results(conn: &Connection, student_id: &str) -> Result<Vec<TestResult>> {
    let mut stmt = conn.prepare(&format!(
        "SELECT {TEST_RESULT_COLS} FROM test_results WHERE student_id = ?1 ORDER BY scored_on DESC"
    ))?;
    let rows = stmt.query_map(params![student_id], row_to_test_result)?;
    let mut out = Vec::new();
    for row in rows {
        out.push(row?);
    }
    Ok(out)
}

// ---------- daily activity / training summary ----------

/// Aggregate session stats in a given millisecond window (or all time when None).
pub fn session_stats_in_window(
    conn: &Connection,
    student_id: &str,
    since_ms: Option<i64>,
) -> Result<DailyActivityAggregate> {
    let (avg_accuracy, avg_wpm, total_minutes, sessions, best_wpm) = if let Some(since) = since_ms {
        conn.query_row(
            "SELECT
                COALESCE(AVG(accuracy), 0),
                COALESCE(AVG(wpm), 0),
                COALESCE(SUM(duration_ms) / 60000.0, 0),
                COUNT(*),
                COALESCE(MAX(wpm), 0)
             FROM typing_sessions WHERE student_id = ?1 AND status = 'completed' AND started_at >= ?2",
            params![student_id, since],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?)),
        )
        .optional()?
        .unwrap_or((0.0, 0.0, 0.0, 0, 0.0))
    } else {
        conn.query_row(
            "SELECT
                COALESCE(AVG(accuracy), 0),
                COALESCE(AVG(wpm), 0),
                COALESCE(SUM(duration_ms) / 60000.0, 0),
                COUNT(*),
                COALESCE(MAX(wpm), 0)
             FROM typing_sessions WHERE student_id = ?1 AND status = 'completed'",
            params![student_id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?)),
        )
        .optional()?
        .unwrap_or((0.0, 0.0, 0.0, 0, 0.0))
    };
    Ok(DailyActivityAggregate {
        sessions,
        total_minutes,
        avg_accuracy,
        avg_wpm,
        best_wpm,
    })
}

// ---------- settings ----------

pub fn get_settings(
    conn: &Connection,
    keys: &[String],
) -> Result<std::collections::BTreeMap<String, String>> {
    let mut out = std::collections::BTreeMap::new();
    for key in keys {
        let value: Option<String> = conn
            .query_row(
                "SELECT value FROM settings WHERE key = ?1",
                params![key],
                |r| r.get(0),
            )
            .optional()?;
        if let Some(value) = value {
            out.insert(key.clone(), value);
        }
    }
    Ok(out)
}

pub fn all_settings(conn: &Connection) -> Result<std::collections::BTreeMap<String, String>> {
    let mut stmt = conn.prepare("SELECT key, value FROM settings")?;
    let rows = stmt.query_map([], |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?)))?;
    let mut out = std::collections::BTreeMap::new();
    for row in rows {
        let (k, v) = row?;
        out.insert(k, v);
    }
    Ok(out)
}

pub fn set_setting(conn: &Connection, key: &str, value: &str) -> Result<()> {
    conn.execute(
        "INSERT INTO settings (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        params![key, value],
    )?;
    Ok(())
}

// ---------- teacher aggregates ----------

pub fn teacher_overview(conn: &Connection) -> Result<TeacherOverview> {
    let students = list_students(conn)?;
    let mut summaries = Vec::new();
    for s in students {
        summaries.push(student_summary(conn, &s)?);
    }
    let (total_minutes, avg_accuracy, avg_wpm): (f64, f64, f64) = conn.query_row(
        "SELECT
            COALESCE(SUM(duration_ms) / 60000.0, 0),
            COALESCE(AVG(accuracy), 0),
            COALESCE(AVG(wpm), 0)
         FROM typing_sessions WHERE status = 'completed'",
        [],
        |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
    )?;
    Ok(TeacherOverview {
        student_count: summaries.len() as i64,
        total_minutes,
        avg_accuracy,
        avg_wpm,
        students: summaries,
    })
}

pub fn student_summary(conn: &Connection, s: &Student) -> Result<StudentSummary> {
    let row = conn.query_row(
        "SELECT
            COALESCE((SELECT MAX(lesson_number) FROM lesson_progress WHERE student_id = ?1 AND completed = 1), 0),
            COALESCE((SELECT COUNT(*) FROM lesson_progress WHERE student_id = ?1 AND completed = 1), 0),
            COALESCE(AVG(accuracy), 0),
            COALESCE(AVG(wpm), 0),
            COALESCE(SUM(duration_ms) / 60000.0, 0),
            (SELECT COUNT(*) FROM typing_sessions WHERE student_id = ?1)
         FROM typing_sessions WHERE student_id = ?1 AND status = 'completed'",
        params![s.id],
        |r| {
            Ok((
                r.get::<_, i64>(0)?,
                r.get::<_, i64>(1)?,
                r.get::<_, f64>(2)?,
                r.get::<_, f64>(3)?,
                r.get::<_, f64>(4)?,
                r.get::<_, i64>(5)?,
            ))
        },
    )?;
    let (lesson_number, completed_lessons, accuracy, wpm, minutes, attempts) = row;
    let last_practiced_at = conn
        .query_row(
            "SELECT MAX(started_at) FROM typing_sessions WHERE student_id = ?1",
            params![s.id],
            |r| r.get::<_, Option<i64>>(0),
        )
        .optional()?
        .flatten();
    let level = conn
        .query_row(
            "SELECT level FROM lesson_progress WHERE student_id = ?1 AND completed = 1 ORDER BY lesson_number DESC LIMIT 1",
            params![s.id],
            |r| r.get::<_, String>(0),
        )
        .optional()?;
    let progress = if completed_lessons > 0 {
        (lesson_number as f64 / 20.0).min(1.0) * 100.0
    } else {
        0.0
    };
    Ok(StudentSummary {
        student: s.clone(),
        level,
        lesson_number: Some(lesson_number),
        progress,
        accuracy,
        wpm,
        total_minutes: minutes,
        last_practiced_at,
        attempts,
    })
}

pub fn student_detail(conn: &Connection, student_id: &str) -> Result<StudentDetail> {
    let student =
        get_student(conn, student_id)?.ok_or_else(|| AppError::not_found("Student not found."))?;
    let (avg_accuracy, avg_wpm, minutes, total_sessions): (f64, f64, f64, i64) = conn.query_row(
        "SELECT COALESCE(AVG(accuracy), 0), COALESCE(AVG(wpm), 0), COALESCE(SUM(duration_ms) / 60000.0, 0), COUNT(*)
         FROM typing_sessions WHERE student_id = ?1 AND status = 'completed'",
        params![student_id],
        |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?)),
    )?;
    let weak_keys = weak_keys(conn, student_id, "%", 5)?;
    let weak_fingers = weak_fingers(conn, student_id, "%", 5)?;
    let recent_sessions = list_typing_sessions(conn, student_id, 20)?;
    let test_results = list_test_results(conn, student_id)?;
    let by_level: std::collections::BTreeMap<String, i64> = conn
        .prepare(
            "SELECT level, COUNT(*) FROM lesson_progress WHERE student_id = ?1 GROUP BY level",
        )?
        .query_map(params![student_id], |r| Ok((r.get(0)?, r.get(1)?)))?
        .collect::<rusqlite::Result<Vec<_>>>()?
        .into_iter()
        .collect();
    let lesson_counts = ["beginner", "intermediate", "advanced"]
        .into_iter()
        .map(|level| LessonCount {
            level: level.to_string(),
            completed: by_level.get(level).copied().unwrap_or(0),
            total: 20,
        })
        .collect();
    Ok(StudentDetail {
        student,
        overall_accuracy: avg_accuracy,
        overall_wpm: avg_wpm,
        total_minutes: minutes,
        total_sessions,
        lesson_counts,
        weak_keys,
        weak_fingers,
        recent_sessions,
        test_results,
    })
}

// ---------- export / import ----------

pub fn load_export(conn: &Connection, student_filter: Option<&str>) -> Result<ExportFile> {
    let students = match student_filter {
        Some(id) => {
            vec![get_student(conn, id)?.ok_or_else(|| AppError::not_found("Student not found."))?]
        }
        None => list_students(conn)?,
    };
    let mut export_students = Vec::new();
    let mut all_progress = Vec::new();
    let mut all_sessions = Vec::new();
    let mut all_results = Vec::new();
    let mut all_test_results = Vec::new();

    for s in &students {
        let mut stmt = conn.prepare("SELECT student_id, lesson_id, level, lesson_number, best_wpm, best_accuracy, attempts, completions, completed, last_practiced_at, content_version FROM lesson_progress WHERE student_id = ?1")?;
        let rows = stmt.query_map(params![s.id], row_to_lesson_progress)?;
        let mut p = Vec::new();
        for row in rows {
            p.push(row?);
        }
        all_progress.extend(p.clone());

        let mut stmt = conn.prepare(&format!(
            "SELECT {TYPING_SESSION_COLS} FROM typing_sessions WHERE student_id = ?1"
        ))?;
        let rows = stmt.query_map(params![s.id], row_to_typing_session)?;
        let mut ss = Vec::new();
        for row in rows {
            ss.push(row?);
        }
        all_sessions.extend(ss.clone());

        let mut stmt = conn.prepare(&format!(
            "SELECT {EXERCISE_RESULT_COLS} FROM exercise_results WHERE student_id = ?1"
        ))?;
        let rows = stmt.query_map(params![s.id], row_to_exercise_result)?;
        let mut r = Vec::new();
        for row in rows {
            r.push(row?);
        }
        all_results.extend(r.clone());

        let mut stmt = conn.prepare(&format!(
            "SELECT {TEST_RESULT_COLS} FROM test_results WHERE student_id = ?1"
        ))?;
        let rows = stmt.query_map(params![s.id], row_to_test_result)?;
        let mut tr = Vec::new();
        for row in rows {
            tr.push(row?);
        }
        all_test_results.extend(tr.clone());

        let key_stats = list_stat_into(conn, "key_statistics", "key_id", &s.id)?;
        let finger_stats = list_stat_into(conn, "finger_statistics", "finger", &s.id)?;
        let character_stats = list_stat_into(conn, "character_statistics", "character", &s.id)?;

        export_students.push(ExportStudent {
            student: s.clone(),
            lesson_progress: p,
            exercise_results: r,
            typing_sessions: ss,
            test_results: tr,
            key_stats,
            finger_stats,
            character_stats,
        });
    }

    Ok(ExportFile {
        format: "onetype-export".into(),
        version: 1,
        exported_at: now_millis(),
        schema_version: crate::database::migrations::SCHEMA_VERSION,
        students: export_students,
        lesson_progress: all_progress,
        exercise_results: all_results,
        typing_sessions: all_sessions,
        test_results: all_test_results,
        settings: all_settings(conn)?,
    })
}

fn list_stat_into(
    conn: &Connection,
    table: &str,
    target_col: &str,
    student_id: &str,
) -> Result<Vec<KeyStatistic>> {
    let sql = format!("SELECT id, student_id, {target_col} AS key_id, layout_id, correct, incorrect, accuracy FROM {table} WHERE student_id = ?1");
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map(params![student_id], |r| {
        Ok(KeyStatistic {
            id: r.get("id")?,
            student_id: r.get("student_id")?,
            key_id: r.get("key_id")?,
            layout_id: r.get("layout_id")?,
            correct: r.get("correct")?,
            incorrect: r.get("incorrect")?,
            accuracy: r.get("accuracy")?,
        })
    })?;
    let mut out = Vec::new();
    for row in rows {
        out.push(row?);
    }
    Ok(out)
}

pub fn import_export(conn: &mut Connection, file: ExportFile) -> Result<ImportReport> {
    if !file.format.eq_ignore_ascii_case("onetype-export") {
        return Err(AppError::import_error("Not a valid OneType backup file."));
    }
    let tx = conn.transaction()?;
    let mut report = ImportReport {
        imported_students: 0,
        skipped_students: Vec::new(),
        errors: Vec::new(),
    };

    for es in file.students {
        let s = &es.student;
        if s.name.trim().is_empty() {
            report.errors.push(format!(
                "Student '{:?}' has no name; skipped.",
                es.student.id
            ));
            report.skipped_students.push(es.student.id.clone());
            continue;
        }
        let existing_id: Option<String> = tx
            .query_row(
                "SELECT id FROM students WHERE id = ?1 OR student_code = ?2",
                params![s.id, s.student_code],
                |r| r.get(0),
            )
            .optional()?;
        if existing_id.is_some() {
            report
                .skipped_students
                .push(format!("{} (duplicate)", s.id));
            continue;
        }
        tx.execute(
            "INSERT INTO students (id, student_code, name, display_name, avatar, active, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![s.id, s.student_code, s.name, s.display_name, s.avatar, i64::from(s.active), s.created_at, s.updated_at],
        )?;
        report.imported_students += 1;

        for lp in es.lesson_progress {
            if lp.lesson_id.is_empty() {
                continue;
            }
            tx.execute(
                "INSERT OR IGNORE INTO lesson_progress (id, student_id, lesson_id, level, lesson_number, best_wpm, best_accuracy, attempts, completions, completed, last_practiced_at, content_version)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
                params![new_id("lp"), s.id, lp.lesson_id, lp.level, lp.lesson_number, lp.best_wpm, lp.best_accuracy, lp.attempts, lp.completions, i64::from(lp.completed), lp.last_practiced_at, lp.content_version],
            )?;
        }
        for er in es.exercise_results {
            tx.execute(
                "INSERT OR IGNORE INTO exercise_results (id, student_id, lesson_id, exercise_id, level, lesson_number, attempt, started_at, ended_at, duration_ms, wpm, cpm, accuracy, correct_count, error_count, total_count, backspace_count, passed, layout_id, layout_version, content_version)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21)",
                params![new_id("er"), s.id, er.lesson_id, er.exercise_id, er.level, er.lesson_number, er.attempt, er.started_at, er.ended_at, er.duration_ms, er.wpm, er.cpm, er.accuracy, er.correct_count, er.error_count, er.total_count, er.backspace_count, i64::from(er.passed), er.layout_id, er.layout_version, er.content_version],
            )?;
        }
        for ses in es.typing_sessions {
            tx.execute(
                "INSERT OR IGNORE INTO typing_sessions (id, student_id, lesson_id, exercise_id, level, lesson_number, started_at, ended_at, duration_ms, target_length, completed_count, correct_count, error_count, backspace_count, wpm, cpm, accuracy, layout_id, layout_version, content_version, status)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21)",
                params![ses.id, s.id, ses.lesson_id, ses.exercise_id, ses.level, ses.lesson_number, ses.started_at, ses.ended_at, ses.duration_ms, ses.target_length, ses.completed_count, ses.correct_count, ses.error_count, ses.backspace_count, ses.wpm, ses.cpm, ses.accuracy, ses.layout_id, ses.layout_version, ses.content_version, ses.status],
            )?;
        }
        for tr in es.test_results {
            tx.execute(
                "INSERT OR IGNORE INTO test_results (id, student_id, test_id, attempt, wpm, cpm, accuracy, errors, correct_count, duration_seconds, passed, passed_accuracy, passed_wpm, scored_on, layout_id, content_version)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)",
                params![new_id("tt"), s.id, tr.test_id, tr.attempt, tr.wpm, tr.cpm, tr.accuracy, tr.errors, tr.correct_count, tr.duration_seconds, i64::from(tr.passed), i64::from(tr.passed_accuracy), tr.passed_wpm.map(i64::from), tr.scored_on, tr.layout_id, tr.content_version],
            )?;
        }
        for ks in es.key_stats {
            tx.execute(
                "INSERT OR IGNORE INTO key_statistics (id, student_id, key_id, layout_id, correct, incorrect, accuracy)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![ks.id, s.id, ks.key_id, ks.layout_id, ks.correct, ks.incorrect, ks.accuracy],
            )?;
        }
        for fs in es.finger_stats {
            tx.execute(
                "INSERT OR IGNORE INTO finger_statistics (id, student_id, finger, layout_id, correct, incorrect, accuracy)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![fs.id, s.id, fs.key_id, fs.layout_id, fs.correct, fs.incorrect, fs.accuracy],
            )?;
        }
        for cs in es.character_stats {
            tx.execute(
                "INSERT OR IGNORE INTO character_statistics (id, student_id, character, layout_id, correct, incorrect, accuracy)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![cs.id, s.id, cs.key_id, cs.layout_id, cs.correct, cs.incorrect, cs.accuracy],
            )?;
        }
    }

    for (k, v) in &file.settings {
        tx.execute(
            "INSERT OR IGNORE INTO settings (key, value) VALUES (?1, ?2)",
            params![k, v],
        )?;
    }

    tx.commit()?;
    Ok(report)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::Database;

    fn seeded_student_id(db: &Database) -> String {
        let req = crate::models::CreateStudentRequest {
            name: "Testy".into(),
            student_code: None,
            display_name: None,
        };
        create_student(db.conn(), &req).unwrap().id
    }

    fn create_student(conn: &Connection, req: &CreateStudentRequest) -> Result<Student> {
        let student = Student {
            id: new_id("stu"),
            student_code: req
                .student_code
                .clone()
                .unwrap_or_else(|| next_student_code(conn).unwrap()),
            name: req.name.clone(),
            display_name: req.display_name.clone().unwrap_or_else(|| req.name.clone()),
            avatar: None,
            active: false,
            created_at: now_millis(),
            updated_at: now_millis(),
        };
        conn.execute(
            "INSERT INTO students (id, student_code, name, display_name, avatar, active, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![student.id, student.student_code, student.name, student.display_name, student.avatar, i64::from(student.active), student.created_at, student.updated_at],
        )?;
        Ok(student)
    }

    #[test]
    fn save_typing_session_rejects_unknown_student() {
        let db = Database::open_in_memory().unwrap();
        let result = save_typing_session(
            db.conn(),
            &SaveTypingSessionRequest {
                student_id: "nope".into(),
                lesson_id: None,
                exercise_id: None,
                level: None,
                lesson_number: None,
                started_at: 0,
                ended_at: 1,
                duration_ms: 1000,
                target_length: 100,
                completed_count: 50,
                correct_count: 45,
                error_count: 5,
                backspace_count: 0,
                wpm: 20.0,
                cpm: 100.0,
                accuracy: 90.0,
                layout_id: "english-qwerty".into(),
                layout_version: 1,
                content_version: 1,
                status: "completed".into(),
            },
        );
        assert!(result.is_err());
        let err = result.err().unwrap();
        assert_eq!(err.code, "not_found");
    }

    #[test]
    fn save_exercise_result_rejects_bad_accuracy() {
        let db = Database::open_in_memory().unwrap();
        let id = seeded_student_id(&db);
        let result = save_exercise_result(
            db.conn(),
            &SaveExerciseResultRequest {
                student_id: id,
                lesson_id: "l".into(),
                exercise_id: "e".into(),
                level: "beginner".into(),
                lesson_number: 1,
                attempt: 1,
                started_at: 0,
                ended_at: 1,
                duration_ms: 1000,
                wpm: 20.0,
                cpm: 100.0,
                accuracy: 150.0,
                correct_count: 10,
                error_count: 5,
                total_count: 15,
                backspace_count: 0,
                passed: true,
                layout_id: "english-qwerty".into(),
                layout_version: 1,
                content_version: 1,
            },
        );
        assert!(result.is_err());
        assert_eq!(result.err().unwrap().code, "validation_error");
    }

    #[test]
    fn save_test_result_accepts_valid_record() {
        let db = Database::open_in_memory().unwrap();
        let id = seeded_student_id(&db);
        let result = save_test_result(
            db.conn(),
            &SaveTestResultRequest {
                student_id: id,
                test_id: "t1min".into(),
                attempt: 1,
                wpm: 30.0,
                cpm: 150.0,
                accuracy: 92.0,
                errors: 2,
                correct_count: 50,
                duration_seconds: 60,
                passed: true,
                passed_accuracy: true,
                passed_wpm: Some(true),
                layout_id: "english-qwerty".into(),
                content_version: 1,
            },
        );
        assert!(result.is_ok());
    }

    #[test]
    fn save_lesson_progress_rejects_negative_wpm() {
        let db = Database::open_in_memory().unwrap();
        let id = seeded_student_id(&db);
        let result = save_lesson_progress(
            db.conn(),
            &SaveLessonProgressRequest {
                student_id: id,
                lesson_id: "l1".into(),
                level: "beginner".into(),
                lesson_number: 1,
                wpm: -5.0,
                accuracy: 90.0,
                completed: true,
                content_version: 1,
            },
        );
        assert!(result.is_err());
        assert_eq!(result.err().unwrap().code, "validation_error");
    }
}

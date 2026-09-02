pub const SCHEMA_VERSION: i64 = 4;

pub const MIGRATIONS: &[&str] = &[
    // 1: core tables
    r#"
    CREATE TABLE IF NOT EXISTS schema_metadata (
        version INTEGER PRIMARY KEY,
        migrated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS students (
        id TEXT PRIMARY KEY,
        student_code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        display_name TEXT NOT NULL,
        avatar TEXT,
        active INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    );
    "#,
    // 2: lesson structure + progress + typing results
    r#"
    CREATE TABLE IF NOT EXISTS lesson_progress (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        lesson_id TEXT NOT NULL,
        level TEXT NOT NULL,
        lesson_number INTEGER NOT NULL,
        best_wpm REAL NOT NULL DEFAULT 0,
        best_accuracy REAL NOT NULL DEFAULT 0,
        attempts INTEGER NOT NULL DEFAULT 0,
        completions INTEGER NOT NULL DEFAULT 0,
        completed INTEGER NOT NULL DEFAULT 0,
        last_practiced_at INTEGER NOT NULL,
        content_version INTEGER NOT NULL DEFAULT 1,
        UNIQUE(student_id, lesson_id)
    );

    CREATE TABLE IF NOT EXISTS exercise_results (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        lesson_id TEXT NOT NULL,
        exercise_id TEXT NOT NULL,
        level TEXT NOT NULL,
        lesson_number INTEGER NOT NULL,
        attempt INTEGER NOT NULL,
        started_at INTEGER NOT NULL,
        ended_at INTEGER NOT NULL,
        duration_ms INTEGER NOT NULL,
        wpm REAL NOT NULL,
        cpm REAL NOT NULL,
        accuracy REAL NOT NULL,
        correct_count INTEGER NOT NULL,
        error_count INTEGER NOT NULL,
        total_count INTEGER NOT NULL,
        backspace_count INTEGER NOT NULL,
        passed INTEGER NOT NULL,
        layout_id TEXT NOT NULL,
        layout_version INTEGER NOT NULL,
        content_version INTEGER NOT NULL,
        UNIQUE(student_id, exercise_id, attempt)
    );

    CREATE TABLE IF NOT EXISTS typing_sessions (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        lesson_id TEXT,
        exercise_id TEXT,
        level TEXT,
        lesson_number INTEGER,
        started_at INTEGER NOT NULL,
        ended_at INTEGER NOT NULL,
        duration_ms INTEGER NOT NULL,
        target_length INTEGER NOT NULL,
        completed_count INTEGER NOT NULL,
        correct_count INTEGER NOT NULL,
        error_count INTEGER NOT NULL,
        backspace_count INTEGER NOT NULL,
        wpm REAL NOT NULL,
        cpm REAL NOT NULL,
        accuracy REAL NOT NULL,
        layout_id TEXT NOT NULL,
        layout_version INTEGER NOT NULL,
        content_version INTEGER NOT NULL,
        status TEXT NOT NULL
    );
    "#,
    // 3: statistics + typing tests
    r#"
    CREATE TABLE IF NOT EXISTS key_statistics (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        key_id TEXT NOT NULL,
        layout_id TEXT NOT NULL,
        correct INTEGER NOT NULL DEFAULT 0,
        incorrect INTEGER NOT NULL DEFAULT 0,
        accuracy REAL NOT NULL DEFAULT 0,
        UNIQUE(student_id, layout_id, key_id)
    );

    CREATE TABLE IF NOT EXISTS finger_statistics (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        finger TEXT NOT NULL,
        layout_id TEXT NOT NULL,
        correct INTEGER NOT NULL DEFAULT 0,
        incorrect INTEGER NOT NULL DEFAULT 0,
        accuracy REAL NOT NULL DEFAULT 0,
        UNIQUE(student_id, layout_id, finger)
    );

    CREATE TABLE IF NOT EXISTS character_statistics (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        character TEXT NOT NULL,
        layout_id TEXT NOT NULL,
        correct INTEGER NOT NULL DEFAULT 0,
        incorrect INTEGER NOT NULL DEFAULT 0,
        accuracy REAL NOT NULL DEFAULT 0,
        UNIQUE(student_id, layout_id, character)
    );

    CREATE TABLE IF NOT EXISTS typing_tests (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        duration_seconds INTEGER NOT NULL,
        language TEXT NOT NULL,
        layout_id TEXT NOT NULL,
        min_accuracy REAL NOT NULL,
        min_wpm REAL,
        content_version INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS test_results (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        test_id TEXT NOT NULL,
        attempt INTEGER NOT NULL,
        wpm REAL NOT NULL,
        cpm REAL NOT NULL,
        accuracy REAL NOT NULL,
        errors INTEGER NOT NULL,
        correct_count INTEGER NOT NULL,
        duration_seconds INTEGER NOT NULL,
        passed INTEGER NOT NULL,
        passed_accuracy INTEGER NOT NULL,
        passed_wpm INTEGER,
        scored_on INTEGER NOT NULL,
        layout_id TEXT NOT NULL,
        content_version INTEGER NOT NULL,
        UNIQUE(student_id, test_id, attempt)
    );

    CREATE INDEX IF NOT EXISTS idx_lesson_progress_student ON lesson_progress(student_id);
    CREATE INDEX IF NOT EXISTS idx_exercise_results_student ON exercise_results(student_id);
    CREATE INDEX IF NOT EXISTS idx_typing_sessions_student ON typing_sessions(student_id, started_at);
    CREATE INDEX IF NOT EXISTS idx_test_results_student ON test_results(student_id);
    CREATE INDEX IF NOT EXISTS idx_key_stats_student ON key_statistics(student_id);
    "#,
    // 4: daily activity (streaks) + achievements
    r#"
    CREATE TABLE IF NOT EXISTS daily_activity (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        activity_date TEXT NOT NULL,
        session_count INTEGER NOT NULL DEFAULT 1,
        total_duration_ms INTEGER NOT NULL DEFAULT 0,
        best_wpm REAL NOT NULL DEFAULT 0,
        accuracy_sum REAL NOT NULL DEFAULT 0,
        UNIQUE(student_id, activity_date)
    );

    CREATE INDEX IF NOT EXISTS idx_daily_activity_student_date ON daily_activity(student_id, activity_date);

    CREATE TABLE IF NOT EXISTS achievements (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        achievement_id TEXT NOT NULL,
        unlocked_at INTEGER NOT NULL,
        UNIQUE(student_id, achievement_id)
    );

    CREATE INDEX IF NOT EXISTS idx_achievements_student ON achievements(student_id);
    "#,
];

pub fn migrate(conn: &rusqlite::Connection) -> crate::error::Result<i64> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS schema_metadata (
            version INTEGER PRIMARY KEY,
            migrated_at INTEGER NOT NULL
        );",
    )?;

    let current: i64 = {
        conn.prepare("SELECT COALESCE(MAX(version), 0) FROM schema_metadata")?
            .query_row([], |row| row.get(0))?
    };

    for (index, sql) in MIGRATIONS.iter().enumerate() {
        let version = index as i64 + 1;
        if version <= current {
            continue;
        }
        let tx = conn.unchecked_transaction()?;
        tx.execute_batch(sql)?;
        tx.execute(
            "INSERT INTO schema_metadata (version, migrated_at) VALUES (?1, ?2)",
            rusqlite::params![version, crate::models::now_millis()],
        )?;
        tx.commit()?;
    }

    Ok(SCHEMA_VERSION)
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    fn in_memory() -> Connection {
        Connection::open_in_memory().expect("open memory db")
    }

    #[test]
    fn migration_creates_schema_reflects_version() {
        let conn = in_memory();
        let version = migrate(&conn).expect("migrate ok");
        assert_eq!(version, SCHEMA_VERSION);
        let stored: i64 = conn
            .query_row(
                "SELECT MAX(version) FROM schema_metadata",
                [],
                |row| row.get(0),
            )
            .expect("read version");
        assert_eq!(stored, SCHEMA_VERSION);
    }

    #[test]
    fn migration_is_idempotent() {
        let conn = in_memory();
        let a = migrate(&conn).expect("first");
        let b = migrate(&conn).expect("second");
        assert_eq!(a, SCHEMA_VERSION);
        assert_eq!(b, SCHEMA_VERSION);
        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM schema_metadata", [], |row| {
                row.get(0)
            })
            .expect("count");
        assert_eq!(count, SCHEMA_VERSION);
    }

    #[test]
    fn exercise_results_unique_per_attempt() {
        let conn = in_memory();
        migrate(&conn).expect("migrate");
        let insert = |id: &str, attempt: i64| -> rusqlite::Result<()> {
            conn.execute(
                "INSERT INTO exercise_results (
                    id, student_id, lesson_id, exercise_id, level, lesson_number, attempt,
                    started_at, ended_at, duration_ms, wpm, cpm, accuracy,
                    correct_count, error_count, total_count, backspace_count, passed,
                    layout_id, layout_version, content_version
                ) VALUES (
                    ?1, ?2, ?3, ?4, ?5, ?6, ?7,
                    ?8, ?9, ?10, ?11, ?12, ?13,
                    ?14, ?15, ?16, ?17, ?18,
                    ?19, ?20, ?21
                )",
                rusqlite::params![
                    id, "s1", "l1", "e1", "beginner", 1, attempt,
                    1, 2, 1000, 20.0, 100.0, 95.0,
                    95, 5, 100, 0, 1,
                    "english-qwerty", 1, 1
                ],
            )?;
            Ok(())
        };
        insert("r1", 1).expect("row 1");
        assert!(insert("r2", 1).is_err(), "duplicate attempt must fail");
        insert("r3", 2).expect("row 3");
    }
}
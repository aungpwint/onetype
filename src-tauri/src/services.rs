use crate::error::{AppError, Result};
use crate::models::TypingTest;
use crate::repositories as repo;
use crate::database::Database;

pub const DEFAULT_CONTENT_VERSION: i64 = 1;
pub const ENGLISH_QWERTY_LAYOUT_VERSION: i64 = 1;
pub const MYANMAR3_LAYOUT_VERSION: i64 = 1;

pub fn default_typing_tests() -> Vec<TypingTest> {
    vec![
        TypingTest {
            id: "t1min".into(),
            code: "test-1min".to_string(),
            name: "1-Minute Test".into(),
            duration_seconds: 60,
            language: "myanmar".into(),
            layout_id: "myanmar3".into(),
            min_accuracy: 85.0,
            min_wpm: Some(20.0),
            content_version: DEFAULT_CONTENT_VERSION,
        },
        TypingTest {
            id: "t3min".into(),
            code: "test-3min".to_string(),
            name: "3-Minute Test".into(),
            duration_seconds: 180,
            language: "myanmar".into(),
            layout_id: "myanmar3".into(),
            min_accuracy: 85.0,
            min_wpm: Some(25.0),
            content_version: DEFAULT_CONTENT_VERSION,
        },
        TypingTest {
            id: "t5min".into(),
            code: "test-5min".to_string(),
            name: "5-Minute Test".into(),
            duration_seconds: 300,
            language: "mixed".into(),
            layout_id: "myanmar3".into(),
            min_accuracy: 90.0,
            min_wpm: Some(30.0),
            content_version: DEFAULT_CONTENT_VERSION,
        },
        TypingTest {
            id: "t10min".into(),
            code: "test-10min".to_string(),
            name: "10-Minute Exam".into(),
            duration_seconds: 600,
            language: "mixed".into(),
            layout_id: "myanmar3".into(),
            min_accuracy: 90.0,
            min_wpm: Some(35.0),
            content_version: DEFAULT_CONTENT_VERSION,
        },
    ]
}

pub fn seed_default_data(db: &mut Database) -> Result<()> {
    repo::seed_typing_tests(db.conn(), &default_typing_tests())
}

fn validate_path(path: &str) -> Result<std::path::PathBuf> {
    if path.is_empty() || path.as_bytes().contains(&0) {
        return Err(AppError::validation("Invalid file path."));
    }
    if path.ends_with(':') || path.ends_with(":\\") {
        return Err(AppError::validation("Invalid file path: must be a file, not a drive root."));
    }
    Ok(std::path::PathBuf::from(path))
}

pub fn export_all(db: &mut Database, path: String, student_id: Option<String>) -> Result<crate::models::ExportFile> {
    let path = validate_path(&path)?;
    let data = repo::load_export(db.conn(), student_id.as_deref())?;
    let json = serde_json::to_string_pretty(&data)?;
    std::fs::write(&path, &json)?;
    Ok(data)
}

pub fn import_file(db: &mut Database, path: String) -> Result<crate::models::ImportReport> {
    let path = validate_path(&path)?;
    let raw = std::fs::read_to_string(&path).map_err(|e| {
        AppError::import_error(format!("Could not read the selected file: {e}"))
    })?;
    let parsed: serde_json::Value = serde_json::from_str(&raw).map_err(|e| {
        AppError::import_error(format!("Not valid JSON: {}", e.to_string().chars().take(120).collect::<String>()))
    })?;
    if parsed.get("format").and_then(|v| v.as_str()) != Some("onetype-export") {
        return Err(AppError::import_error(
            "This file is not an OneType backup. Expected a file created by the Export button.",
        ));
    }
    let version = parsed.get("version").and_then(|v| v.as_i64()).unwrap_or(0);
    if version < 1 || version > 1 {
        return Err(AppError::import_error(
            &format!("Unsupported backup version ({version}). This build supports version 1."),
        ));
    }
    let file: crate::models::ExportFile = serde_json::from_value(parsed).map_err(|e| {
        AppError::import_error(format!("Backup file is missing or has invalid fields: {e}"))
    })?;
    repo::import_export(db.conn_mut(), file)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::Database;
    use crate::models::CreateStudentRequest;

    #[test]
    fn seed_tests_once() {
        let mut db = Database::open_in_memory().unwrap();
        seed_default_data(&mut db).unwrap();
        seed_default_data(&mut db).unwrap();
        let tests = repo::list_typing_tests(db.conn()).unwrap();
        assert_eq!(tests.len(), 4);
    }

    #[test]
    fn roundtrip_export_import() {
        let mut db = Database::open_in_memory().unwrap();
        seed_default_data(&mut db).unwrap();
        let s = repo::create_student(
            db.conn(),
            &CreateStudentRequest { name: "Maung".into(), student_code: None, display_name: None },
        )
        .unwrap();
        repo::set_active_student(db.conn(), &s.id).unwrap();

        repo::save_lesson_progress(
            db.conn(),
            &crate::models::SaveLessonProgressRequest {
                student_id: s.id.clone(),
                lesson_id: "lesson-beginner-1".into(),
                level: "beginner".into(),
                lesson_number: 1,
                wpm: 21.0,
                accuracy: 96.0,
                completed: true,
                content_version: 1,
            },
        )
        .unwrap();

        let export = repo::load_export(db.conn(), None).unwrap();
        assert_eq!(export.students.len(), 1);
        assert_eq!(export.lesson_progress.len(), 1);

        let mut db2 = Database::open_in_memory().unwrap();
        repo::import_export(db2.conn_mut(), export).unwrap();
        let students = repo::list_students(db2.conn()).unwrap();
        assert_eq!(students.len(), 1);
        let progress = repo::list_lesson_progress(db2.conn(), &s.id).unwrap();
        assert_eq!(progress.len(), 1);
        assert!(progress[0].completed);
    }

    #[test]
    fn import_rejects_wrong_format() {
        let mut db = Database::open_in_memory().unwrap();
        let mut conn = db.conn_mut();
        let result = repo::import_export(
            &mut conn,
            crate::models::ExportFile {
                format: "other".into(),
                version: 1,
                exported_at: 0,
                schema_version: 1,
                students: vec![],
                lesson_progress: vec![],
                exercise_results: vec![],
                typing_sessions: vec![],
                test_results: vec![],
                settings: Default::default(),
            },
        );
        assert!(result.is_err());
    }
}
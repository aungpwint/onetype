mod achievements;
mod commands;
mod database;
mod error;
mod models;
mod repositories;
mod services;

use std::sync::Mutex;

use tauri::Manager;

pub use error::{AppError, Result};

fn init_database(app: &tauri::App) -> Result<database::Database> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| AppError::validation(format!("Could not resolve data directory: {e}")))?;
    let db_path = dir.join("onetype.db");
    let mut db = database::Database::open(&db_path)?;
    services::seed_default_data(&mut db)?;
    Ok(db)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let db = init_database(app)?;
            app.manage(Mutex::new(db));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::list_students,
            commands::create_student,
            commands::update_student,
            commands::delete_student,
            commands::set_active_student,
            commands::get_active_student,
            commands::save_lesson_progress,
            commands::get_lesson_progress,
            commands::list_lesson_progress,
            commands::save_typing_session,
            commands::list_typing_sessions,
            commands::save_exercise_result,
            commands::list_exercise_results,
            commands::next_exercise_attempt,
            commands::save_statistics,
            commands::weak_keys,
            commands::weak_fingers,
            commands::list_typing_tests,
            commands::save_test_result,
            commands::list_test_results,
            commands::next_test_attempt,
            commands::teacher_overview,
            commands::student_detail,
            commands::get_settings,
            commands::all_settings,
            commands::set_setting,
            commands::export_all,
            commands::import_file,
            commands::record_activity,
            commands::get_streak,
            commands::get_achievements,
            commands::stats_summary,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use crate::database::migrations::SCHEMA_VERSION;

    #[test]
    fn expected_schema_is_migrated() {
        const _: () = assert!(SCHEMA_VERSION >= 4);
    }
}
#![forbid(unsafe_code)]

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
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            #[cfg(desktop)]
            app.handle()
                .plugin(tauri_plugin_updater::Builder::new().build())?;

            let db = init_database(app)?;
            app.manage(Mutex::new(db));

            // The main window is created here (not from `tauri.conf.json`) so the
            // web inspector is bound to the build profile: enabled on debug
            // builds (`tauri dev`) and disabled on release builds. When DevTools
            // are off, the WebView disables the inspect action in its native
            // context menu and the inspector shortcuts (F12, Ctrl+Shift+I, ...).
            tauri::WebviewWindowBuilder::new(app, "main", tauri::WebviewUrl::default())
                .title("OneType — English & Myanmar Typing Tutor")
                .inner_size(1280.0, 800.0)
                .min_inner_size(960.0, 640.0)
                .center()
                .devtools(cfg!(debug_assertions))
                .build()?;

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
            commands::minutes_in_window,
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
            commands::class_leaderboard,
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
            commands::check_database_integrity,
        ])
        .run(tauri::generate_context!())
        .unwrap_or_else(|e| {
            eprintln!("Failed to start application: {e}");
            std::process::exit(1);
        });
}

#[cfg(test)]
mod tests {
    use crate::database::migrations::SCHEMA_VERSION;

    #[test]
    fn expected_schema_is_migrated() {
        const _: () = assert!(SCHEMA_VERSION >= 4);
    }
}

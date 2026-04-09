pub mod commands;
pub mod db;
pub mod error;
pub mod models;
pub mod services;
pub mod state;

use crate::state::AppState;
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    run_with_setup(|_| Ok(()))
}

pub fn run_with_setup<F>(setup: F)
where
    F: FnOnce(&mut tauri::App) -> Result<(), Box<dyn std::error::Error>> + Send + 'static,
{
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState::default())
        .setup(|app| {
            dotenvy::dotenv().ok();
            setup(app)
        })
        .invoke_handler(tauri::generate_handler![
            commands::system::validate_system_paths,
            commands::config_commands::get_runtime_config,
            commands::config_commands::save_config,
            commands::health_commands::get_backend_status,
            commands::health_commands::test_storage,
            commands::auth_commands::validate_monitor_login,
            commands::operation_commands::bootstrap_storage,
            commands::operation_commands::get_bootstrap_data,
            commands::operation_commands::start_operation,
            commands::operation_commands::finish_operation,
            commands::operation_commands::touch_operation_lock,
            commands::monitor_commands::get_monitor_snapshot,
            commands::file_commands::search_cnc_files,
            commands::file_commands::open_pdf,
        ])
        .run(tauri::generate_context!())
        .expect("erro ao iniciar aplicacao tauri");
}

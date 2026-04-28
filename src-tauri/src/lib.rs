pub mod commands;
pub mod db;
pub mod error;
pub mod models;
pub mod services;
pub mod state;

use crate::state::AppState;

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
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState)
        .setup(|app| {
            match dotenvy::dotenv() {
                Ok(path) => println!(">>> DOTENV LOADED FROM: {:?}", path),
                Err(e) => println!(">>> DOTENV ERROR: {:?}", e),
            }
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
            commands::operation_commands::touch_app_instance,
            commands::monitor_commands::get_monitor_snapshot,
            commands::monitor_commands::export_operations_xml,
            commands::monitor_commands::delete_operation,
            commands::monitor_commands::delete_operations_bulk,
            commands::file_commands::search_cnc_files,
            commands::file_commands::open_pdf,
            commands::file_commands::get_pdf_bytes,
        ])
        .run(tauri::generate_context!())
        .expect("erro ao iniciar aplicacao tauri");
}
